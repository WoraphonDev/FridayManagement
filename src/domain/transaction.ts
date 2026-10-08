import type { Database, Transaction } from './database.js';
import { OperationError, TransactionFailure } from './failure.js';

function sqlNumber(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { number?: unknown; originalError?: { info?: { number?: unknown } } };
  const value = e.number ?? e.originalError?.info?.number;
  return typeof value === 'number' ? value : undefined;
}
function timedOut(error: unknown): boolean {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'ETIMEOUT';
}
function sqliteBusy(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: unknown; errcode?: unknown };
  return (
    e.code === 'ERR_SQLITE_ERROR' &&
    typeof e.errcode === 'number' &&
    [5, 6].includes(e.errcode & 255)
  );
}
/** Work must contain DB changes/effects only; never send external notifications before commit. */
export async function runTransaction<T>(
  database: Database,
  work: (tx: Transaction) => Promise<T>,
  options: { idempotent?: boolean } = {},
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await database.transaction(work);
    } catch (error) {
      const cause = error instanceof TransactionFailure ? error.cause : error;
      const number = sqlNumber(cause);
      if (
        database.provider === 'sqlserver' &&
        number === 1205 &&
        error instanceof TransactionFailure &&
        error.outcome === 'rolled_back' &&
        options.idempotent === true &&
        attempt < 2
      )
        continue;
      if (number === 1205 || number === 1222 || timedOut(cause) || sqliteBusy(cause))
        throw new OperationError(503, 'DATABASE_BUSY', 5);
      if (error instanceof TransactionFailure && error.outcome === 'unknown')
        throw new OperationError(503, 'DATABASE_BUSY', 5);
      throw cause;
    }
  }
}
