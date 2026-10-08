import type { Database } from '../domain/database.js';
import { utcNow } from '../domain/dates.js';
import { deleteExpiredIdempotency } from '../repository/idempotency.js';
/** Scheduler invokes one bounded batch per tick; no timers or jobs start by importing this module. */
export function idempotencyCleanupJob(database: Database, clock: () => Date = () => new Date()) {
  return { run: () => deleteExpiredIdempotency(database, utcNow(clock)) };
}
