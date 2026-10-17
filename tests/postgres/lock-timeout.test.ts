import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { migrate } from '../../src/repository/migrate.js';
import { runTransaction } from '../../src/domain/transaction.js';
import { OperationError } from '../../src/domain/failure.js';
import { sql } from '../../src/repository/access-scope.js';
import { seed } from '../schema/fixtures.js';
// TC-082 / RV-12 on real PostgreSQL 17: a row lock held past DB_LOCK_TIMEOUT_MS yields
// DATABASE_BUSY 503 with Retry-After, the whole transaction rolls back, and the same command
// succeeds exactly once after the lock is released.
const skip =
  process.env.RUN_POSTGRES_TESTS === '1' &&
  process.env.DB_PROVIDER === 'postgres' &&
  /_test$/.test(process.env.DB_NAME ?? '')
    ? false
    : 'NOT_RUN: isolated PostgreSQL test database required';
test(
  'PostgreSQL 17: TC-082 lock timeout returns DATABASE_BUSY without partial commit; retry succeeds once',
  { skip },
  async () => {
    const pg = (await import('pg')).default;
    const { PostgresDatabase } = await import('../../src/repository/postgres/database.js');
    const schema = `friday_t_${randomUUID().replaceAll('-', '')}`;
    const connection = {
      host: process.env.DB_SERVER,
      port: Number(process.env.DB_PORT ?? 5432),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
    const admin = new pg.Pool({ ...connection, max: 1 });
    await admin.query(`CREATE SCHEMA "${schema}"`);
    const pool = () =>
      new pg.Pool({ ...connection, max: 3, options: `-c search_path="${schema}"` });
    const db = new PostgresDatabase(pool(), 300);
    const holderPool = pool();
    const holder = await holderPool.connect();
    try {
      await migrate(db);
      await db.transaction(seed);
      // Another writer holds the task row lock (uncommitted), longer than lock_timeout.
      await holder.query('BEGIN');
      await holder.query(`UPDATE tasks SET title='held by other writer' WHERE id=1`);
      const command = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) =>
        (async () => {
          await tx.execute(
            sql("UPDATE dbo.organizations SET name='renamed in same command' WHERE id=1"),
          );
          await tx.execute(sql("UPDATE dbo.tasks SET title='changed by command' WHERE id=1"));
        })();
      const started = Date.now();
      await assert.rejects(runTransaction(db, command, { idempotent: true }), (e: unknown) => {
        assert(e instanceof OperationError);
        assert.equal(e.status, 503);
        assert.equal(e.code, 'DATABASE_BUSY');
        assert.equal(e.retryAfterSeconds, 5);
        return true;
      });
      assert(Date.now() - started < 5000, 'bounded by lock_timeout, not hung');
      // No partial commit: the earlier statement in the same transaction was rolled back.
      const org = await db.transaction((tx) =>
        tx.query<{ name: string }>(sql('SELECT name FROM dbo.organizations WHERE id=1')),
      );
      assert.equal(org[0]!.name, 'องค์กรทดสอบ');
      await holder.query('ROLLBACK');
      await runTransaction(db, command, { idempotent: true });
      const after = await db.transaction((tx) =>
        tx.query<{ title: string; name: string }>(
          sql(
            'SELECT t.title,o.name FROM dbo.tasks t, dbo.organizations o WHERE t.id=1 AND o.id=1',
          ),
        ),
      );
      assert.deepEqual(after[0], { title: 'changed by command', name: 'renamed in same command' });
    } finally {
      holder.release();
      await holderPool.end();
      await db.close();
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    }
  },
);
