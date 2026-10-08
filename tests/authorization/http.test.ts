import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { authorizationHooks } from '../../src/api/authorization.js';
import type { ApiHooks } from '../../src/api/middleware.js';
import { operations } from '../../src/api/contract.js';
import { notificationScope, readNotifications, sql } from '../../src/repository/access-scope.js';
import { sqliteFixture, time } from '../schema/fixtures.js';
import { accessFixture, proof, now, csrf } from './fixtures.js';
import { comment } from '../idempotency/provider-suite.js';
const origin = 'https://friday.invalid';
const op = (method: string, path: string) =>
  operations.find((o) => o.method === method && o.path === path)!.operation.operationId;
async function http(hooks: ApiHooks, work: (base: string) => Promise<void>) {
  const server = createApp(undefined, undefined, { origin, ...hooks }).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  try {
    const a = server.address();
    assert(a && typeof a === 'object');
    await work(`http://127.0.0.1:${a.port}`);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r, j) => server.close((e) => (e ? j(e) : r())));
  }
}
const session = async () => ({ id: 4, active: true, mustChangePassword: false, csrf });
const headers = { Origin: origin, 'X-CSRF-Token': csrf, 'Content-Type': 'application/json' };
test('HTTP actual DB authorization/idempotency: archived replay, new write denial and revoked membership/session', async () => {
  const f = await accessFixture(sqliteFixture);
  try {
    const handlers = {
      [op('POST', '/api/tasks/{id}/comments')]: async (
        ctx: Parameters<NonNullable<ApiHooks['handlers']>[string]>[0],
      ) => {
        assert(ctx.transaction);
        return comment(ctx.transaction, ctx.body, 4);
      },
    };
    const hooks = {
      session,
      ...authorizationHooks(f.db, async () => proof(4), handlers, { clock: () => new Date(now) }),
    };
    await http(hooks, async (base) => {
      const init = {
        method: 'POST',
        headers: { ...headers, 'Idempotency-Key': randomUUID() },
        body: '{"body":"fixture"}',
      };
      const first = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(first.status, 201);
      const saved = await first.json();
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', { now })),
      );
      const replay = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(replay.status, 201);
      assert.deepEqual(await replay.json(), saved);
      assert.notEqual(replay.headers.get('x-request-id'), first.headers.get('x-request-id'));
      const fresh = await fetch(base + '/api/tasks/1/comments', {
        ...init,
        headers: { ...init.headers, 'Idempotency-Key': randomUUID() },
      });
      assert.equal(fresh.status, 422);
      assert.equal((await fresh.json()).error.code, 'PROJECT_ARCHIVED');
      await f.db.transaction((tx) =>
        tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=4 AND project_id=1')),
      );
      const hidden = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(hidden.status, 404);
      await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.sessions WHERE user_id=4')));
      const revoked = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(revoked.status, 401);
    });
    await f.db.transaction(async (tx) => {
      const rows = await tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.comments'));
      assert.equal(rows[0]!.n, 1);
    });
  } finally {
    await f.close();
  }
});
test('HTTP scoped list/count/read-all and response rollback; forced-password activity exception works end to end', async () => {
  const f = await accessFixture(sqliteFixture);
  let bad = true,
    forced = false;
  try {
    const handlers: NonNullable<ApiHooks['handlers']> = {
      [op('GET', '/api/notifications')]: async (ctx) => {
        assert(ctx.transaction);
        const rows = await ctx.transaction.query(notificationScope(4));
        return {
          status: 200,
          body: {
            items: rows.map((row) => ({ ...row, type: 'comment', created_at: time })),
            page: 1,
            pageSize: 50,
            total: rows.length,
            unread_count: rows.filter((r) => !r.read_at).length,
          },
        };
      },
      [op('POST', '/api/notifications/read-all')]: async (ctx) => {
        assert(ctx.transaction);
        await ctx.transaction.execute(readNotifications(4, now));
        return {
          status: 200,
          body: bad ? { password: 'fixture' } : { marked_count: 1, unread_count: 0 },
        };
      },
      [op('POST', '/api/session/activity')]: async () => ({ status: 204 }),
    };
    const hooks = {
      session: async () => ({ ...(await session()), mustChangePassword: forced }),
      ...authorizationHooks(f.db, async () => proof(4), handlers, { clock: () => new Date(now) }),
    };
    await http(hooks, async (base) => {
      const list = await fetch(base + '/api/notifications');
      assert.equal(list.status, 200);
      const dto = await list.json();
      assert.equal(dto.total, 1);
      assert.equal(dto.unread_count, 1);
      assert(!JSON.stringify(dto).includes('PRIVATE_ONLY'));
      const rejected = await fetch(base + '/api/notifications/read-all', {
        method: 'POST',
        headers,
      });
      assert.equal(rejected.status, 500);
      await f.db.transaction(async (tx) =>
        assert((await tx.query(notificationScope(4))).every((r) => r.read_at === null)),
      );
      bad = false;
      assert.equal(
        (await fetch(base + '/api/notifications/read-all', { method: 'POST', headers })).status,
        200,
      );
      forced = true;
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=4')),
      );
      assert.equal(
        (await fetch(base + '/api/session/activity', { method: 'POST', headers })).status,
        204,
      );
      const blocked = await fetch(base + '/api/notifications');
      assert.equal(blocked.status, 403);
      assert.equal((await blocked.json()).error.code, 'PASSWORD_CHANGE_REQUIRED');
    });
    await f.db.transaction(async (tx) => {
      const rows = await tx.query<{ id: number; read_at: string | null }>(
        sql('SELECT id,read_at FROM dbo.notifications ORDER BY id'),
      );
      assert.deepEqual(rows, [
        { id: 1, read_at: now },
        { id: 2, read_at: null },
        { id: 3, read_at: null },
      ]);
    });
  } finally {
    await f.close();
  }
});
