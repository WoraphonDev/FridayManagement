import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { Database, Transaction } from '../domain/database.js';
import { utcNow } from '../domain/dates.js';
import { runTransaction } from '../domain/transaction.js';
import { validUtcTimestamp } from './value-codecs.js';
import { operations, parseSchema, requestBody } from '../api/contract.js';
import { ApiFault } from '../api/errors.js';
export interface Reply {
  status: number;
  body: unknown;
}
export type AccessCheck = (
  tx: Transaction,
  state: { replay: boolean; cached?: Reply },
) => Promise<void>;
const ttlMs = 24 * 60 * 60 * 1000;
const uploadSchema = z
  .object({
    original_name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .regex(/^[^\x00-\x1f\x7f\\/]+$/)
      .refine((n) => !['.', '..'].includes(n)),
    validated_type: z.string().min(1).max(100),
    bytes: z.number().int().min(1).max(10485760),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
/** File bytes are never accepted here; the upload pipeline must validate/hash the actual stream first. */
export type UploadFingerprint = z.infer<typeof uploadSchema>;
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonicalJson).join(',')}]`;
  if (
    value &&
    typeof value === 'object' &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  )
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`,
      )
      .join(',')}}`;
  throw new ApiFault('VALIDATION_FAILED');
}
export function requestHash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}
function operationFor(method: string, concretePath: string) {
  const entry = operations.find((o) => o.method === method && o.pattern.test(concretePath));
  if (!entry || entry.operation['x-idempotency'] !== 'required')
    throw new ApiFault('VALIDATION_FAILED');
  const matches = entry.pattern.exec(concretePath)!;
  if (
    entry.parameterNames.some(
      (_name, i) => !/^[1-9][0-9]*$/.test(matches[i + 1]!) || Number(matches[i + 1]) > 2147483647,
    )
  )
    throw new ApiFault('INVALID_PATH');
  return entry;
}
function inputFor(entry: ReturnType<typeof operationFor>, input: unknown): unknown {
  if (entry.operation.requestBody?.content['multipart/form-data']) {
    const result = uploadSchema.safeParse(input);
    if (!result.success) throw new ApiFault('VALIDATION_FAILED');
    return result.data;
  }
  const body = requestBody(entry.operation, input) as Record<string, unknown>;
  const defaults: Record<string, unknown> =
    entry.path === '/api/teams' && entry.method === 'POST'
      ? { description: '' }
      : entry.path === '/api/projects/{id}/docs' && entry.method === 'POST'
        ? { body_html: '' }
        : entry.path === '/api/projects' && entry.method === 'POST'
          ? { description: '' }
          : entry.path === '/api/tasks' && entry.method === 'POST'
            ? {
                description: '',
                category: '',
                priority: 'medium',
                assignee_id: Array.isArray(body.assignee_ids)
                  ? ([...(body.assignee_ids as number[])].sort((a, b) => a - b)[0] ?? null)
                  : null,
                start_date: null,
                due_date: null,
                recurrence: 'none',
              }
            : {};
  if (entry.path === '/api/projects/{id}/groups' && entry.method === 'POST')
    defaults.color = '#579bfc';
  if (entry.path === '/api/tasks/{id}/subtasks' && entry.method === 'POST')
    defaults.assignee_id = null;
  const normalized = { ...defaults, ...body };
  if (Array.isArray(normalized.assignee_ids))
    normalized.assignee_ids = [...(normalized.assignee_ids as number[])].sort((a, b) => a - b);
  return normalized;
}
function checkedReply(entry: ReturnType<typeof operationFor>, reply: Reply): Reply {
  const schema =
    entry.operation.responses[String(reply.status)]?.content?.['application/json']?.schema;
  if (!schema || reply.status < 200 || reply.status > 299) throw new ApiFault('INTERNAL_ERROR');
  try {
    parseSchema(schema, reply.body);
  } catch {
    throw new ApiFault('INTERNAL_ERROR');
  }
  // Never persist requestId, headers, CSRF/Set-Cookie or additional fields.
  return { status: reply.status, body: JSON.parse(JSON.stringify(reply.body)) };
}
export async function executeIdempotent(
  database: Database,
  command: {
    userId: number;
    method: string;
    path: string;
    key: string;
    body: unknown;
    authorize: AccessCheck;
    mutate: (tx: Transaction, normalizedBody: unknown) => Promise<Reply>;
    clock?: () => Date;
  },
): Promise<Reply> {
  const method = command.method.toUpperCase();
  const entry = operationFor(method, command.path);
  if (!Number.isInteger(command.userId) || command.userId < 1 || command.userId > 2147483647)
    throw new ApiFault('UNAUTHENTICATED');
  try {
    parseSchema({ type: 'string', format: 'uuid' }, command.key);
  } catch {
    throw new ApiFault('VALIDATION_FAILED');
  }
  const key = command.key.toLowerCase();
  const route = `${method} ${command.path}`;
  const body = inputFor(entry, command.body);
  const hash = requestHash(body);
  return runTransaction(
    database,
    async (tx) => {
      const parameters = { user: command.userId, route, key };
      const rows = await tx.query<{
        request_hash: string;
        response_status: number;
        response_body: string;
        expires_at: string;
      }>({
        sqlite:
          'SELECT request_hash,response_status,response_body,expires_at FROM idempotency_keys WHERE user_id=$user AND route=$route AND key=$key',
        sqlserver:
          'SELECT request_hash,response_status,response_body,expires_at FROM dbo.idempotency_keys WITH (UPDLOCK,HOLDLOCK) WHERE user_id=@user AND route=@route AND [key]=@key',
        parameters,
      });
      const existing = rows[0];
      const now = utcNow(command.clock);
      if (existing && existing.expires_at > now) {
        let cached: Reply;
        try {
          cached = checkedReply(entry, {
            status: existing.response_status,
            body: JSON.parse(existing.response_body),
          });
        } catch {
          throw new ApiFault('INTERNAL_ERROR');
        }
        await command.authorize(tx, { replay: true, cached: structuredClone(cached) });
        if (existing.request_hash !== hash) throw new ApiFault('IDEMPOTENCY_CONFLICT');
        return cached;
      }
      await command.authorize(tx, { replay: false });
      if (existing)
        await tx.execute({
          sqlite: 'DELETE FROM idempotency_keys WHERE user_id=$user AND route=$route AND key=$key',
          sqlserver:
            'DELETE FROM dbo.idempotency_keys WHERE user_id=@user AND route=@route AND [key]=@key',
          parameters,
        });
      const reply = checkedReply(entry, await command.mutate(tx, body));
      // Stamp at successful transaction finalization, never at request arrival or before long work.
      const completed = utcNow(command.clock);
      const expires = new Date(Date.parse(completed) + ttlMs).toISOString();
      if (!validUtcTimestamp(expires)) throw new ApiFault('INTERNAL_ERROR');
      await tx.execute({
        sqlite:
          'INSERT INTO idempotency_keys(user_id,route,key,request_hash,response_status,response_body,created_at,expires_at) VALUES($user,$route,$key,$hash,$status,$body,$created,$expires)',
        sqlserver:
          'INSERT INTO dbo.idempotency_keys(user_id,route,[key],request_hash,response_status,response_body,created_at,expires_at) VALUES(@user,@route,@key,@hash,@status,@body,@created,@expires)',
        parameters: {
          ...parameters,
          hash,
          status: reply.status,
          body: JSON.stringify(reply.body),
          created: completed,
          expires,
        },
      });
      return reply;
    },
    { idempotent: true },
  );
}
export async function deleteExpiredIdempotency(
  database: Database,
  nowUtc: string,
  batchSize = 100,
): Promise<number> {
  if (
    !validUtcTimestamp(nowUtc) ||
    !Number.isInteger(batchSize) ||
    batchSize < 1 ||
    batchSize > 1000
  )
    throw new ApiFault('VALIDATION_FAILED');
  return runTransaction(database, async (tx) => {
    const rows = await tx.query<{ key: string }>({
      sqlite:
        'DELETE FROM idempotency_keys WHERE rowid IN (SELECT rowid FROM idempotency_keys WHERE expires_at<=$now ORDER BY expires_at,user_id,route,key LIMIT $limit) RETURNING key',
      sqlserver:
        ';WITH expired AS (SELECT TOP(@limit) * FROM dbo.idempotency_keys WITH (UPDLOCK,HOLDLOCK) WHERE expires_at<=@now ORDER BY expires_at,user_id,route,[key]) DELETE FROM expired OUTPUT DELETED.[key]',
      parameters: { now: nowUtc, limit: batchSize },
    });
    return rows.length;
  });
}
