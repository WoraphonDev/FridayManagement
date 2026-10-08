import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const origin = 'https://task-views.invalid',
  basic = { Origin: origin, 'Content-Type': 'application/json' };
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/task-views-http',
  LOG_DIR: '/private/tmp/task-views-log',
  SQLITE_DB_PATH: '/private/tmp/task-views-http/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
async function fixture(
  work: (
    base: string,
    f: Awaited<ReturnType<typeof sessionFixture>>,
    restart: () => Promise<string>,
  ) => Promise<void>,
) {
  const f = await sessionFixture(sqliteFixture);
  const start = async () => {
    const server = createApp(
      undefined,
      config,
      await sessionHooks(f.db, { clock: f.clock, cookieSecure: true }),
    ).listen(0, '127.0.0.1');
    await new Promise<void>((r) => server.once('listening', r));
    const address = server.address();
    assert(address && typeof address === 'object');
    return { server, base: `http://127.0.0.1:${address.port}` };
  };
  let running = await start();
  const stop = async () => {
    running.server.closeAllConnections();
    await new Promise<void>((r) => running.server.close(() => r()));
  };
  const restart = async () => {
    await stop();
    f.db = await f.reopen();
    running = await start();
    return running.base;
  };
  try {
    await work(running.base, f, restart);
  } finally {
    await stop();
    await f.close();
  }
}
async function login(base: string, username = 'Admin') {
  const response = await fetch(base + '/api/login', {
    method: 'POST',
    headers: basic,
    body: JSON.stringify({ username, password }),
  });
  assert.equal(response.status, 200);
  const self = await response.json();
  const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
  return { cookie, headers: { ...basic, Cookie: cookie, 'X-CSRF-Token': self.csrf } };
}
async function mutate(
  base: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
  method = 'PATCH',
) {
  const response = await fetch(base + path, { method, headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
test('T030/031/034 HTTP locked list/trash/board DTOs and restore idempotency survives restart', () =>
  fixture(async (base, f, restart) => {
    const a = await login(base),
      key = randomUUID();
    const made = await mutate(
      base,
      '/api/tasks',
      { ...a.headers, 'Idempotency-Key': randomUUID() },
      { project_id: 1, title: 'View HTTP' },
      'POST',
    );
    assert.equal(made.status, 201);
    const id = made.body.item.id;
    const deleted = await mutate(base, `/api/tasks/${id}`, a.headers, { version: 1 }, 'DELETE');
    assert.equal(deleted.status, 200);
    assert.equal(deleted.body.item.deleted_by, 1);
    assert.equal((await fetch(base + `/api/tasks/${id}`, { headers: a.headers })).status, 404);
    const trash = await fetch(base + '/api/trash?pageSize=1', { headers: a.headers });
    assert.equal(trash.status, 200);
    assert.equal((await trash.json()).items[0].id, id);
    const headers = { ...a.headers, 'Idempotency-Key': key };
    const restored = await mutate(
      base,
      `/api/tasks/${id}/restore`,
      headers,
      { version: 2 },
      'POST',
    );
    assert.equal(restored.status, 200);
    assert.equal(restored.body.item.version, 3);
    const restarted = await restart();
    assert.deepEqual(
      await mutate(restarted, `/api/tasks/${id}/restore`, headers, { version: 2 }, 'POST'),
      restored,
    );
    const b = await (
      await fetch(restarted + '/api/projects/1/board', { headers: a.headers })
    ).json();
    assert.equal(b.columns[0].task_ids.at(-1), id);
    assert.equal(b.columns[0].version, 4);
    const active = await (
      await fetch(restarted + '/api/tasks?q=view&project=1&pageSize=1', { headers: a.headers })
    ).json();
    assert.equal(active.total, 1);
    assert.equal(active.items[0].id, id);
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql("SELECT id FROM dbo.task_events WHERE action='restored'")),
        )
      ).length,
      1,
    );
    assert.equal(
      (await mutate(restarted, `/api/tasks/${id}`, a.headers, { version: 3 }, 'DELETE')).status,
      200,
    );
    assert.equal(
      (await mutate(restarted, `/api/tasks/${id}/restore`, headers, { version: 2 }, 'POST')).status,
      404,
    );
  }));
test('T031 HTTP malformed/reversed/repeated queries rejected; read/count scoped and revoked trash fails closed', () =>
  fixture(async (base) => {
    const a = await login(base),
      m = await login(base, 'Member');
    for (const suffix of [
      'page=0',
      'has_due=false&due_from=2026-10-01',
      'due_from=2026-10-07&due_to=2026-10-01',
      'status=todo&status=todo',
      'secret=true',
      'project=1&project=2',
    ])
      assert.equal(
        (await fetch(base + '/api/tasks?' + suffix, { headers: a.headers })).status,
        400,
      );
    assert.equal((await fetch(base + '/api/trash', { headers: m.headers })).status, 403);
    assert.equal((await fetch(base + '/api/projects/1/board', { headers: m.headers })).status, 404);
    const list = await (await fetch(base + '/api/tasks?q=PRIVATE', { headers: m.headers })).json();
    assert.equal(list.total, 0);
    assert.deepEqual(list.items, []);
    assert.equal(
      (await mutate(base, '/api/tasks/1', a.headers, { version: 99 }, 'DELETE')).status,
      409,
    );
    assert.equal(
      (await mutate(base, '/api/tasks/1', a.headers, { version: 1 }, 'DELETE')).status,
      200,
    );
    assert.equal(
      (
        await mutate(
          base,
          '/api/tasks/1/restore',
          { ...m.headers, 'Idempotency-Key': randomUUID() },
          { version: 2 },
          'POST',
        )
      ).status,
      404,
    );
  }));
