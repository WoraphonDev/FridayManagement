import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Database, Transaction } from '../../src/domain/database.js';
import { ApiFault } from '../../src/api/errors.js';
import { TransactionFailure, OperationError } from '../../src/domain/failure.js';
import {
  executeIdempotent,
  deleteExpiredIdempotency,
  type Reply,
} from '../../src/repository/idempotency.js';
import { idempotencyCleanupJob } from '../../src/jobs/idempotency-cleanup.js';
import { insert, statement as s, time, type Fixture } from '../schema/fixtures.js';
export async function comment(tx: Transaction, input: unknown, user = 1, task = 1): Promise<Reply> {
  const body = (input as { body: string }).body;
  const rows = await tx.query<{ id: number }>({
    sqlite:
      'INSERT INTO comments(task_id,author_id,body,created_at) VALUES($task,$user,$body,$now) RETURNING id',
    sqlserver:
      'INSERT INTO dbo.comments(task_id,author_id,body,created_at) OUTPUT INSERTED.id VALUES(@task,@user,@body,@now)',
    parameters: { task, user, body, now: time },
  });
  await tx.execute(
    insert('task_events', {
      task_id: task,
      actor_id: user,
      action: 'comment_added',
      field_changes: '[]',
      request_id: randomUUID(),
      created_at: time,
    }),
  );
  await tx.execute(
    insert('notifications', {
      task_id: task,
      recipient_id: user === 1 ? 2 : 1,
      type: 'comment',
      message: 'fixture',
      dedupe_key: randomUUID(),
      created_at: time,
    }),
  );
  return {
    status: 201,
    body: {
      item: {
        id: rows[0]!.id,
        task_id: task,
        author: { id: user, display_name: 'fixture', active: true },
        body,
        created_at: time,
      },
    },
  };
}
export function command(key: string = randomUUID(), task = 1, user = 1) {
  return {
    userId: user,
    method: 'POST',
    path: `/api/tasks/${task}/comments`,
    key,
    body: { body: 'fixture comment' },
    authorize: async () => {},
    mutate: (tx: Transaction, input: unknown) => comment(tx, input, user, task),
    clock: () => new Date(time),
  };
}
export async function counts(db: Database): Promise<number[]> {
  return db.transaction(async (tx) => {
    const result: number[] = [];
    for (const table of ['comments', 'task_events', 'notifications', 'idempotency_keys']) {
      const rows = await tx.query<{ n: number }>(s(`SELECT COUNT(*) AS n FROM dbo.${table}`));
      result.push(rows[0]!.n);
    }
    return result;
  });
}
const rejects = (promise: Promise<unknown>, code: string) =>
  assert.rejects(promise, (e: unknown) => e instanceof ApiFault && e.code === code);
