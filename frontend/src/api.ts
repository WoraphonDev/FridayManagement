import { z } from 'zod';
import { canWrite } from './shared/connection.js';
let readFailures = 0;
export const readFailureCount = () => readFailures;
const id = z.number().int().min(1).max(2147483647);
const timestamp = z.string().datetime();
export const permissionKey = z.enum([
  'P-01',
  'P-02',
  'P-03',
  'P-04',
  'P-05',
  'P-06',
  'P-07',
  'P-08',
  'P-09',
  'P-10',
]);
export type PermissionKey = z.infer<typeof permissionKey>;
export const selfSchema = z
  .object({
    user: z
      .object({
        id,
        username: z
          .string()
          .min(1)
          .max(60)
          .regex(/^[A-Za-z0-9._-]+$/),
        display_name: z.string().min(1).max(100),
        org_role: z.enum(['admin', 'member']),
        active: z.boolean(),
        must_change_password: z.boolean(),
        version: id,
        created_at: timestamp,
        updated_at: timestamp,
        job_title_id: id.nullable(),
        job_title: z.string().min(1).max(50).nullable(),
        permission_keys: z.array(permissionKey).max(10),
        permissions_version: id,
      })
      .strict(),
    csrf: z.string().min(32).max(128),
    effective_summary: z
      .object({ lead_team_ids: z.array(id).max(10000), project_ids: z.array(id).max(10000) })
      .strict(),
    must_change_password: z.boolean(),
    maintenance: z.boolean(),
    view_revision: z.string().uuid(),
    bangkok_today: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/),
  })
  .strict();
export const userPageSchema = z
  .object({
    items: z.array(selfSchema.shape.user).max(100),
    page: id,
    pageSize: z.number().int().min(1).max(100),
    total: z.number().int().min(0),
  })
  .strict();
export type AdminUser = z.infer<typeof selfSchema.shape.user>;
export type Self = z.infer<typeof selfSchema>;
export const metaSchema = z
  .object({ setupRequired: z.boolean(), version: z.string().min(1).max(60) })
  .strict();
export const setupReplySchema = z.object({ item: selfSchema.shape.user }).strict();
export type FailureKind =
  | 'session'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'offline'
  | 'unavailable'
  | 'invalid'
  | 'request';
const messages: Record<FailureKind, string> = {
  session: "Session expired. Sign in again.",
  forbidden: "You do not have permission for this action",
  'not-found': "Data not found or access denied",
  conflict: "Data changed. Review the latest version before saving again.",
  offline: "Connect to continue",
  unavailable: "Service unavailable. Try again later.",
  invalid: "Invalid server response. Try again.",
  request: "Unable to complete the action. Check your data and retry.",
};
export class ApiError extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly status: number,
    readonly requestId?: string,
    readonly fieldErrors: Record<string, string> = {},
    readonly code?: string,
    readonly retryAfter?: number,
    readonly currentVersion?: number,
  ) {
    super(messages[kind]);
  }
}
const errorShape = z
  .object({
    error: z
      .object({
        requestId: z.string().uuid().optional(),
        code: z
          .string()
          .regex(/^[A-Z_]+$/)
          .max(60)
          .optional(),
        currentVersion: id.optional(),
        fieldErrors: z.record(z.string(), z.array(z.string().max(500))).optional(),
      })
      .passthrough(),
  })
  .passthrough();
export function apiClient(
  fetcher: typeof fetch = fetch,
  online: () => boolean = () => typeof navigator === 'undefined' || navigator.onLine !== false,
) {
  return {
    async request<T>(
      path: string,
      options: {
        method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
        body?: unknown;
        csrf?: string;
        key?: string;
        signal?: AbortSignal;
        binary?: boolean;
        csv?: boolean;
        parse: (value: unknown) => T;
      },
    ): Promise<T> {
      const url = new URL(path, 'http://friday.local');
      if (
        !path.startsWith('/api/') ||
        url.origin !== 'http://friday.local' ||
        !(
          /^\/api\/[A-Za-z0-9/_-]+$/.test(url.pathname) || url.pathname === '/api/export/tasks.csv'
        ) ||
        url.hash
      )
        throw new ApiError('request', 0);
      if (!online()) throw new ApiError('offline', 0);
      const method = options.method ?? 'GET';
      if (method !== 'GET' && !canWrite()) throw new ApiError('unavailable', 0);
      if (method !== 'GET' && !['/api/login', '/api/setup'].includes(url.pathname) && !options.csrf)
        throw new ApiError('forbidden', 403);
      const headers: Record<string, string> = {
        Accept: options.csv ? 'text/csv' : 'application/json',
      };
      if (options.body !== undefined && !(options.body instanceof FormData))
        headers['Content-Type'] = 'application/json';
      if (options.csrf) headers['X-CSRF-Token'] = options.csrf;
      if (options.key) headers['Idempotency-Key'] = options.key;
      let response: Response;
      try {
        response = await fetcher(path, {
          method,
          headers,
          credentials: 'same-origin',
          cache: 'no-store',
          ...(options.signal ? { signal: options.signal } : {}),
          ...(options.body === undefined
            ? {}
            : {
                body:
                  options.body instanceof FormData ? options.body : JSON.stringify(options.body),
              }),
        });
      } catch (error) {
        if (method === 'GET') readFailures++;
        if (error instanceof Error && error.name === 'AbortError') throw error;
        throw new ApiError('offline', 0);
      }
      if (!response.ok) {
        if (method === 'GET' && response.status !== 401) readFailures++;
        let detail: z.infer<typeof errorShape> | undefined;
        try {
          detail = errorShape.parse(await response.json());
        } catch {
          /* never display raw response or server stack */
        }
        const kind: FailureKind =
          response.status === 401
            ? 'session'
            : response.status === 403
              ? 'forbidden'
              : response.status === 404
                ? 'not-found'
                : response.status === 409
                  ? 'conflict'
                  : response.status === 503
                    ? 'unavailable'
                    : 'request';
        throw new ApiError(
          kind,
          response.status,
          detail?.error.requestId,
          Object.fromEntries(
            Object.entries(detail?.error.fieldErrors ?? {}).map(([key, messages]) => [
              key,
              messages[0] ?? '',
            ]),
          ),
          detail?.error.code,
          Number(response.headers.get('Retry-After')) || undefined,
          detail?.error.currentVersion,
        );
      }
      try {
        if (response.status === 204) return options.parse(undefined);
        if (options.csv) {
          if (!response.headers.get('Content-Type')?.startsWith('text/csv'))
            throw new Error('type');
          return options.parse(await response.blob());
        }
        if (options.binary) {
          if (!response.headers.get('Content-Type')?.startsWith('application/octet-stream'))
            throw new Error('type');
          return options.parse(await response.blob());
        }
        return options.parse(await response.json());
      } catch {
        if (method === 'GET') readFailures++;
        throw new ApiError('invalid', response.status);
      }
    },
  };
}
