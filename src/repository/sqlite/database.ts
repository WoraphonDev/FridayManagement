import { DatabaseSync } from 'node:sqlite';
import { TransactionFailure } from '../../domain/failure.js';
import {
  validDate,
  validUtcTimestamp,
  validUuid,
  localCaseInsensitiveKey,
} from '../value-codecs.js';
import type { Database, Row, Statement, Transaction } from '../../domain/database.js';

export class SqliteDatabase implements Database {
  readonly provider = 'sqlite';
  private readonly connection: DatabaseSync;
  private tail: Promise<unknown> = Promise.resolve();
  private closed = false;

  constructor(path: string) {
    this.connection = new DatabaseSync(path);
    this.connection.function('friday_utf16_units', { deterministic: true }, (value) =>
      typeof value === 'string' ? value.length : null,
    );
    this.connection.function('friday_valid_date', { deterministic: true }, (value) =>
      Number(validDate(value)),
    );
    this.connection.function('friday_valid_utc', { deterministic: true }, (value) =>
      Number(validUtcTimestamp(value)),
    );
    this.connection.function('friday_valid_uuid', { deterministic: true }, (value) =>
      Number(validUuid(value)),
    );
    this.connection.function('friday_ci_key', { deterministic: true }, (value) =>
      typeof value === 'string' ? localCaseInsensitiveKey(value) : null,
    );
    this.connection.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  }

  transaction<T>(work: (transaction: Transaction) => Promise<T>): Promise<T> {
    if (this.closed) return Promise.reject(new Error('DATABASE_CLOSED'));
    const job = this.tail.then(async () => {
      this.connection.exec('BEGIN IMMEDIATE');
      const transaction: Transaction = {
        execute: async (statement: Statement) => {
          if (Object.keys(statement.parameters ?? {}).length) {
            this.connection.prepare(statement.sqlite).run(statement.parameters ?? {});
          } else {
            this.connection.exec(statement.sqlite);
          }
        },
        query: async <R extends Row>(statement: Statement) =>
          (this.connection.prepare(statement.sqlite).all(statement.parameters ?? {}) as Row[]).map(
            (row) => ({ ...row }) as R,
          ),
      };
      try {
        const result = await work(transaction);
        this.connection.exec('COMMIT');
        return result;
      } catch (error) {
        try {
          this.connection.exec('ROLLBACK');
        } catch {
          throw new TransactionFailure('unknown', error);
        }
        throw error;
      }
    });
    this.tail = job.catch(() => undefined);
    return job;
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.tail;
    this.connection.close();
  }
}
