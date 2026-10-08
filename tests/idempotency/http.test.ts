import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { idempotencyHook } from '../../src/api/idempotency.js';
import { ApiFault } from '../../src/api/errors.js';
import type { ApiHooks } from '../../src/api/middleware.js';
import { operations } from '../../src/api/contract.js';
import { sqliteFixture, statement as s, time } from '../schema/fixtures.js';
import { comment, counts } from './provider-suite.js';
const origin = 'https://friday.invalid',
  csrf = 'a'.repeat(64);
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
test('HTTP replay has fresh requestId; real SQLite tx and repeated guard; missing engine fails closed', async () => {
  const f = await sqliteFixture();
  const operation = operations.find(
    (o) => o.method === 'POST' && o.path === '/api/tasks/{id}/comments',
  )!;
  const hooks: ApiHooks = {
    session: async () => ({ id: 1, active: true, mustChangePassword: false, csrf }),
    authorize: async () => 'allowed',
    handlers: {
      [operation.operation.operationId]: async (ctx) => {
        assert(ctx.transaction);
        return comment(ctx.transaction, ctx.body);
      },
    },
  };
  const init = {
    method: 'POST',
    headers: {
      Origin: origin,
      'X-CSRF-Token': csrf,
      'Idempotency-Key': randomUUID(),
      'Content-Type': 'application/json',
    },
    body: '{"body":"fixture comment"}',
  };
  try {
    await http(hooks, async (base) => {
      const r = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(r.status, 503);
      assert.equal((await r.json()).error.code, 'SERVICE_NOT_READY');
    });
    assert.deepEqual(await counts(f.db), [0, 0, 0, 0]);
    let denied = false;
    hooks.idempotency = idempotencyHook(
      f.db,
      async (tx, ctx) => {
        assert.equal(ctx.principal?.id, 1);
        if (denied) throw new ApiFault('NOT_FOUND');
        const users = await tx.query<{ active: number }>(
          s('SELECT active FROM dbo.users WHERE id=1'),
        );
        if (!users[0]?.active) throw new ApiFault('UNAUTHENTICATED');
      },
      () => new Date(time),
    );
    await http(hooks, async (base) => {
      const first = await fetch(base + '/api/tasks/1/comments', init),
        second = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(first.status, 201);
      assert.equal(second.status, 201);
      assert.deepEqual(await second.json(), await first.json());
      assert.notEqual(first.headers.get('x-request-id'), second.headers.get('x-request-id'));
      assert.equal(second.headers.get('set-cookie'), null);
      const conflict = await fetch(base + '/api/tasks/1/comments', {
        ...init,
        body: '{"body":"changed"}',
      });
      assert.equal(conflict.status, 409);
      denied = true;
      const hidden = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(hidden.status, 404);
      denied = false;
      await f.db.transaction((tx) => tx.execute(s('UPDATE dbo.users SET active=0 WHERE id=1')));
      const revoked = await fetch(base + '/api/tasks/1/comments', init);
      assert.equal(revoked.status, 401);
    });
    assert.deepEqual(await counts(f.db), [1, 1, 1, 1]);
  } finally {
    await f.close();
  }
});
