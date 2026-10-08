export class OperationError extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 409 | 422 | 503,
    readonly code: string,
    readonly retryAfterSeconds?: number,
    readonly currentVersion?: number,
  ) {
    super(code);
  }
}
/** Adapter evidence, not a caller's assumption, determines whether retry is safe. */
export class TransactionFailure extends Error {
  constructor(
    readonly outcome: 'rolled_back' | 'unknown',
    cause: unknown,
  ) {
    super('TRANSACTION_FAILED', { cause });
  }
}
