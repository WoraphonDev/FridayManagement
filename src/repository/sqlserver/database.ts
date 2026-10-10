import sql from 'mssql';
import { TransactionFailure } from '../../domain/failure.js';
import { normalizeSqlRow } from '../value-codecs.js';
import type { Database, Row, Statement, Transaction } from '../../domain/database.js';

export class SqlServerDatabase implements Database {
  readonly provider = 'sqlserver';
  constructor(
    private readonly pool: sql.ConnectionPool,
    private readonly lockTimeoutMs = 5000,
  ) {
    if (!Number.isSafeInteger(lockTimeoutMs) || lockTimeoutMs < 1 || lockTimeoutMs > 2147483647)
      throw new Error('INVALID_LOCK_TIMEOUT');
  }

  async transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    const dbTransaction = new sql.Transaction(this.pool);
    let rolledBack = false;
    dbTransaction.on('rollback', () => {
      rolledBack = true;
    });
    await dbTransaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    const request = (statement: Statement) => {
      const query = new sql.Request(dbTransaction);
      for (const [name, value] of Object.entries(statement.parameters ?? {})) {
        query.input(name, typeof value === 'number' ? sql.BigInt : sql.NVarChar(sql.MAX), value);
      }
      return query;
    };
    const transaction: Transaction = {
      execute: async (statement) => {
        await request(statement).query(statement.sqlserver);
      },
      query: async <R extends Row>(statement: Statement) => {
        const result = await request(statement).query<R>(statement.sqlserver);
        const dateColumns = new Set(
          Object.entries(result.recordset.columns)
            .filter(([, column]) => column.type === sql.Date)
            .map(([name]) => name),
        );
        // Tedious returns BIGINT as string; decode only safe integers so comparisons stay numeric.
        const bigintColumns = Object.entries(result.recordset.columns)
          .filter(([, column]) => column.type === sql.BigInt)
          .map(([name]) => name);
        return result.recordset.map((source) => {
          const row: Record<string, unknown> = { ...source };
          for (const name of bigintColumns) {
            if (typeof row[name] !== 'string') continue;
            const decoded = Number(row[name]);
            if (!Number.isSafeInteger(decoded)) throw new Error('DATABASE_VALUE_INVALID');
            row[name] = decoded;
          }
          return normalizeSqlRow(row, dateColumns) as R;
        });
      },
    };
    let committing = false;
    try {
      await new sql.Request(dbTransaction).batch(
        `SET XACT_ABORT ON; SET LOCK_TIMEOUT ${this.lockTimeoutMs};`,
      );
      const result = await work(transaction);
      committing = true;
      await dbTransaction.commit();
      return result;
    } catch (error) {
      if (!rolledBack) {
        try {
          await dbTransaction.rollback();
          rolledBack = true;
        } catch {
          // An uncertain outcome must never be treated as a confirmed rollback.
        }
      }
      // Match SQLite: a business error with a confirmed rollback propagates unchanged; driver
      // errors stay wrapped so runTransaction can classify deadlock/timeout outcomes.
      const driverError =
        error instanceof sql.MSSQLError ||
        typeof (error as { number?: unknown })?.number === 'number';
      if (!committing && rolledBack && !driverError) throw error;
      throw new TransactionFailure(!committing && rolledBack ? 'rolled_back' : 'unknown', error);
    }
  }
  async close(): Promise<void> {
    await this.pool.close();
  }
}
