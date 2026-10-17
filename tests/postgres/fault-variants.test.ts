import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Database, Transaction } from '../../src/domain/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { executeIdempotent } from '../../src/repository/idempotency.js';
import { OperationError, TransactionFailure } from '../../src/domain/failure.js';
import { ApiFault } from '../../src/api/errors.js';
import { seed, statement as s } from '../schema/fixtures.js';
import { command, counts } from '../idempotency/provider-suite.js';
// RV-12–RV-15 on real PostgreSQL 17 (ADR-0001): lock timeout, deadlock victim, connection loss
// before commit, statement timeout and committed-but-acknowledgement-lost. Each command is the
// idempotent comment fixture (comment + task event + notification + idempotency key rows), so
// counts() = [comments, events, notifications, keys] shows partial state or duplicates.
const skip =
  process.env.RUN_POSTGRES_TESTS === '1' &&
  process.env.DB_PROVIDER === 'postgres' &&
  /_test$/.test(process.env.DB_NAME ?? '')
    ? false
    : 'NOT_RUN: isolated PostgreSQL test database required';
const applicationLock = 0x46524944; // same advisory key as src/repository/postgres/database.ts
const busy = (e: unknown) =>
  e instanceof OperationError &&
  e.status === 503 &&
  e.code === 'DATABASE_BUSY' &&
  e.retryAfterSeconds === 5;

async function fixture(options: { lockTimeoutMs?: number; statementTimeoutMs?: number } = {}) {
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
  const admin = new pg.Pool({ ...connection, max: 2 });
  await admin.query(`CREATE SCHEMA "${schema}"`);
  const pool = (extra: Record<string, unknown> = {}) =>
    new pg.Pool({ ...connection, max: 4, options: `-c search_path="${schema}"`, ...extra });
  const db = new PostgresDatabase(
    pool(options.statementTimeoutMs ? { statement_timeout: options.statementTimeoutMs } : {}),
    options.lockTimeoutMs ?? 5000,
  );
  const setupDb = new PostgresDatabase(pool());
  await migrate(setupDb);
  await setupDb.transaction(seed);
  const sidePool = pool();
  return {
    db,
    // Authoritative reads always use a fresh connection, never the faulted one.
    fresh: setupDb,
    side: () => sidePool.connect(),
    close: async () => {
      await db.close().catch(() => {});
      await setupDb.close();
      await sidePool.end();
      await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      await admin.end();
    },
  };
}
/** Delegating database that records each attempt and can inject behaviour around it. */
function instrument(
  inner: Database,
  around: (attempt: number, run: () => Promise<unknown>) => Promise<unknown> = (_a, run) => run(),
) {
  const attempts: string[] = [];
  const db: Database = {
    provider: inner.provider,
    transaction: async <T>(work: (tx: Transaction) => Promise<T>) => {
      const attempt = attempts.length + 1;
      try {
        const result = (await around(attempt, () => inner.transaction(work))) as T;
        attempts.push('committed');
        return result;
      } catch (error) {
        const cause = error instanceof TransactionFailure ? error.cause : error;
        attempts.push(
          `${error instanceof TransactionFailure ? error.outcome : 'error'}:${(cause as { code?: string })?.code ?? '?'}`,
        );
        throw error;
      }
    },
    close: () => inner.close(),
  } as Database;
  return { db, attempts };
}

test(
  'PostgreSQL 17: RV-12 lock held past lock_timeout → 503 Retry-After, no partial rows; same key succeeds once',
  { skip },
  async () => {
    const f = await fixture({ lockTimeoutMs: 300 });
    const holder = await f.side();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM tasks WHERE id=1 FOR UPDATE'); // blocks the comment FK check
      const c = command();
      const started = Date.now();
      await assert.rejects(executeIdempotent(f.db, c), busy);
      const elapsed = Date.now() - started;
      assert(elapsed >= 250 && elapsed < 3000, `bounded wait ${elapsed}ms`);
      assert.deepEqual(await counts(f.fresh), [0, 0, 0, 0]);
      await holder.query('ROLLBACK');
      const first = await executeIdempotent(f.db, c);
      assert.deepEqual(await executeIdempotent(f.db, c), first);
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
    } finally {
      holder.release();
      await f.close();
    }
  },
);

