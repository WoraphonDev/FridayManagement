import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { ApiFault } from './errors.js';
export type Schema = Record<string, unknown>;
export interface Operation {
  operationId: string;
  security: unknown[];
  parameters: { in: string; name: string; required?: boolean; schema: Schema }[];
  requestBody?: { content: Record<string, { schema: Schema }> };
  responses: Record<string, { content?: Record<string, { schema: Schema }> }>;
  'x-query-schema': Schema;
  'x-permission': string;
  'x-idempotency': string;
}
interface Runtime {
  contract: {
    paths: Record<string, Record<string, Operation>>;
    components: { schemas: Record<string, Schema> };
  };
  validator(schema: Schema): (value: unknown) => boolean;
  decodeQuery(method: string, path: string, params: URLSearchParams): Record<string, unknown>;
  validateRequest(
    method: string,
    path: string,
    body: unknown,
    current?: unknown,
  ): { valid: boolean };
}
// The locked JSON Schema validator is the single source of field rules. Zod's public
// parse boundary adds no coercion/stripping/defaults, including scalar password length.
const runtime = (await import(pathToFileURL(resolve('contracts/validate.mjs')).href)) as Runtime;
export const operations = Object.entries(runtime.contract.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, operation]) => ({
    path,
    method: method.toUpperCase(),
    operation,
    pattern: new RegExp(
      `^${path
        .split('/')
        .map((p) => (p.startsWith('{') ? '([^/]+)' : p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
        .join('/')}$`,
    ),
    parameterNames: [...path.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]!),
  })),
);
const schemas = new WeakMap<Schema, z.ZodType>();
export function parseSchema(schema: Schema, value: unknown): unknown {
  let boundary = schemas.get(schema);
  if (!boundary) {
    const validate = runtime.validator(schema);
    boundary = z.unknown().superRefine((input, ctx) => {
      if (!validate(input)) ctx.addIssue({ code: 'custom', message: 'CONTRACT_INVALID' });
    });
    schemas.set(schema, boundary);
  }
  return boundary.parse(value);
}
export function requestBody(operation: Operation, body: unknown): unknown {
  const schema = operation.requestBody?.content['application/json']?.schema;
  if (!schema) {
    if (body !== undefined) throw new ApiFault('VALIDATION_FAILED');
    return undefined;
  }
  const normalized =
    body && typeof body === 'object' && !Array.isArray(body)
      ? Object.fromEntries(
          Object.entries(body).map(([key, value]) => [
            key,
            ['title', 'name', 'display_name', 'category'].includes(key) && typeof value === 'string'
              ? value.trim()
              : value,
          ]),
        )
      : body;
  try {
    return parseSchema(schema, normalized);
  } catch {
    throw new ApiFault('VALIDATION_FAILED');
  }
}
export function queryFor(
  method: string,
  path: string,
  raw: URLSearchParams,
): Record<string, unknown> {
  try {
    const decoded = runtime.decodeQuery(method, path, raw);
    const op = operations.find((o) => o.method === method && o.path === path)!.operation;
    const rawSchema = op['x-query-schema'];
    const schema =
      typeof rawSchema.$ref === 'string'
        ? runtime.contract.components.schemas[rawSchema.$ref.split('/').at(-1)!]!
        : rawSchema;
    const properties = schema.properties as Record<string, unknown>;
    return Object.hasOwn(properties, 'page') ? { page: 1, pageSize: 50, ...decoded } : decoded;
  } catch {
    throw new ApiFault('INVALID_QUERY');
  }
}
/** Feature services call again on authoritative merged state inside their transaction. */
export function validateBusiness(
  method: string,
  path: string,
  body: unknown,
  currentTask?: unknown,
): void {
  if (!runtime.validateRequest(method, path, body, currentTask).valid)
    throw new ApiFault('VALIDATION_FAILED');
}
