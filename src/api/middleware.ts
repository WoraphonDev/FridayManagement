import { pipeline } from 'node:stream/promises';
import type { Readable } from 'node:stream';
import { timingSafeEqual } from 'node:crypto';
import express, { type Request, type RequestHandler } from 'express';
import { z } from 'zod';
import type { Transaction } from '../domain/database.js';
import { ApiFault } from './errors.js';
import {
  operations,
  parseSchema,
  requestBody,
  queryFor,
  validateBusiness,
  type Operation,
} from './contract.js';
const principalSchema = z
  .object({
    id: z.number().int().min(1).max(2147483647),
    active: z.boolean(),
    mustChangePassword: z.boolean(),
    csrf: z.string().min(32).max(128),
  })
  .strict();
const uuidSchema = { type: 'string', format: 'uuid' };
export type Principal = z.infer<typeof principalSchema>;
export interface ApiReply {
  status: number;
  body?: unknown;
  binary?: { bytes: number; name: string; open: () => Promise<Readable> };
  csv?: { name: string; open: () => Promise<Readable> };
  /** HTTP-only effect, invoked after confirmed transaction commit and schema validation. */
  afterCommit?: () => void;
}
export interface ApiContext {
  request: Request;
  method: string;
  path: string;
  operation: Operation;
  params: Record<string, number>;
  query: Record<string, unknown>;
  body: unknown;
  principal?: Principal;
  transaction?: Transaction;
  prepared?: unknown;
}
export interface ApiHooks {
  admit?: (context: ApiContext) => (() => void) | undefined;
  upload?: (context: ApiContext) => Promise<void>;
  finishUpload?: (context: ApiContext) => Promise<void>;
  origin?: string;
  session?: (request: Request) => Promise<Principal | null>;
  authorize?: (context: ApiContext) => Promise<'allowed' | 'hidden' | 'forbidden'>;
  handlers?: Record<string, (context: ApiContext) => Promise<ApiReply>>;
  prepare?: (context: ApiContext) => Promise<unknown>;
  idempotency?: (
    context: ApiContext,
    invoke: (context: ApiContext) => Promise<ApiReply>,
  ) => Promise<ApiReply>;
}
function singleHeader(request: Request, name: string): string | undefined {
  const count = request.rawHeaders.filter(
    (_v, i) => i % 2 === 0 && request.rawHeaders[i]!.toLowerCase() === name.toLowerCase(),
  ).length;
  return count === 1 ? request.get(name) : undefined;
}
function sameToken(actual: string | undefined, expected: string): boolean {
  if (!actual || actual.length > 128) return false;
  const a = Buffer.from(actual),
    b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function apiMiddleware(hooks: ApiHooks = {}): RequestHandler[] {
  const match: RequestHandler = (req, res, next) => {
    const rawPath = req.originalUrl.split('?')[0]!;
    const found = operations.find((o) => o.method === req.method && o.pattern.test(rawPath));
    if (!found) throw new ApiFault('NOT_FOUND');
    const matched = found.pattern.exec(rawPath)!;
    const params: Record<string, number> = {};
    found.parameterNames.forEach((name, i) => {
      const raw = matched[i + 1]!;
      if (!/^[1-9][0-9]*$/.test(raw) || Number(raw) > 2147483647)
        throw new ApiFault('INVALID_PATH');
      params[name] = Number(raw);
    });
    const json = !!found.operation.requestBody?.content['application/json'];
    const multipart = !!found.operation.requestBody?.content['multipart/form-data'];
    if (
      json &&
      !/^application\/json(?:\s*;\s*charset\s*=\s*(?:"utf-8"|utf-8))?$/i.test(
        singleHeader(req, 'Content-Type') ?? '',
      )
    )
      throw new ApiFault('UNSUPPORTED_MEDIA_TYPE');
    if (
      multipart &&
      !/^multipart\/form-data\s*;\s*boundary=/i.test(singleHeader(req, 'Content-Type') ?? '')
    )
      throw new ApiFault('UNSUPPORTED_MEDIA_TYPE');
    if (multipart && req.get('Content-Encoding') && req.get('Content-Encoding') !== 'identity')
      throw new ApiFault('UNSUPPORTED_MEDIA_TYPE');
    res.locals.apiContext = {
      request: req,
      method: found.method,
      path: found.path,
      operation: found.operation,
      params,
      query: {},
      body: undefined,
    } satisfies ApiContext;
    next();
  };
  const raw = express.raw({
    type: (req) => !/^multipart\/form-data/i.test(req.headers['content-type'] ?? ''),
    limit: 1048576,
    inflate: false,
  });
  const process: RequestHandler = async (req, res) => {
    const context = res.locals.apiContext as ApiContext;
    if (Buffer.isBuffer(req.body) && req.body.length) {
      try {
        context.body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(req.body));
      } catch {
        throw new ApiFault('INVALID_JSON');
      }
    }
    const write = context.method !== 'GET';
    if (write) {
      if (!hooks.origin) throw new ApiFault('SERVICE_NOT_READY');
      if (singleHeader(req, 'Origin') !== hooks.origin) throw new ApiFault('INVALID_ORIGIN');
    }
    context.query = queryFor(
      context.method,
      context.path,
      new URLSearchParams(req.originalUrl.split('?').slice(1).join('?')),
    );
    const handler = hooks.handlers?.[context.operation.operationId];
    if (!handler) throw new ApiFault('SERVICE_NOT_READY');
    if (context.operation.security.length) {
      if (!hooks.session || !hooks.authorize) throw new ApiFault('SERVICE_NOT_READY');
      const value = await hooks.session(req);
      if (!value) throw new ApiFault('UNAUTHENTICATED');
      const parsed = principalSchema.safeParse(value);
      if (!parsed.success) throw new ApiFault('INTERNAL_ERROR');
      const principal = parsed.data;
      if (!principal.active) throw new ApiFault('UNAUTHENTICATED');
      if (write && !sameToken(singleHeader(req, 'X-CSRF-Token'), principal.csrf))
        throw new ApiFault('INVALID_CSRF');
      if (
        principal.mustChangePassword &&
        !['/api/me', '/api/password', '/api/logout', '/api/session/activity'].includes(context.path)
      )
        throw new ApiFault('PASSWORD_CHANGE_REQUIRED');
      context.principal = principal;
    }
    const multipart = !!context.operation.requestBody?.content['multipart/form-data'];
    if (!multipart) context.body = requestBody(context.operation, context.body);
    if (context.principal) {
      const decision = await hooks.authorize!(context);
      if (decision !== 'allowed')
        throw new ApiFault(decision === 'hidden' ? 'NOT_FOUND' : 'FORBIDDEN');
    }
    if (context.operation['x-idempotency'] === 'required') {
      const key = singleHeader(req, 'Idempotency-Key');
      try {
        parseSchema(uuidSchema, key);
      } catch {
        throw new ApiFault('VALIDATION_FAILED');
      }
    }
    if (!multipart && !(context.method === 'PATCH' && context.path === '/api/tasks/{id}'))
      validateBusiness(context.method, context.path, context.body);
    if (multipart) {
      if (!hooks.upload) throw new ApiFault('SERVICE_NOT_READY');
      await hooks.upload(context);
    }
    if (hooks.prepare && !multipart) context.prepared = await hooks.prepare(context);
    let reply: ApiReply;
    try {
      reply =
        context.operation['x-idempotency'] === 'required'
          ? await (
              hooks.idempotency ??
              (() => {
                throw new ApiFault('SERVICE_NOT_READY');
              })
            )(context, handler)
          : await handler(context);
    } finally {
      if (multipart) await hooks.finishUpload?.(context);
    }
    const expected = context.operation.responses[String(reply.status)];
    if (!expected || reply.status < 200 || reply.status > 299) throw new ApiFault('INTERNAL_ERROR');
    if (reply.status === 204) {
      if (reply.body !== undefined) throw new ApiFault('INTERNAL_ERROR');
      reply.afterCommit?.();
      res.status(204).end();
      return;
    }
    if (reply.csv && expected.content?.['text/csv']) {
      const stream = await reply.csv.open();
      if (req.destroyed || res.destroyed) {
        stream.destroy();
        return;
      }
      res.status(reply.status).set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="friday-tasks.csv"; filename*=UTF-8''${encodeURIComponent(reply.csv.name)}`,
        'X-Content-Type-Options': 'nosniff',
      });
      await pipeline(stream, res);
      return;
    }
    if (reply.binary && expected.content?.['application/octet-stream']) {
      const stream = await reply.binary.open();
      res.status(reply.status).set({
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(reply.binary.bytes),
        'Content-Disposition': `attachment; filename="download"; filename*=UTF-8''${encodeURIComponent(reply.binary.name).replace(/['()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())}`,
        'X-Content-Type-Options': 'nosniff',
      });
      await pipeline(stream, res);
      return;
    }
    const schema = expected.content?.['application/json']?.schema;
    if (!schema) throw new ApiFault('SERVICE_NOT_READY');
    try {
      parseSchema(schema, reply.body);
    } catch {
      throw new ApiFault('INTERNAL_ERROR');
    }
    reply.afterCommit?.();
    res.status(reply.status).json(reply.body);
  };
  const admitted: RequestHandler = async (req, res, next) => {
    const release = hooks.admit?.(res.locals.apiContext as ApiContext);
    try {
      await process(req, res, next);
    } finally {
      release?.();
    }
  };
  return [match, raw, admitted];
}
