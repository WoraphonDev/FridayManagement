import type { ErrorRequestHandler, Response } from 'express';
import { OperationError } from '../domain/failure.js';
const codes = {
  INVALID_JSON: 400,
  INVALID_QUERY: 400,
  INVALID_PATH: 400,
  UNAUTHENTICATED: 401,
  INVALID_CREDENTIALS: 401,
  FORBIDDEN: 403,
  INVALID_ORIGIN: 403,
  INVALID_CSRF: 403,
  INVALID_SETUP_TOKEN: 403,
  PASSWORD_CHANGE_REQUIRED: 403,
  NOT_FOUND: 404,
  VERSION_CONFLICT: 409,
  IDEMPOTENCY_CONFLICT: 409,
  SETUP_ALREADY_COMPLETED: 409,
  PAYLOAD_TOO_LARGE: 413,
  FILE_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  VALIDATION_FAILED: 422,
  SUBTASKS_INCOMPLETE: 422,
  PARENT_DONE: 422,
  PROJECT_ARCHIVED: 422,
  TEAM_ARCHIVED: 422,
  TEAM_HAS_ACTIVE_PROJECTS: 422,
  LAST_ACTIVE_ADMIN: 422,
  ASSIGNEE_INELIGIBLE: 422,
  RETENTION_EXPIRED: 422,
  QUOTA_EXCEEDED: 422,
  INVALID_FILE_TYPE: 422,
  INVALID_ANCHOR: 422,
  BOARD_LIMIT_EXCEEDED: 422,
  EXPORT_LIMIT_EXCEEDED: 422,
  RATE_LIMITED: 429,
  DATABASE_BUSY: 503,
  SERVICE_NOT_READY: 503,
  MAINTENANCE: 503,
  INTERNAL_ERROR: 500,
} as const;
export type ErrorCode = keyof typeof codes;
export class ApiFault extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly currentVersion?: number,
    readonly retryAfter?: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(code);
  }
}
export type SafeLog = (event: { requestId: string; code: ErrorCode }) => void;
export function sendError(
  response: Response,
  code: ErrorCode,
  currentVersion?: number,
  retryAfter?: number,
  fieldErrors: Record<string, string[]> = {},
) {
  if (
    code === 'VERSION_CONFLICT' &&
    (!Number.isInteger(currentVersion) || currentVersion! < 1 || currentVersion! > 2147483647)
  )
    code = 'INTERNAL_ERROR';
  const status = codes[code];
  const message =
    status === 500
      ? 'Something went wrong. Contact your administrator with the reference ID.'
      : status === 503
        ? 'The service is not ready. Please try again.'
        : status === 401
          ? 'Please sign in again.'
          : status === 404
            ? 'The requested item was not found.'
            : status === 409
              ? 'This item changed. Reload and try again.'
              : status === 403
                ? 'You are not allowed to do this.'
                : 'The request is invalid. Check the details and try again.';
  if (status === 503 || status === 429)
    response.set(
      'Retry-After',
      String(Number.isSafeInteger(retryAfter) && retryAfter! > 0 ? retryAfter : 5),
    );
  response.status(status).json({
    error: {
      code,
      message,
      fieldErrors,
      requestId: response.get('X-Request-Id'),
      ...(code === 'VERSION_CONFLICT' ? { currentVersion } : {}),
    },
  });
}
export function errorHandler(
  log: SafeLog = (event) => console.error(JSON.stringify(event)),
  clearUnauthenticated?: (response: Response) => void,
): ErrorRequestHandler {
  return (error: unknown, _request, response, _next) => {
    void _next; // Four arguments identify Express error middleware.
    if (response.headersSent) {
      try {
        log({ requestId: response.get('X-Request-Id')!, code: 'INTERNAL_ERROR' });
      } catch {
        /* no raw stream error */
      }
      response.destroy();
      return;
    }
    let fault = new ApiFault('INTERNAL_ERROR');
    if (error instanceof ApiFault && Object.hasOwn(codes, error.code)) fault = error;
    else if (
      error instanceof OperationError &&
      Object.hasOwn(codes, error.code) &&
      codes[error.code as ErrorCode] === error.status
    )
      fault = new ApiFault(error.code as ErrorCode, error.currentVersion, error.retryAfterSeconds);
    else if (error && typeof error === 'object' && 'type' in error) {
      if (error.type === 'entity.too.large') fault = new ApiFault('PAYLOAD_TOO_LARGE');
      else if (error.type === 'encoding.unsupported' || error.type === 'charset.unsupported')
        fault = new ApiFault('UNSUPPORTED_MEDIA_TYPE');
      else if (error.type === 'request.aborted' || error.type === 'request.size.invalid')
        fault = new ApiFault('INVALID_JSON');
    }
    if (fault.code === 'INTERNAL_ERROR') {
      try {
        log({ requestId: response.get('X-Request-Id')!, code: fault.code });
      } catch {
        /* Logging failure must not expose the original error. */
      }
    }
    if (fault.code === 'UNAUTHENTICATED') clearUnauthenticated?.(response);
    sendError(response, fault.code, fault.currentVersion, fault.retryAfter, fault.fieldErrors);
  };
}