test(
  'PostgreSQL 17: RV-13 deadlock victim retries to one outcome; repeated victims exhaust to 503 without partial rows',
  { skip },
  async () => {
    const f = await fixture();
    try {
      // One deadlocker per attempt: it locks the task row, then (while the command waits on that
      // row) requests the command's advisory lock. The command waited first, so it is the victim.
      const deadlockers: Promise<void>[] = [];
      const deadlock = async () => {
        const e = await f.side();
        await e.query('BEGIN');
        await e.query("SET LOCAL deadlock_timeout = '10s'");
        await e.query('SELECT id FROM tasks WHERE id=1 FOR UPDATE');
        deadlockers.push(
          (async () => {
            await new Promise((r) => setTimeout(r, 200));
            await e.query(`SELECT pg_advisory_xact_lock(${applicationLock})`);
            await e.query('ROLLBACK');
            e.release();
          })(),
        );
      };
      // Single victim: deadlock only the first attempt; the bounded retry then commits once.
      const once = instrument(f.db, async (attempt, run) => {
        if (attempt === 1) await deadlock();
        return run();
      });
      const c = command();
      const reply = await executeIdempotent(once.db, c);
      await Promise.all(deadlockers.splice(0));
      assert.deepEqual(once.attempts, ['rolled_back:40P01', 'committed']);
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
      assert.deepEqual(await executeIdempotent(f.db, c), reply);
      // Repeated victims: every attempt deadlocks; bounded retry (3 attempts) ends in 503.
      const always = instrument(f.db, async (_attempt, run) => {
        await deadlock();
        return run();
      });
      await assert.rejects(executeIdempotent(always.db, command()), busy);
      await Promise.all(deadlockers.splice(0));
      assert.deepEqual(always.attempts, [
        'rolled_back:40P01',
        'rolled_back:40P01',
        'rolled_back:40P01',
      ]);
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
    } finally {
      await f.close();
    }
  },
);

test(
  'PostgreSQL 17: RV-14 connection killed after writes before commit → 503, nothing committed; same key retry never duplicates',
  { skip },
  async () => {
    const f = await fixture();
    const killer = await f.side();
    try {
      const c = command();
      const killing = {
        ...c,
        mutate: async (tx: Transaction, input: unknown) => {
          const reply = await c.mutate(tx, input);
          const pid = (await tx.query<{ pid: number }>(s('SELECT pg_backend_pid() AS pid')))[0]!
            .pid;
          await killer.query('SELECT pg_terminate_backend($1)', [pid]);
          return reply;
        },
      };
      await assert.rejects(executeIdempotent(f.db, killing), busy);
      // Authoritative state through a new connection: the uncommitted writes are gone.
      assert.deepEqual(await counts(f.fresh), [0, 0, 0, 0]);
      const first = await executeIdempotent(f.db, c);
      assert.deepEqual(await executeIdempotent(f.db, c), first);
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
    } finally {
      killer.release();
      await f.close();
    }
  },
);

test(
  'PostgreSQL 17: RV-15 statement timeout is busy and uncommitted; lost commit ack resolves by authoritative key state',
  { skip },
  async () => {
    // Definitely-uncommitted branch: the server cancels a slow statement.
    const slow = await fixture({ statementTimeoutMs: 300 });
    try {
      const c = command();
      await assert.rejects(
        executeIdempotent(slow.db, {
          ...c,
          mutate: async (tx: Transaction, input: unknown) => {
            const reply = await c.mutate(tx, input);
            await tx.query(s('SELECT pg_sleep(2)'));
            return reply;
          },
        }),
        busy,
      );
      assert.deepEqual(await counts(slow.fresh), [0, 0, 0, 0]);
      const first = await executeIdempotent(slow.db, c);
      assert.deepEqual(await executeIdempotent(slow.db, c), first);
      assert.deepEqual(await counts(slow.fresh), [1, 1, 1, 1]);
    } finally {
      await slow.close();
    }
    // Committed-but-acknowledgement-lost branch: COMMIT succeeds, the reply never arrives.
    const f = await fixture();
    try {
      const lost = instrument(f.db, async (_attempt, run) => {
        await run();
        throw new TransactionFailure(
          'unknown',
          Object.assign(new Error('acknowledgement lost'), { code: 'ECONNRESET' }),
        );
      });
      const c = command();
      await assert.rejects(executeIdempotent(lost.db, c), busy);
      // Timeout is not rollback: the authoritative key/state shows the command committed once.
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
      const replay = await executeIdempotent(f.db, c);
      assert.equal(replay.status, 201);
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
      await assert.rejects(
        executeIdempotent(f.db, { ...c, body: { body: 'different body' } }),
        (e: unknown) => e instanceof ApiFault && e.code === 'IDEMPOTENCY_CONFLICT',
      );
      await assert.rejects(
        executeIdempotent(f.db, {
          ...c,
          authorize: async () => {
            throw new ApiFault('FORBIDDEN');
          },
        }),
        (e: unknown) => e instanceof ApiFault && e.code === 'FORBIDDEN',
      );
      assert.deepEqual(await counts(f.fresh), [1, 1, 1, 1]);
    } finally {
      await f.close();
    }
  },
);
