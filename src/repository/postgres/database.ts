import pg from 'pg';
import { TransactionFailure } from '../../domain/failure.js';
import type { Database, Row, Statement, Transaction } from '../../domain/database.js';
import { toPostgres } from './translate.js';

// BIGINT (COUNT, SUM, bytes) arrives as text; decode safe integers like the other providers.
pg.types.setTypeParser(pg.types.builtins.INT8, (value) => {
  const decoded = Number(value);
  if (!Number.isSafeInteger(decoded)) throw new Error('DATABASE_VALUE_INVALID');
  return decoded;
});
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => {
  const decoded = Number(value);
  if (!Number.isSafeInteger(decoded)) throw new Error('DATABASE_VALUE_INVALID');
  return decoded;
});

/** Key for pg_advisory_xact_lock shared by every FridayManagement transaction. */
const applicationLock = 0x46524944; // 'FRID'

/** Explicit ids (fixtures, single-row tables) must not collide with later generated ids. */
const explicitId = /^\s*INSERT INTO\s+"?([a-z_]+)"?\s*\(\s*"?id"?\s*,/i;

/**
 * PostgreSQL provider. An application-wide advisory lock serializes transactions like SQLite;
 * any deadlock or serialization failure is reported like a SQL Server deadlock (1205) so
 * runTransaction returns DATABASE_BUSY or retries it.
 */
export class PostgresDatabase implements Database {
  readonly provider = 'postgres';
  constructor(
    private readonly pool: pg.Pool,
    private readonly lockTimeoutMs = 5000,
  ) {}

  async transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    let committing = false;
    let rolledBack = false;
    const run = async (statement: Statement) => {
      const { text, values } = toPostgres(statement);
      // Parameterless text may hold several statements (migrations); that needs the simple protocol.
      const result = values.length ? await client.query(text, values) : await client.query(text);
      const table = explicitId.exec(text)?.[1];
      if (table) {
        const sequence = (
          await client.query<{ seq: string | null }>(
            "SELECT pg_get_serial_sequence($1,'id') AS seq",
            [table],
          )
        ).rows[0]?.seq;
        if (sequence)
          await client.query(`SELECT setval($1, GREATEST((SELECT MAX(id) FROM "${table}"), 1))`, [
            sequence,
          ]);
      }
      // A multi-statement text yields one result per statement; callers read the last.
      return Array.isArray(result) ? (result.at(-1) as pg.QueryResult) : result;
    };
    const transaction: Transaction = {
      execute: async (statement) => {
        await run(statement);
      },
      query: async <R extends Row>(statement: Statement) => (await run(statement)).rows as R[],
    };
    try {
      // One application-wide transaction lock reproduces SQLite's BEGIN IMMEDIATE: transactions
      // run one at a time, so concurrent commands wait instead of failing. READ COMMITTED (not
      // SERIALIZABLE, whose snapshot would predate the lock) lets every statement after the lock
      // see the previous transaction's commit. Waiting is bounded by lock_timeout (→ 1222).
      await client.query(
        `BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL lock_timeout = ${this.lockTimeoutMs}; SELECT pg_advisory_xact_lock(${applicationLock})`,
      );
      const result = await work(transaction);
      committing = true;
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
        rolledBack = true;
      } catch {
        // An uncertain outcome must never be treated as a confirmed rollback.
      }
      const code = (error as { code?: unknown })?.code;
      const driverError = typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code);
      // Match SQLite: a business error with a confirmed rollback propagates unchanged.
      if (!committing && rolledBack && !driverError) throw error;
      const mapped =
        code === '40001' || code === '40P01'
          ? Object.assign(error as object, { number: 1205 })
          : code === '55P03'
            ? Object.assign(error as object, { number: 1222 })
            : error;
      throw new TransactionFailure(!committing && rolledBack ? 'rolled_back' : 'unknown', mapped);
    } finally {
      client.release();
    }
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}
