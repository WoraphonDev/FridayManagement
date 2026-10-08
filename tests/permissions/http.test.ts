import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
// T-080/T-081/T-082 local SQLite HTTP evidence for AT-31/AT-32/AT-33 (SQL Server NOT_RUN here).
const origin = 'https://permissions.invalid',
  basic = { Origin: origin, 'Content-Type': 'application/json' };
const config = parseConfiguration({
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: '/private/tmp/permissions-http',
  LOG_DIR: '/private/tmp/permissions-log',
  SQLITE_DB_PATH: '/private/tmp/permissions-http/fixture.sqlite',
  APP_ORIGIN: origin,
  COOKIE_SECURE: 'true',
});
type F = Awaited<ReturnType<typeof sessionFixture>>;
async function fixture(work: (base: string, f: F) => Promise<void>) {
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
type Session = Awaited<ReturnType<typeof login>>;
async function call(base: string, s: Session, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(base + path, {
    method,
    headers:
      method === 'GET'
        ? { Cookie: s.cookie }
        : {
            ...s.headers,
            ...(['POST'].includes(method) ? { 'Idempotency-Key': randomUUID() } : {}),
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  return { status: response.status, body: text && text[0] !== '﻿' ? JSON.parse(text) : text };
}
const projectVersion = async (f: F, id = 1) =>
  Number(
    (
      await f.db.transaction((tx) =>
        tx.query(sql('SELECT version FROM dbo.projects WHERE id=@id', { id })),
      )
    )[0]!.version,
  );
const audits = async (f: F, action: string) =>
  f.db.transaction((tx) =>
    tx.query<{ redacted_changes: string }>(
      sql('SELECT redacted_changes FROM dbo.admin_events WHERE action=@action ORDER BY id', {
        action,
      }),
    ),
  );

test('AT-31 job titles: CRUD/audit, label in members/report/CSV, filters, rights unchanged', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const listed = await call(base, member, '/api/job-titles');
    assert.equal(listed.status, 200);
    assert.deepEqual(
      listed.body.items.map((t: { name: string }) => t.name),
      ['PM', 'SM', 'BA', 'SA', 'Dev', 'Tester'],
    );
    const pm = listed.body.items[0];
    assert.equal((await call(base, member, '/api/job-titles', 'POST', { name: 'QA' })).status, 403);
    const created = await call(base, admin, '/api/job-titles', 'POST', {
      name: 'QA Lead',
      color: '#123abc',
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.item.user_count, 0);
    const duplicate = await call(base, admin, '/api/job-titles', 'POST', { name: 'pm' });
    assert.equal(duplicate.status, 422);
    assert(duplicate.body.error.fieldErrors.name);
    // Baseline rights of the Member before any title assignment.
    const before = await call(base, member, '/api/projects');
    assert.equal(before.body.total, 0);
    const assigned = await call(base, admin, '/api/users/2', 'PATCH', {
      job_title_id: pm.id,
      version: 1,
    });
    assert.equal(assigned.status, 200);
    assert.equal(assigned.body.item.job_title, 'PM');
    assert.deepEqual(assigned.body.item.permission_keys, []);
    // BR-19/BR-21: a PM title grants nothing and keeps the session alive.
    assert.equal((await call(base, member, '/api/me')).status, 200);
    assert.equal((await call(base, member, '/api/projects')).body.total, 0);
    assert.equal(
      (await call(base, member, '/api/projects', 'POST', { owner_team_id: 1, name: 'X' })).status,
      403,
    );
    assert.equal((await call(base, member, '/api/users/2/permissions')).body.keys.length, 0);
    const filtered = await call(base, admin, `/api/users?job_title=${pm.id}`);
    assert.deepEqual(
      filtered.body.items.map((u: { id: number }) => u.id),
      [2],
    );
    // Deactivated titles stay on users but cannot be newly assigned.
    const off = await call(base, admin, `/api/job-titles/${created.body.item.id}`, 'PATCH', {
      is_active: false,
      version: 1,
    });
    assert.equal(off.status, 200);
    assert.equal(off.body.item.is_active, false);
    assert.equal(
      (
        await call(base, admin, '/api/users/2', 'PATCH', {
          job_title_id: created.body.item.id,
          version: 2,
        })
      ).status,
      422,
    );
    assert.equal(
      (
        await call(base, admin, `/api/job-titles/${created.body.item.id}`, 'PATCH', {
          name: 'Y',
          version: 1,
        })
      ).status,
      409,
    );
    assert.equal(
      (await call(base, member, '/api/job-titles?includeInactive=true')).body.items.length,
      7,
    );
    assert.equal((await call(base, member, '/api/job-titles')).body.items.length, 6);
    // Member label in project members, report workload and CSV.
    assert.equal(
      (
        await call(base, admin, '/api/projects/1/members/2', 'PUT', {
          access: 'editor',
          version: 1,
        })
      ).status,
      200,
    );
    await f.db.transaction((tx) =>
      tx.execute(
        sql('UPDATE dbo.tasks SET assignee_id=2,created_at=@at', {
          at: '2026-10-06T00:00:00.000Z',
        }),
      ),
    );
    const members = await call(base, admin, '/api/projects/1/members');
    assert.equal(
      members.body.items.find((m: { user: { id: number } }) => m.user.id === 2).job_title,
      'PM',
    );
    const range = 'date_from=2026-10-01&date_to=2026-10-31';
    const report = await call(base, admin, `/api/reports/summary?${range}&job_title=${pm.id}`);
    assert.equal(report.status, 200);
    assert.equal(report.body.total, 2);
    assert.equal(report.body.workload[0].job_title, 'PM');
    assert.equal(
      (await call(base, admin, `/api/reports/summary?${range}&job_title=${created.body.item.id}`))
        .body.total,
      0,
    );
    const csv = await fetch(`${base}/api/export/tasks.csv?${range}`, {
      headers: { Cookie: admin.cookie },
    });
    assert.equal(csv.status, 200);
    const lines = (await csv.text()).split('\r\n');
    assert.match(lines[0]!, /"assignee","assignee_job_title"/);
    assert.match(lines[1]!, /"ผู้ทดสอบ","PM"/);
    assert.equal((await audits(f, 'job_title_created')).length, 1);
    assert.equal((await audits(f, 'job_title_updated')).length, 1);
    assert.equal((await audits(f, 'user_job_title_changed')).length, 1);
  }));

test('AT-32 permissions: deny-by-default, per-key manager rights, self/non-Admin 403, BR-22 demotion', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const catalog = await call(base, member, '/api/permissions/catalog');
    assert.equal(catalog.body.items.length, 10);
    assert.equal((await call(base, member, '/api/users/2/permissions')).status, 200);
    assert.equal((await call(base, member, '/api/users/1/permissions')).status, 403);
    assert.equal(
      (
        await call(base, member, '/api/users/2/permissions', 'PUT', {
          keys: ['P-01'],
          permissions_version: 1,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(base, admin, '/api/users/1/permissions', 'PUT', {
          keys: ['P-01'],
          permissions_version: 1,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(base, admin, '/api/users/2/permissions', 'PUT', {
          keys: ['P-11'],
          permissions_version: 1,
        })
      ).status,
      422,
    );
    assert.equal((await call(base, admin, '/api/users/99/permissions')).status, 404);
    // Manager appointment requires a P-01–P-07 key.
    const noKey = await call(base, admin, '/api/projects/1/members/2', 'PUT', {
      access: 'manager',
      version: 1,
    });
    assert.equal(noKey.status, 422);
    let put = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-01'],
      permissions_version: 1,
    });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body.keys, ['P-01']);
    assert.equal(put.body.permissions_version, 2);
    const stale = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: [],
      permissions_version: 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.currentVersion, 2);
    assert.equal(
      (
        await call(base, admin, '/api/projects/1/members/2', 'PUT', {
          access: 'manager',
          version: 1,
        })
      ).status,
      200,
    );
    const mine = await call(base, member, '/api/projects');
    assert.equal(mine.body.items[0].effective_access, 'manager');
    // P-01 edits name, never archives.
    let v = await projectVersion(f);
    assert.equal(
      (
        await call(base, member, '/api/projects/1', 'PATCH', {
          name: 'Renamed by manager',
          version: v,
        })
      ).status,
      200,
    );
    v = await projectVersion(f);
    assert.equal(
      (await call(base, member, '/api/projects/1', 'PATCH', { archived: true, version: v })).status,
      403,
    );
    // P-03 not ticked: membership changes denied; P-04 not ticked: others' tasks protected.
    assert.equal(
      (
        await call(base, member, '/api/projects/1/members/1', 'PUT', {
          access: 'viewer',
          version: v,
        })
      ).status,
      403,
    );
    assert.equal((await call(base, member, '/api/tasks/1', 'DELETE', { version: 1 })).status, 403);
    assert.equal((await call(base, member, '/api/trash')).status, 403);
    put = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-01', 'P-03', 'P-04'],
      permissions_version: 2,
    });
    assert.equal(put.status, 200);
    // Effective immediately, same session; P-03 never appoints a manager.
    assert.equal(
      (
        await call(base, member, '/api/projects/1/members/1', 'PUT', {
          access: 'manager',
          version: v,
        })
      ).status,
      403,
    );
    const viewer = await call(base, member, '/api/projects/1/members/1', 'PUT', {
      access: 'viewer',
      version: v,
    });
    assert.equal(viewer.status, 200);
    const deleted = await call(base, member, '/api/tasks/1', 'DELETE', { version: 1 });
    assert.equal(deleted.status, 200);
    assert.equal((await call(base, member, '/api/trash')).body.total, 1);
    assert.equal(
      (await call(base, member, '/api/tasks/1/restore', 'POST', { version: 2 })).status,
      200,
    );
    // Another manager cannot be demoted by a P-03 manager; only Admin/Lead.
    await f.db.transaction((tx) =>
      tx.execute(sql("UPDATE dbo.project_members SET access='manager' WHERE user_id=1")),
    );
    assert.equal(
      (
        await call(base, member, '/api/projects/1/members/1', 'DELETE', {
          version: await projectVersion(f),
        })
      ).status,
      403,
    );
    await f.db.transaction((tx) =>
      tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=1')),
    );
    // BR-22: remove all project keys → manager → editor atomically with audit; rights drop at once.
    put = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-08'],
      permissions_version: 3,
    });
    assert.equal(put.status, 200);
    assert.deepEqual(put.body.manager_project_ids, []);
    assert.equal(
      (await call(base, member, '/api/projects')).body.items[0].effective_access,
      'editor',
    );
    assert.equal(
      (
        await call(base, member, '/api/projects/1', 'PATCH', {
          name: 'No',
          version: await projectVersion(f),
        })
      ).status,
      403,
    );
    const demotion = await audits(f, 'project_membership_changed');
    assert(demotion.some((a) => JSON.parse(a.redacted_changes).reason === 'BR-22'));
    const change = await audits(f, 'user_permissions_changed');
    assert.deepEqual(JSON.parse(change.at(-1)!.redacted_changes), {
      added: ['P-08'],
      removed: ['P-01', 'P-03', 'P-04'],
      demoted_project_ids: [1],
    });
    // P-08 creates only in own teams; creator without project keys stays editor (BR-22 invariant).
    assert.equal(
      (await call(base, member, '/api/projects', 'POST', { owner_team_id: 1, name: 'P08' })).status,
      403,
    );
    assert.equal(
      (
        await call(base, admin, '/api/teams/1/members/2', 'PUT', {
          team_role: 'member',
          version: 1,
        })
      ).status,
      200,
    );
    const editorCreated = await call(base, member, '/api/projects', 'POST', {
      owner_team_id: 1,
      name: 'P08 editor',
    });
    assert.equal(editorCreated.status, 201);
    assert.equal(editorCreated.body.item.effective_access, 'editor');
    await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-02', 'P-08'],
      permissions_version: 4,
    });
    const managerCreated = await call(base, member, '/api/projects', 'POST', {
      owner_team_id: 1,
      name: 'P08 manager',
    });
    assert.equal(managerCreated.body.item.effective_access, 'manager');
    assert.equal(
      (await call(base, member, '/api/projects', 'POST', { owner_team_id: 2, name: 'Other team' }))
        .status,
      403,
    );
  }));

