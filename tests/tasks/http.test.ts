import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const origin = 'https://tasks.invalid',
  basic = { Origin: origin, 'Content-Type': 'application/json' };
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/tasks-http',
  LOG_DIR: '/private/tmp/tasks-log',
  SQLITE_DB_PATH: '/private/tmp/tasks-http/fixture.sqlite',
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
test('T025 HTTP authenticated name only, current admin/CSRF/version', () =>
  fixture(async (base) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    assert.equal((await fetch(base + '/api/organization')).status, 401);
    assert.equal(
      (await mutate(base, '/api/organization', member.headers, { name: 'No', version: 1 })).status,
      403,
    );
    assert.equal(
      (
        await mutate(
          base,
          '/api/organization',
          { ...admin.headers, 'X-CSRF-Token': 'wrong' },
          { name: 'No', version: 1 },
        )
      ).status,
      403,
    );
    const changed = await mutate(base, '/api/organization', admin.headers, {
      name: '  New organization  ',
      version: 1,
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.item.name, 'New organization');
    const stale = await mutate(base, '/api/organization', admin.headers, {
      name: 'Stale',
      version: 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.currentVersion, 2);
    const read = await fetch(base + '/api/organization', { headers: { Cookie: member.cookie } });
    assert.equal(read.status, 200);
    assert.deepEqual(await read.json(), changed.body);
  }));
test('T026–029 HTTP locked task/checklist/status DTOs, persisted idempotent retry and scoped replay', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member'),
      key = randomUUID();
    const headers = { ...admin.headers, 'Idempotency-Key': key };
    const created = await mutate(
      base,
      '/api/tasks',
      headers,
      { project_id: 1, title: 'Monthly', due_date: '2027-01-31', recurrence: 'monthly' },
      'POST',
    );
    assert.equal(created.status, 201);
    const id = created.body.item.id;
    assert.deepEqual(
      await mutate(
        base,
        '/api/tasks',
        headers,
        { project_id: 1, title: 'Monthly', due_date: '2027-01-31', recurrence: 'monthly' },
        'POST',
      ),
      created,
    );
    assert.equal((await fetch(base + `/api/tasks/${id}`, { headers: member.headers })).status, 404);
    assert.equal(
      (await mutate(base, `/api/tasks/${id}`, admin.headers, { version: 1, status: 'done' }))
        .status,
      422,
    );
    const sub = await mutate(
      base,
      `/api/tasks/${id}/subtasks`,
      { ...admin.headers, 'Idempotency-Key': randomUUID() },
      { title: 'Check', task_version: 1 },
      'POST',
    );
    assert.equal(sub.status, 201);
    const incomplete = await mutate(
      base,
      `/api/tasks/${id}`,
      { ...admin.headers, 'Idempotency-Key': randomUUID() },
      { version: 2, status: 'done' },
    );
    assert.equal(incomplete.status, 422);
    assert.equal(incomplete.body.error.code, 'SUBTASKS_INCOMPLETE');
    const check = await mutate(base, `/api/subtasks/${sub.body.item.id}`, admin.headers, {
      version: 1,
      task_version: 2,
      done: true,
    });
    assert.equal(check.status, 200);
    assert.equal(check.body.task.status, 'todo');
    const doneKey = randomUUID(),
      doneHeaders = { ...admin.headers, 'Idempotency-Key': doneKey };
    const done = await mutate(base, `/api/tasks/${id}`, doneHeaders, {
      version: 3,
      status: 'done',
    });
    assert.equal(done.status, 200);
    assert.equal(done.body.successor.due_date, '2027-02-28');
    const read = await fetch(base + `/api/tasks/${id}`, { headers: admin.headers });
    assert.equal(read.status, 200);
    assert.equal((await read.json()).item.status, 'done');
    assert.deepEqual(
      await mutate(base, `/api/tasks/${id}`, doneHeaders, { version: 3, status: 'done' }),
      done,
    );
    assert.equal(
      (await mutate(base, `/api/tasks/${id}`, doneHeaders, { version: 3, status: 'review' }))
        .status,
      409,
    );
    const noop = await mutate(
      base,
      `/api/tasks/${id}`,
      { ...admin.headers, 'Idempotency-Key': randomUUID() },
      { version: 4, status: 'done' },
    );
    assert.equal(noop.status, 200);
    assert.equal(noop.body.item.version, 4);
    assert.equal(noop.body.item.completed_at, done.body.item.completed_at);
    const deleted = await fetch(base + `/api/subtasks/${sub.body.item.id}`, {
      method: 'DELETE',
      headers: admin.headers,
      body: JSON.stringify({ version: 2, task_version: 4 }),
    });
    assert.equal(deleted.status, 200);
    const deletedBody = await deleted.json();
    assert.equal(deletedBody.item.version, 5);
    assert.equal(deletedBody.item.subtask_count, 0);
    assert.deepEqual(
      await mutate(base, `/api/tasks/${id}`, doneHeaders, { version: 3, status: 'done' }),
      done,
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.tasks SET deleted_at=@now,deleted_by=1 WHERE id=@id', {
          id: done.body.successor.id,
          now: f.clock().toISOString(),
        }),
      ),
    );
    assert.equal(
      (await mutate(base, `/api/tasks/${id}`, doneHeaders, { version: 3, status: 'done' })).status,
      404,
    );
  }));
test('T026 HTTP validation/permissions/current lifecycle versions have no partial effects', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const keyHeaders = () => ({ ...admin.headers, 'Idempotency-Key': randomUUID() });
    const before = await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.tasks')));
    for (const b of [
      { title: ' ', project_id: 1 },
      { title: 'No', project_id: 1, assignee_id: 2 },
      { title: 'No', project_id: 1, start_date: '2026-10-07', due_date: '2026-10-06' },
    ])
      assert.equal((await mutate(base, '/api/tasks', keyHeaders(), b, 'POST')).status, 422);
    assert.equal(
      (
        await mutate(
          base,
          '/api/tasks',
          { ...member.headers, 'Idempotency-Key': randomUUID() },
          { project_id: 1, title: 'No' },
          'POST',
        )
      ).status,
      404,
    );
    assert.deepEqual(
      await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.tasks'))),
      before,
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', {
          now: f.clock().toISOString(),
        }),
      ),
    );
    const stale = await mutate(base, '/api/tasks/1', keyHeaders(), { version: 2, title: 'No' });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.currentVersion, 1);
    assert.equal(
      (await mutate(base, '/api/tasks/1', keyHeaders(), { version: 1, title: 'No' })).body.error
        .code,
      'PROJECT_ARCHIVED',
    );
  }));

test('T029 actual HTTP restart replays durable completion key without another successor', () =>
  fixture(async (base, f, restart) => {
    const admin = await login(base),
      created = await mutate(
        base,
        '/api/tasks',
        { ...admin.headers, 'Idempotency-Key': randomUUID() },
        { project_id: 1, title: 'Durable', recurrence: 'weekly', due_date: '2027-01-10' },
        'POST',
      );
    assert.equal(created.status, 201);
    const headers = { ...admin.headers, 'Idempotency-Key': randomUUID() },
      path = `/api/tasks/${created.body.item.id}`,
      payload = { version: 1, status: 'done' };
    const done = await mutate(base, path, headers, payload);
    assert.equal(done.status, 200);
    const reopenedBase = await restart();
    assert.deepEqual(await mutate(reopenedBase, path, headers, payload), done);
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT source_task_id FROM dbo.recurrence_events')),
        )
      ).length,
      1,
    );
  }));
