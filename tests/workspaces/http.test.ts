import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const origin = 'https://workspaces.invalid',
  basic = { Origin: origin, 'Content-Type': 'application/json' };
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/workspaces-http',
  LOG_DIR: '/private/tmp/workspaces-log',
  SQLITE_DB_PATH: '/private/tmp/workspaces-http/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
async function fixture(
  work: (base: string, f: Awaited<ReturnType<typeof sessionFixture>>) => Promise<void>,
) {
  const f = await sessionFixture(sqliteFixture);
  const server = createApp(
    undefined,
    config,
    await sessionHooks(f.db, { clock: f.clock, cookieSecure: true }),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const address = server.address();
  assert(address && typeof address === 'object');
  try {
    await work(`http://127.0.0.1:${address.port}`, f);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
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
test('T020/21 HTTP locked DTOs, pagination, idempotent creates and scoped replay recheck', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member'),
      key = randomUUID();
    const headers = { ...admin.headers, 'Idempotency-Key': key };
    const team = await mutate(base, '/api/teams', headers, { name: 'HTTP Team' }, 'POST');
    assert.equal(team.status, 201);
    assert(Array.isArray(team.body.item.members));
    assert.deepEqual(
      await mutate(base, '/api/teams', headers, { name: 'HTTP Team' }, 'POST'),
      team,
    );
    assert.equal(
      (await mutate(base, '/api/teams', headers, { name: 'Other' }, 'POST')).status,
      409,
    );
    const denied = await fetch(base + '/api/directory', { headers: { Cookie: member.cookie } });
    assert.equal(denied.status, 403);
    assert.equal(
      (await mutate(base, '/api/teams', member.headers, { name: 'No' }, 'POST')).status,
      403,
    );
    const list = await fetch(base + '/api/teams?page=1&pageSize=1', {
      headers: { Cookie: admin.cookie },
    });
    assert.equal(list.status, 200);
    const listed = await list.json();
    assert.equal(listed.items.length, 1);
    assert.equal(listed.total, 3);
    const membership = await mutate(
      base,
      `/api/teams/${team.body.item.id}/members/2`,
      admin.headers,
      { version: 1, team_role: 'lead' },
      'PUT',
    );
    assert.equal(membership.status, 200);
    const projectKey = randomUUID(),
      projectHeaders = { ...member.headers, 'Idempotency-Key': projectKey };
    const project = await mutate(
      base,
      '/api/projects',
      projectHeaders,
      { owner_team_id: team.body.item.id, name: 'Cross HTTP' },
      'POST',
    );
    assert.equal(project.status, 201);
    assert.equal(project.body.item.effective_access, 'lead');
    const removed = await mutate(
      base,
      `/api/teams/${team.body.item.id}/members/2`,
      admin.headers,
      { version: 2 },
      'DELETE',
    );
    assert.equal(removed.status, 200);
    assert.equal(
      (
        await mutate(
          base,
          '/api/projects',
          projectHeaders,
          { owner_team_id: team.body.item.id, name: 'Cross HTTP' },
          'POST',
        )
      ).status,
      403,
    );
    const privateList = await fetch(base + '/api/projects', { headers: { Cookie: member.cookie } });
    assert.equal((await privateList.json()).total, 0);
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql("SELECT id FROM dbo.projects WHERE name='Cross HTTP'")),
        )
      ).length,
      1,
    );
  }));