test('AT-33 matrix: Admin only, no self, all-or-nothing, stale 409 per user, own read-only view', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    const body = { changes: [{ user_id: 2, keys: ['P-01', 'P-02'], permissions_version: 1 }] };
    assert.equal((await call(base, member, '/api/permissions/matrix', 'PUT', body)).status, 403);
    assert.equal(
      (
        await call(base, admin, '/api/permissions/matrix', 'PUT', {
          changes: [{ user_id: 1, keys: [], permissions_version: 1 }],
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await call(base, admin, '/api/permissions/matrix', 'PUT', {
          changes: [body.changes[0], body.changes[0]],
        })
      ).status,
      422,
    );
    const saved = await call(base, admin, '/api/permissions/matrix', 'PUT', body);
    assert.equal(saved.status, 200);
    assert.deepEqual(saved.body.items[0].keys, ['P-01', 'P-02']);
    const stale = await call(base, admin, '/api/permissions/matrix', 'PUT', body);
    assert.equal(stale.status, 409);
    assert.deepEqual(Object.keys(stale.body.error.fieldErrors), ['changes.2']);
    const after = await call(base, admin, '/api/users/2/permissions');
    assert.deepEqual(after.body.keys, ['P-01', 'P-02']);
    assert.equal(after.body.permissions_version, 2);
    const me = await call(base, member, '/api/me');
    assert.deepEqual(me.body.user.permission_keys, ['P-01', 'P-02']);
    assert.equal(me.body.user.permissions_version, 2);
    assert.equal((await audits(f, 'user_permissions_changed')).length, 1);
  }));
