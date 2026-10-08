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
test('T035 HTTP move DTO/versions/CSRF/key/replay and recurrence3-column response persists actual restart', () =>
  fixture(async (base, f, restart) => {
    const a = await login(base),
      key = randomUUID(),
      headers = { ...a.headers, 'Idempotency-Key': key };
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "UPDATE dbo.tasks SET recurrence='monthly',due_date='2027-01-31',recurrence_anchor_day=31 WHERE id=1",
        ),
      ),
    );
    const b = await (await fetch(base + '/api/projects/1/board', { headers: a.headers })).json();
    const body = {
      task_id: 1,
      task_version: 1,
      from_status: 'todo',
      to_status: 'doing',
      source_column_version: b.columns[0].version,
      target_column_version: b.columns[1].version,
      before_task_id: null,
    };
    assert.equal(
      (await mutate(base, '/api/projects/1/board/move', a.headers, body, 'POST')).status,
      422,
    );
    const r = await mutate(base, '/api/projects/1/board/move', headers, body, 'POST');
    assert.equal(r.status, 200);
    assert.equal(r.body.task.status, 'doing');
    const next = await (await fetch(base + '/api/projects/1/board', { headers: a.headers })).json();
    const done = await mutate(
      base,
      '/api/projects/1/board/move',
      { ...a.headers, 'Idempotency-Key': randomUUID() },
      {
        ...body,
        task_version: 2,
        from_status: 'doing',
        to_status: 'done',
        source_column_version: next.columns[1].version,
        target_column_version: next.columns[3].version,
      },
      'POST',
    );
    assert.equal(done.status, 200);
    assert.equal(done.body.affected_columns.length, 3);
    assert.equal(done.body.successor.due_date, '2027-02-28');
    const restarted = await restart();
    assert.deepEqual(
      await mutate(restarted, '/api/projects/1/board/move', headers, body, 'POST'),
      r,
    );
    assert.equal(
      (
        await mutate(
          restarted,
          '/api/projects/1/board/move',
          { ...a.headers, 'Idempotency-Key': randomUUID() },
          body,
          'POST',
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await mutate(
          restarted,
          '/api/projects/1/board/move',
          headers,
          { ...body, to_status: 'review' },
          'POST',
        )
      ).status,
      409,
    );
    const before = await (
      await fetch(restarted + '/api/projects/1/board', { headers: a.headers })
    ).json();
    await mutate(restarted, '/api/tasks/1', a.headers, { version: 3 }, 'DELETE');
    assert.equal(
      (await mutate(restarted, '/api/projects/1/board/move', headers, body, 'POST')).status,
      404,
    );
    assert.equal(before.total, 3);
  }));
test('T039 HTTP concurrent same-key comment/restart/plaintext/read scope/archive/current replay rights', () =>
  fixture(async (base, f, restart) => {
    const a = await login(base);
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(1,2,'editor',1)",
        ),
      ),
    );
    const m = await login(base, 'Member'),
      key = randomUUID(),
      headers = { ...m.headers, 'Idempotency-Key': key },
      body = { body: '<script>alert(1)</script>' };
    const responses = await Promise.all([
      mutate(base, '/api/tasks/1/comments', headers, body, 'POST'),
      mutate(base, '/api/tasks/1/comments', headers, body, 'POST'),
    ]);
    assert.equal(responses[0]!.status, 201);
    assert.deepEqual(responses[0], responses[1]);
    const restarted = await restart();
    assert.deepEqual(
      await mutate(restarted, '/api/tasks/1/comments', headers, body, 'POST'),
      responses[0],
    );
    const page = await (
      await fetch(restarted + '/api/tasks/1/comments?pageSize=1', { headers: a.headers })
    ).json();
    assert.equal(page.total, 1);
    assert.equal(page.items[0].body, body.body);
    assert.equal(page.items[0].author.id, 2);
    assert.equal(
      (await mutate(restarted, '/api/tasks/1/comments', headers, { body: 'different' }, 'POST'))
        .status,
      409,
    );
    await f.db.transaction((tx) =>
      tx.execute(sql("UPDATE dbo.projects SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1")),
    );
    assert.equal(
      (await fetch(restarted + '/api/tasks/1/comments', { headers: a.headers })).status,
      200,
    );
    assert.equal(
      (
        await mutate(
          restarted,
          '/api/tasks/1/comments',
          { ...a.headers, 'Idempotency-Key': randomUUID() },
          { body: 'archived' },
          'POST',
        )
      ).status,
      422,
    );
    await f.db.transaction((tx) =>
      tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=2')),
    );
    assert.equal(
      (await mutate(restarted, '/api/tasks/1/comments', headers, body, 'POST')).status,
      404,
    );
    assert.equal(
      (await fetch(restarted + '/api/tasks/1/comments', { headers: m.headers })).status,
      404,
    );
    for (const method of ['PATCH', 'DELETE'])
      assert.equal(
        (await mutate(restarted, '/api/comments/1', a.headers, { body: 'edit' }, method)).status,
        404,
      );
  }));