test('T021/024 HTTP project details persist, replay, validate and preserve permissions/version', () =>
  fixture(async (base) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const headers = { ...admin.headers, 'Idempotency-Key': randomUUID() };
    const payload = {
      owner_team_id: 1,
      name: '  โครงการใหม่ 🚀  ',
      description: 'รายละเอียด\nDevelopment',
      project_type: 'client',
      project_category: 'development',
    };
    const made = await mutate(base, '/api/projects', headers, payload, 'POST');
    assert.equal(made.status, 201);
    assert.equal(made.body.item.name, 'โครงการใหม่ 🚀');
    assert.equal(made.body.item.project_type, 'client');
    assert.equal(made.body.item.project_category, 'development');
    assert.deepEqual(await mutate(base, '/api/projects', headers, payload, 'POST'), made);
    assert.equal(
      (
        await mutate(
          base,
          '/api/projects',
          headers,
          { ...payload, project_type: 'internal' },
          'POST',
        )
      ).status,
      409,
    );
    const path = `/api/projects/${made.body.item.id}`;
    const updated = await mutate(base, path, admin.headers, {
      version: 1,
      project_type: 'operations',
      project_category: 'finance',
    });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.item.description, payload.description);
    assert.equal(updated.body.item.project_type, 'operations');
    assert.equal(updated.body.item.project_category, 'finance');
    assert.equal(
      (await mutate(base, path, admin.headers, { version: 1, project_category: 'it' })).status,
      409,
    );
    for (const invalid of [
      { project_type: 'invalid' },
      { project_category: 'invalid' },
      { project_type: null },
      { owner_team_id: 2 },
    ]) {
      assert.equal(
        (await mutate(base, path, admin.headers, { version: 2, ...invalid })).status,
        422,
      );
    }
    const rename = await mutate(base, path, admin.headers, { version: 2, name: 'ชื่อใหม่' });
    assert.equal(rename.status, 200);
    assert.equal(rename.body.item.project_type, 'operations');
    assert.equal(rename.body.item.project_category, 'finance');
    const blank = await mutate(base, path, admin.headers, {
      version: 3,
      project_type: '',
      project_category: '',
    });
    assert.equal(blank.status, 200);
    assert.equal(blank.body.item.project_type, '');
    assert.equal(blank.body.item.project_category, '');
    const defaults = await mutate(
      base,
      '/api/projects',
      { ...admin.headers, 'Idempotency-Key': randomUUID() },
      { owner_team_id: 1, name: 'Defaults' },
      'POST',
    );
    assert.equal(defaults.status, 201);
    assert.equal(defaults.body.item.project_type, 'internal');
    assert.equal(defaults.body.item.project_category, 'development');
    assert.equal(
      (
        await mutate(
          base,
          '/api/projects',
          { ...member.headers, 'Idempotency-Key': randomUUID() },
          payload,
          'POST',
        )
      ).status,
      403,
    );
    assert.equal(
      (await mutate(base, path, member.headers, { version: 4, project_category: 'it' })).status,
      404,
    );
  }));
test('T021/22 HTTP cross-team Viewer/downgrade/remove/version boundaries protect effective rights', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    let result = await mutate(
      base,
      '/api/projects/1/members/2',
      admin.headers,
      { version: 1, access: 'editor' },
      'PUT',
    );
    assert.equal(result.status, 200);
    assert.equal(result.body.membership_version, 2);
    await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2')));
    result = await mutate(
      base,
      '/api/projects/1/members/2',
      admin.headers,
      { version: 2, access: 'viewer' },
      'PUT',
    );
    assert.equal(result.status, 200);
    assert.equal(
      result.body.items.find((x: { user: { id: number } }) => x.user.id === 2).assignee_eligible,
      false,
    );
    assert.equal(
      (await mutate(base, '/api/projects/1', member.headers, { version: 3, name: 'Not allowed' }))
        .status,
      403,
    );
    const conflict = await mutate(
      base,
      '/api/projects/1/members/2',
      admin.headers,
      { version: 1 },
      'DELETE',
    );
    assert.equal(conflict.status, 409);
    assert.equal(conflict.body.error.currentVersion, 3);
    assert.equal(
      (await mutate(base, '/api/projects/1/members/2', admin.headers, { version: 3 }, 'DELETE'))
        .status,
      200,
    );
    assert.equal(
      (await fetch(base + '/api/projects/1/members', { headers: { Cookie: member.cookie } }))
        .status,
      404,
    );
    assert.equal(
      (await fetch(base + '/api/projects/2/members', { headers: { Cookie: member.cookie } }))
        .status,
      404,
    );
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=1')),
        )
      )[0]!.assignee_id,
      null,
    );
  }));
test('T020/21 HTTP CSRF/origin/inactive-target/immutable owner/unknown fields reject without side effects', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      before = await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')));
    assert.equal(
      (
        await mutate(
          base,
          '/api/teams/1',
          { ...admin.headers, 'X-CSRF-Token': 'x'.repeat(64) },
          { version: 1, name: 'No' },
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await mutate(
          base,
          '/api/teams/1',
          { ...admin.headers, Origin: 'https://foreign.invalid' },
          { version: 1, name: 'No' },
        )
      ).status,
      403,
    );
    assert.equal(
      (await mutate(base, '/api/projects/1', admin.headers, { version: 1, owner_team_id: 2 }))
        .status,
      422,
    );
    assert.equal(
      (await mutate(base, '/api/teams/1', admin.headers, { version: 1, lead_user_id: 2 })).status,
      422,
    );
    await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=2')));
    assert.equal(
      (
        await mutate(
          base,
          '/api/projects/1/members/2',
          admin.headers,
          { version: 1, access: 'editor' },
          'PUT',
        )
      ).status,
      422,
    );
    assert.deepEqual(
      await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events'))),
      before,
    );
  }));