export function idempotencyAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (name: string, run: (f: Fixture) => Promise<void>) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await factory();
      try {
        await run(f);
      } finally {
        await f.close();
      }
    });
  check(
    'replay survives reopen; case-insensitive UUID; different body conflicts; user/concrete path isolated',
    async (f) => {
      const c = command();
      const first = await executeIdempotent(f.db, c);
      const db = await f.reopen();
      assert.deepEqual(await executeIdempotent(db, { ...c, key: c.key.toUpperCase() }), first);
      await rejects(
        executeIdempotent(db, { ...c, body: { body: 'changed' } }),
        'IDEMPOTENCY_CONFLICT',
      );
      await executeIdempotent(db, command(c.key, 2));
      await executeIdempotent(db, command(c.key, 1, 2));
      assert.deepEqual(await counts(db), [3, 3, 3, 3]);
    },
  );
  check(
    'current rights and resource visibility checked before replay/hash conflict; archive allows readable replay',
    async (f) => {
      const c = command();
      let permission: string | undefined;
      const authorize = async (tx: Transaction, state: { replay: boolean }) => {
        if (permission) throw new ApiFault(permission as 'FORBIDDEN');
        const rows = await tx.query<{ deleted_at: string | null; archived_at: string | null }>(
          s(
            'SELECT t.deleted_at,p.archived_at FROM dbo.tasks t JOIN dbo.projects p ON p.id=t.project_id WHERE t.id=@id',
            { id: 1 },
          ),
        );
        if (!rows[0] || rows[0].deleted_at) throw new ApiFault('NOT_FOUND');
        if (rows[0].archived_at && !state.replay) throw new ApiFault('PROJECT_ARCHIVED');
      };
      const first = await executeIdempotent(f.db, { ...c, authorize });
      for (const code of ['FORBIDDEN', 'PASSWORD_CHANGE_REQUIRED', 'NOT_FOUND']) {
        permission = code;
        await rejects(
          executeIdempotent(f.db, { ...c, authorize, body: { body: 'changed' } }),
          code,
        );
      }
      permission = undefined;
      await f.db.transaction((tx) =>
        tx.execute(s('UPDATE dbo.projects SET archived_at=@now WHERE id=1', { now: time })),
      );
      assert.deepEqual(await executeIdempotent(f.db, { ...c, authorize }), first);
      await rejects(
        executeIdempotent(f.db, { ...c, key: randomUUID(), authorize }),
        'PROJECT_ARCHIVED',
      );
      await f.db.transaction((tx) =>
        tx.execute(
          s('UPDATE dbo.tasks SET deleted_at=@now,deleted_by=1 WHERE id=1', { now: time }),
        ),
      );
      await rejects(executeIdempotent(f.db, { ...c, authorize }), 'NOT_FOUND');
      assert.deepEqual(await counts(f.db), [1, 1, 1, 1]);
    },
  );
  check(
    'TTL anchored after mutation; exact cutoff expired; failed replacement restores old cache',
    async (f) => {
      const c = command();
      let now = new Date(time);
      const first = await executeIdempotent(f.db, {
        ...c,
        clock: () => now,
        mutate: async (tx, input) => {
          const r = await c.mutate(tx, input);
          now = new Date('2026-10-06T02:00:00.000Z');
          return r;
        },
      });
      now = new Date('2026-10-07T01:59:59.999Z');
      assert.deepEqual(await executeIdempotent(f.db, { ...c, clock: () => now }), first);
      now = new Date('2026-10-07T02:00:00.000Z');
      await assert.rejects(
        executeIdempotent(f.db, {
          ...c,
          clock: () => now,
          mutate: async (tx, input) => {
            await c.mutate(tx, input);
            throw new Error('injected');
          },
        }),
      );
      assert.deepEqual(await counts(f.db), [1, 1, 1, 1]);
      const second = await executeIdempotent(f.db, { ...c, clock: () => now });
      assert.notDeepEqual(second, first);
      assert.deepEqual(await counts(f.db), [2, 2, 2, 1]);
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ created_at: string; expires_at: string }>(
          s('SELECT created_at,expires_at FROM dbo.idempotency_keys'),
        );
        assert.equal(rows[0]!.created_at, now.toISOString());
        assert.equal(Date.parse(rows[0]!.expires_at) - Date.parse(rows[0]!.created_at), 86400000);
      });
    },
  );
  check(
    'effect failure and response sensitive-field rejection roll back business/effects/cache',
    async (f) => {
      const c = command();
      await assert.rejects(
        executeIdempotent(f.db, {
          ...c,
          mutate: async (tx, input) => {
            await c.mutate(tx, input);
            await tx.execute(
              s(
                "INSERT INTO dbo.notifications(recipient_id,task_id,type,message,dedupe_key) VALUES(999,1,'comment','fixture','injected')",
              ),
            );
            return { status: 201, body: {} };
          },
        }),
      );
      assert.deepEqual(await counts(f.db), [0, 0, 0, 0]);
      await rejects(
        executeIdempotent(f.db, {
          ...c,
          mutate: async (tx, input) => {
            const r = await c.mutate(tx, input);
            return {
              ...r,
              body: {
                ...(r.body as object),
                password: 'fixture',
                headers: { 'Set-Cookie': 'fixture' },
              },
            };
          },
        }),
        'INTERNAL_ERROR',
      );
      assert.deepEqual(await counts(f.db), [0, 0, 0, 0]);
    },
  );
  check(
    'cache insert failure atomically rolls back business, audit and notification',
    async (f) => {
      const injected: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: (work) =>
          f.db.transaction((tx) =>
            work({
              query: (s) => tx.query(s),
              execute: async (s) => {
                if (s.sqlite.startsWith('INSERT INTO idempotency_keys'))
                  throw new Error('injected cache persistence failure');
                await tx.execute(s);
              },
            }),
          ),
      };
      await assert.rejects(executeIdempotent(injected, command()));
      assert.deepEqual(await counts(f.db), [0, 0, 0, 0]);
    },
  );
  check(
    'parallel same key replays; conflicting parallel body creates one set of effects',
    async (f) => {
      const c = command();
      const replies = await Promise.all(
        Array.from({ length: 4 }, () => executeIdempotent(f.db, c)),
      );
      for (const r of replies) assert.deepEqual(r, replies[0]);
      const outcomes = await Promise.allSettled([
        executeIdempotent(f.db, c),
        executeIdempotent(f.db, { ...c, body: { body: 'different' } }),
      ]);
      assert.equal(outcomes[0]!.status, 'fulfilled');
      assert.equal(outcomes[1]!.status, 'rejected');
      assert.deepEqual(await counts(f.db), [1, 1, 1, 1]);
    },
  );
  check(
    'bounded cleanup expires at cutoff and preserves live keys; job has no automatic timer',
    async (f) => {
      for (let i = 0; i < 5; i++) await executeIdempotent(f.db, command());
      await executeIdempotent(f.db, {
        ...command(),
        clock: () => new Date('2026-10-06T01:00:00.000Z'),
      });
      const now = '2026-10-07T00:00:00.000Z';
      assert.equal(await deleteExpiredIdempotency(f.db, now, 2), 2);
      assert.equal(await deleteExpiredIdempotency(f.db, now, 2), 2);
      assert.equal(await idempotencyCleanupJob(f.db, () => new Date(now)).run(), 1);
      assert.deepEqual(await counts(f.db), [6, 6, 6, 1]);
      await rejects(deleteExpiredIdempotency(f.db, now, 1001), 'VALIDATION_FAILED');
    },
  );
  check(
    'create defaults normalized; credential commands rejected before hashing/persistence',
    async (f) => {
      const c = {
        ...command(),
        path: '/api/teams',
        body: { name: ' fixture ' },
        mutate: async (tx: Transaction, input: unknown) => {
          const b = input as { name: string; description: string };
          await tx.execute(insert('teams', b));
          const rows = await tx.query<{ id: number }>(
            s('SELECT id FROM dbo.teams WHERE name=@name', { name: b.name }),
          );
          return {
            status: 201,
            body: {
              item: {
                id: rows[0]!.id,
                name: b.name,
                description: b.description,
                archived_at: null,
                version: 1,
                own_role: null,
                members: [],
              },
            },
          };
        },
      };
      const first = await executeIdempotent(f.db, c);
      assert.deepEqual(
        await executeIdempotent(f.db, { ...c, body: { description: '', name: 'fixture' } }),
        first,
      );
      for (const path of [
        '/api/setup',
        '/api/login',
        '/api/me/password',
        '/api/users',
        '/api/users/1/reset-password',
      ]) {
        await rejects(
          executeIdempotent(f.db, {
            ...command(),
            path,
            body: { password: Buffer.from('fixture') },
          }),
          'VALIDATION_FAILED',
        );
      }
      assert.deepEqual(await counts(f.db), [0, 0, 0, 1]);
    },
  );
  check(
    'ambiguous outcome after commit returns busy; retry replays committed result without effects duplication',
    async (f) => {
      const c = command();
      let attempts = 0;
      const uncertain: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: async (work) => {
          attempts++;
          await f.db.transaction(work);
          throw new TransactionFailure(
            'unknown',
            new Error('injected lost commit acknowledgement'),
          );
        },
      };
      await assert.rejects(
        executeIdempotent(uncertain, c),
        (e: unknown) =>
          e instanceof OperationError && e.code === 'DATABASE_BUSY' && e.retryAfterSeconds === 5,
      );
      assert.equal(attempts, 1);
      const reply = await executeIdempotent(f.db, c);
      assert.equal(reply.status, 201);
      assert.deepEqual(await counts(f.db), [1, 1, 1, 1]);
    },
  );
  check(
    'upload fingerprint permits validated metadata only; file bytes and headers never reach storage',
    async (f) => {
      const metadata = {
        original_name: ' fixture.pdf ',
        validated_type: 'application/pdf',
        bytes: 100,
        sha256: 'a'.repeat(64),
      };
      const c = {
        ...command(),
        path: '/api/tasks/1/attachments',
        body: metadata,
        mutate: async (_tx: Transaction, input: unknown) => {
          const body = input as typeof metadata;
          return {
            status: 201,
            body: {
              item: {
                id: 1,
                task_id: 1,
                uploader: { id: 1, display_name: 'fixture', active: true },
                ...body,
                created_at: time,
                deleted_at: null,
                can_delete: true,
                can_restore: false,
              },
            },
          };
        },
      };
      const first = await executeIdempotent(f.db, c);
      assert.deepEqual(
        await executeIdempotent(f.db, {
          ...c,
          body: { ...metadata, original_name: 'fixture.pdf' },
        }),
        first,
      );
      await rejects(
        executeIdempotent(f.db, { ...c, body: { ...metadata, raw_bytes: Buffer.from('fixture') } }),
        'VALIDATION_FAILED',
      );
      await rejects(
        executeIdempotent(f.db, { ...c, body: { ...metadata, sha256: 'b'.repeat(64) } }),
        'IDEMPOTENCY_CONFLICT',
      );
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ response_body: string }>(
          s('SELECT response_body FROM dbo.idempotency_keys'),
        );
        assert(!rows[0]!.response_body.includes('raw_bytes'));
      });
      assert.deepEqual(await counts(f.db), [0, 0, 0, 1]);
    },
  );
}
