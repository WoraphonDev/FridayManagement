import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../../src/api/app.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { parseConfiguration } from '../../src/config/config.js';
import { sqliteFixture } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { retentionService } from '../../src/services/retention.js';
import { myWorkFilters, taskParameters } from '../../frontend/src/task-list.js';
import { myWorkGroup } from '../../frontend/src/task-dates.js';
// T-083–T-087 local SQLite HTTP evidence for AT-34/35/36/38 (SQL Server NOT_RUN here).
const origin = 'https://addendum.invalid';
type F = Awaited<ReturnType<typeof sessionFixture>>;
async function fixture(work: (base: string, f: F, root: string) => Promise<void>) {
  const f = await sessionFixture(sqliteFixture),
    root = await mkdtemp(join(tmpdir(), 'friday-addendum-'));
  const config = parseConfiguration({
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    DATA_DIR: root,
    LOG_DIR: join(root, 'log'),
    SQLITE_DB_PATH: join(root, 'fixture.sqlite'),
    APP_ORIGIN: origin,
    COOKIE_SECURE: 'true',
  });
  const server = createApp(
    undefined,
    config,
    await sessionHooks(f.db, {
      clock: f.clock,
      cookieSecure: true,
      storage: { directory: root, maxFileBytes: 10485760, totalUploadBytes: 1024 * 1024 * 20 },
    }),
  ).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const a = server.address();
  assert(a && typeof a === 'object');
  try {
    await work(`http://127.0.0.1:${a.port}`, f, root);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
    await f.close();
    await rm(root, { recursive: true, force: true });
  }
}
async function login(base: string, username = 'Admin') {
  const r = await fetch(base + '/api/login', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  assert.equal(r.status, 200);
  const self = await r.json();
  return {
    Origin: origin,
    Cookie: r.headers.get('set-cookie')!.split(';')[0]!,
    'X-CSRF-Token': String(self.csrf),
  };
}
type H = Awaited<ReturnType<typeof login>>;
async function call(base: string, h: H, path: string, method = 'GET', body?: unknown) {
  const r = await fetch(base + path, {
    method,
    headers:
      method === 'GET'
        ? { Cookie: h.Cookie }
        : {
            ...h,
            'Content-Type': 'application/json',
            ...(method === 'POST' ? { 'Idempotency-Key': randomUUID() } : {}),
          },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: r.status, body: await r.json() };
}
async function upload(
  base: string,
  h: H,
  path: string,
  name = 'plan.txt',
  bytes = Buffer.from('project plan'),
) {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)]), name);
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { ...h, 'Idempotency-Key': randomUUID() },
    body: form,
  });
  return { status: r.status, body: await r.json() };
}
const db = (f: F, query: string, parameters = {}) =>
  f.db.transaction((tx) => tx.query(sql(query, parameters)));

test('AT-34 My overview numbers match My work scope and switch at Bangkok midnight', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 1 });
    // 2026-10-06T16:59Z = 23:59 Bangkok on Tue 6 Oct; week Mon 5 – Sun 11 Oct.
    f.setTime('2026-10-06T16:59:00.000Z');
    await db(f, "UPDATE dbo.tasks SET assignee_id=2,due_date='2026-10-06' WHERE id=1");
    await db(f, "UPDATE dbo.tasks SET assignee_id=2,due_date='2026-10-07' WHERE id=2");
    await f.db.transaction(async (tx) => {
      for (const id of [1, 2])
        await tx.execute(
          sql('INSERT INTO dbo.task_assignees(task_id,user_id) VALUES(@id,2)', { id }),
        );
    });
    const member2 = await login(base, 'Member');
    let o = await call(base, member2, '/api/me/overview');
    assert.equal(o.status, 200);
    assert.equal(o.body.bangkok_today, '2026-10-06');
    assert.equal(o.body.due_today, 1);
    assert.equal(o.body.overdue, 0);
    // "This week" is the rest of the week after today, like the My work group.
    assert.equal(o.body.due_this_week, 1);
    assert.equal(o.body.next_up[0].id, 1);
    const mine = await call(base, member2, '/api/tasks?assignee=2&pageSize=100');
    assert.equal(
      o.body.open_total,
      mine.body.items.filter((t: { status: string }) => t.status !== 'done').length,
    );
    f.setTime('2026-10-06T17:00:00.000Z');
    o = await call(base, member2, '/api/me/overview');
    assert.equal(o.body.bangkok_today, '2026-10-07');
    assert.equal(o.body.overdue, 1);
    assert.equal(o.body.due_today, 1);
    // Access revoked → numbers drop with the same scope (no leakage).
    const admin2 = await login(base);
    assert.equal(
      (await call(base, admin2, '/api/projects/1/members/2', 'DELETE', { version: 2 })).status,
      200,
    );
    assert.equal((await call(base, member2, '/api/me/overview')).body.open_total, 0);
    void member;
  }));

test('AT-34 every Home widget equals the My work query it links to; assigned/created toggle', () =>
  fixture(async (base, f) => {
    const admin = await login(base);
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 1 });
    // Wed 7 Oct 10:00 Bangkok; week Mon 5 – Sun 11 Oct; "done in 7 days" = 1–7 Oct.
    f.setTime('2026-10-07T03:00:00.000Z');
    await db(f, "UPDATE dbo.tasks SET due_date='2026-10-06' WHERE id=1");
    await db(f, "UPDATE dbo.tasks SET due_date='2026-10-07' WHERE id=2");
    const rows: [string, string | null, string, string | null, number][] = [
      ['this week', '2026-10-09', 'doing', null, 1],
      ['next week', '2026-10-13', 'review', null, 1],
      ['later', '2026-10-30', 'todo', null, 1],
      ['no date', null, 'todo', null, 1],
      ['done 1 Oct Bangkok', '2026-10-01', 'done', '2026-09-30T17:30:00.000Z', 1],
      ['done 30 Sep Bangkok', '2026-09-30', 'done', '2026-09-30T16:30:00.000Z', 1],
      ['created by member, assigned to Admin', '2026-10-08', 'todo', null, 2],
    ];
    for (const [title, due, status, completed, creator] of rows)
      await db(
        f,
        'INSERT INTO dbo.tasks(project_id,title,creator_id,due_date,status,completed_at) VALUES(1,@title,@creator,@due,@status,@completed)',
        { title, creator, due, status, completed },
      );
    await f.db.transaction(async (tx) => {
      for (let id = 1; id <= 9; id++)
        await tx.execute(
          sql('INSERT INTO dbo.task_assignees(task_id,user_id) VALUES(@id,@user)', {
            id,
            user: id === 9 ? 1 : 2,
          }),
        );
    });
    const member = await login(base, 'Member');
    const o = (await call(base, member, '/api/me/overview')).body;
    assert.equal(o.bangkok_today, '2026-10-07');
    const listed = async (search: string, created = false) => {
      const { query, empty } = taskParameters(myWorkFilters(search), o.bangkok_today, {
        self: 2,
        created,
      });
      assert.equal(empty, false, search);
      query.set('pageSize', '100');
      const r = await call(base, member, `/api/tasks?${query}`);
      assert.equal(r.status, 200, search);
      return r.body.items as { id: number; status: string; due_date: string | null }[];
    };
    // Widget value === row count of the exact My work link (MyOverview.tsx).
    const expected: [string, number, number[]][] = [
      ['?range=overdue', o.overdue, [1]],
      ['?range=today', o.due_today, [2]],
      ['?range=this_week', o.due_this_week, [3]],
      ['?range=none', o.no_date, [6]],
      ['?completed_from=2026-10-01', o.done_last_7_days, [7]],
    ];
    for (const [search, value, ids] of expected) {
      const items = await listed(search);
      assert.deepEqual(items.map((t) => t.id).sort(), ids, search);
      assert.equal(value, ids.length, search);
    }
    for (const s of ['todo', 'doing', 'review', 'done'])
      assert.equal((await listed(`?status=${s}`)).length, o.by_status[s], s);
    assert.deepEqual(o.by_project, [
      { project_id: 1, project_name: o.by_project[0].project_name, open_count: 6 },
    ]);
    assert.equal((await listed('?project=1')).filter((t) => t.status !== 'done').length, 6);
    assert.equal(o.open_total, 6);
    assert.deepEqual(
      o.next_up.map((t: { id: number }) => t.id),
      [1, 2, 3, 4, 5],
    );
    // Grouped table buckets agree with the widgets.
    const all = await listed('');
    const count = (g: string) =>
      all.filter((t) => myWorkGroup(t as never, o.bangkok_today) === g).length;
    assert.deepEqual(
      [
        count('overdue'),
        count('today'),
        count('this_week'),
        count('next_week'),
        count('later'),
        count('none'),
        count('done'),
      ],
      [o.overdue, o.due_today, o.due_this_week, 1, 1, o.no_date, 2],
    );
    // Toggle "Created by me" switches the scope to creator.
    assert.deepEqual(
      (await listed('', true)).map((t) => t.id),
      [9],
    );
    // Forged link values are dropped instead of widening the query.
    assert.deepEqual(
      myWorkFilters('?range=all&status=blocked&project=0&completed_from=x'),
      myWorkFilters(''),
    );
  }));
test('AT-35 Docs: sanitize XSS, Viewer read-only, 409 + history, own/P-05 delete, restore, purge', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'viewer', version: 1 });
    const created = await call(base, admin, '/api/projects/1/docs', 'POST', {
      title: 'Spec',
      body_html:
        '<h1>Plan</h1><script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a><p onclick="x">ok</p>',
    });
    assert.equal(created.status, 201);
    const doc = created.body.item;
    assert.equal(doc.body_html, '<h1>Plan</h1><a>x</a><p>ok</p>');
    assert.equal((await call(base, member, `/api/docs/${doc.id}`)).body.item.can_edit, false);
    assert.equal(
      (await call(base, member, `/api/docs/${doc.id}`, 'PATCH', { title: 'No', version: 1 }))
        .status,
      403,
    );
    assert.equal(
      (await call(base, member, '/api/projects/1/docs', 'POST', { title: 'No' })).status,
      403,
    );
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 2 });
    const edited = await call(base, member, `/api/docs/${doc.id}`, 'PATCH', {
      body_html: '<p>v2</p>',
      version: 1,
    });
    assert.equal(edited.status, 200);
    assert.equal(edited.body.item.version, 2);
    const stale = await call(base, admin, `/api/docs/${doc.id}`, 'PATCH', {
      title: 'Old',
      version: 1,
    });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.currentVersion, 2);
    const versions = await call(base, member, `/api/docs/${doc.id}/versions`);
    assert.deepEqual(
      versions.body.items.map((v: { version: number }) => v.version),
      [2, 1],
    );
    // Editor cannot delete another person's doc without P-05; owner/Admin can.
    assert.equal(
      (await call(base, member, `/api/docs/${doc.id}`, 'DELETE', { version: 2 })).status,
      403,
    );
    const big = await call(base, admin, '/api/projects/1/docs', 'POST', {
      title: 'Big',
      body_html: '<p>' + 'x'.repeat(200001) + '</p>',
    });
    assert.equal(big.status, 422);
    const deleted = await call(base, admin, `/api/docs/${doc.id}`, 'DELETE', { version: 2 });
    assert.equal(deleted.status, 200);
    assert.equal((await call(base, member, `/api/docs/${doc.id}`)).status, 404);
    assert.equal((await call(base, member, '/api/projects/1/docs')).body.items.length, 0);
    assert.equal(
      (await call(base, admin, '/api/projects/1/docs?includeDeleted=true')).body.items.length,
      1,
    );
    const restored = await call(base, admin, `/api/docs/${doc.id}/restore`, 'POST', { version: 3 });
    assert.equal(restored.status, 200);
    assert.equal(restored.body.item.deleted_at, null);
    // Retention purge after 30 days removes doc + history.
    await call(base, admin, `/api/docs/${doc.id}`, 'DELETE', { version: 4 });
    await db(f, "UPDATE dbo.project_docs SET deleted_at='2026-09-01T00:00:00.000Z'");
    const retention = await retentionService(
      f.db,
      {
        directory: await mkdtemp(join(tmpdir(), 'friday-ret-')),
        maxFileBytes: 10,
        totalUploadBytes: 10,
      },
      { clock: f.clock },
    );
    await retention.run();
    assert.equal((await db(f, 'SELECT id FROM dbo.project_docs')).length, 0);
    assert.equal((await db(f, 'SELECT id FROM dbo.project_doc_versions')).length, 0);
  }));

test('AT-35 Docs boundaries, concurrent save, manager P-05, 30-day window, archived, audit', () =>
  fixture(async (base, f) => {
    f.setTime('2026-10-01T00:00:00.000Z');
    const admin = await login(base);
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 1 });
    const member = await login(base, 'Member');
    // Title ≤200 UTF-16 units and ≤200,000 text characters after sanitize.
    const title200 = 'ก'.repeat(200);
    const max = await call(base, admin, '/api/projects/1/docs', 'POST', {
      title: title200,
      body_html: '<p>' + 'x'.repeat(199999) + '<script>' + 'y'.repeat(5000) + '</script>z</p>',
    });
    assert.equal(max.status, 201);
    assert.equal(max.body.item.title, title200);
    assert.equal(max.body.item.text_length, 200000);
    for (const body of [
      { title: 'ก'.repeat(201) },
      { title: '   ' },
      { title: 'Over', body_html: '<p>' + 'x'.repeat(200000) + '&amp;</p>' },
    ])
      assert.equal((await call(base, admin, '/api/projects/1/docs', 'POST', body)).status, 422);
    const doc = (
      await call(base, admin, '/api/projects/1/docs', 'POST', {
        title: 'Shared',
        body_html: '<p>v1</p>',
      })
    ).body.item;
    // Two editors save from the same version at once: exactly one wins, the other gets 409.
    const [a, b] = await Promise.all([
      call(base, admin, `/api/docs/${doc.id}`, 'PATCH', { body_html: '<p>admin</p>', version: 1 }),
      call(base, member, `/api/docs/${doc.id}`, 'PATCH', {
        body_html: '<p>member</p>',
        version: 1,
      }),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    const loser = a.status === 409 ? a : b,
      winner = a.status === 200 ? a : b;
    assert.equal(loser.body.error.currentVersion, 2);
    const latest = (await call(base, admin, `/api/docs/${doc.id}`)).body.item;
    assert.equal(latest.body_html, winner.body.item.body_html);
    assert.deepEqual(
      (await call(base, member, `/api/docs/${doc.id}/versions`)).body.items.map(
        (v: { version: number }) => v.version,
      ),
      [2, 1],
    );
    // Editor deletes/restores only own docs.
    const own = (await call(base, member, '/api/projects/1/docs', 'POST', { title: 'Mine' })).body
      .item;
    assert.equal(own.can_delete, true);
    assert.equal(
      (await call(base, member, `/api/docs/${own.id}`, 'DELETE', { version: 1 })).status,
      200,
    );
    assert.equal(
      (await call(base, member, `/api/docs/${own.id}/restore`, 'POST', { version: 2 })).status,
      200,
    );
    assert.equal((await call(base, member, `/api/docs/${doc.id}`)).body.item.can_delete, false);
    // Manager without P-05 edits but cannot delete others' docs; with P-05 can.
    let perms = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-01'],
      permissions_version: 1,
    });
    assert.equal(perms.status, 200);
    assert.equal(
      (
        await call(base, admin, '/api/projects/1/members/2', 'PUT', {
          access: 'manager',
          version: 2,
        })
      ).status,
      200,
    );
    let m = await login(base, 'Member');
    let item = (await call(base, m, `/api/docs/${doc.id}`)).body.item;
    assert.deepEqual([item.can_edit, item.can_delete], [true, false]);
    assert.equal(
      (await call(base, m, `/api/docs/${doc.id}`, 'DELETE', { version: 2 })).status,
      403,
    );
    perms = await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-01', 'P-05'],
      permissions_version: 2,
    });
    assert.equal(perms.status, 200);
    item = (await call(base, m, `/api/docs/${doc.id}`)).body.item;
    assert.equal(item.can_delete, true);
    assert.equal(
      (await call(base, m, `/api/docs/${doc.id}`, 'DELETE', { version: 2 })).status,
      200,
    );
    // Restore window: 29 days later restorable; at exactly 30×24h it is expired.
    f.setTime('2026-10-30T00:00:00.000Z');
    // Sessions expire across these jumps, so sign in again at each instant.
    m = await login(base, 'Member');
    assert.equal((await call(base, m, `/api/docs/${doc.id}`)).body.item.can_restore, true);
    assert.equal(
      (await call(base, m, `/api/docs/${doc.id}/restore`, 'POST', { version: 3 })).status,
      200,
    );
    assert.equal(
      (await call(base, m, `/api/docs/${doc.id}`, 'DELETE', { version: 4 })).status,
      200,
    );
    f.setTime('2026-11-29T00:00:00.000Z');
    m = await login(base, 'Member');
    const expired = await call(base, m, `/api/docs/${doc.id}/restore`, 'POST', { version: 5 });
    assert.deepEqual([expired.status, expired.body.error.code], [422, 'RETENTION_EXPIRED']);
    f.setTime('2026-11-30T00:00:00.000Z');
    const admin3 = await login(base);
    assert.equal(
      (await call(base, admin3, '/api/projects/1/docs?includeDeleted=true')).body.items.some(
        (d: { id: number }) => d.id === doc.id,
      ),
      false,
    );
    // Delete/restore are audited without the doc body.
    const audit = await db(
      f,
      "SELECT action,actor_id,redacted_changes FROM dbo.admin_events WHERE resource_type='project_doc' ORDER BY id",
    );
    assert.deepEqual(
      audit.map((r) => [r.action, r.actor_id]),
      [
        ['doc_deleted', 2],
        ['doc_restored', 2],
        ['doc_deleted', 2],
        ['doc_restored', 2],
        ['doc_deleted', 2],
      ],
    );
    assert.ok(audit.every((r) => !String(r.redacted_changes).includes('body')));
    // Archived project: docs are read-only for everyone.
    await db(f, "UPDATE dbo.projects SET archived_at='2026-11-30T00:00:00.000Z' WHERE id=1");
    const a2 = await login(base);
    const ro = (await call(base, a2, `/api/docs/${own.id}`)).body.item;
    assert.deepEqual([ro.can_edit, ro.can_delete], [false, false]);
    for (const r of [
      await call(base, a2, `/api/docs/${own.id}`, 'PATCH', { title: 'No', version: 3 }),
      await call(base, a2, '/api/projects/1/docs', 'POST', { title: 'No' }),
    ])
      assert.deepEqual([r.status, r.body.error.code], [422, 'PROJECT_ARCHIVED']);
  }));
test('AT-36 Project files: upload with validation/quota, merged list, own/P-06 delete, restore, safe download', () =>
  fixture(async (base, f, root) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 1 });
    const own = await upload(base, member, '/api/projects/1/files', 'แผน.txt');
    assert.equal(own.status, 201);
    assert.equal(own.body.item.source, 'project');
    assert.equal((await upload(base, member, '/api/projects/1/files', 'evil.exe')).status, 422);
    const adminFile = await upload(base, admin, '/api/projects/1/files', 'boss.txt');
    const task = await upload(base, admin, '/api/tasks/1/attachments', 'task.txt');
    assert.equal(task.status, 201);
    const list = await call(base, member, '/api/projects/1/files');
    assert.equal(list.body.total, 3);
    assert.deepEqual(
      new Set(list.body.items.map((i: { source: string }) => i.source)),
      new Set(['project', 'task']),
    );
    assert.equal((await call(base, member, '/api/projects/1/files?source=task')).body.total, 1);
    assert.equal(
      (await call(base, member, '/api/projects/1/files?q=%E0%B9%81%E0%B8%9C%E0%B8%99')).body.total,
      1,
    );
    const download = await fetch(`${base}/api/project-files/${own.body.item.id}/download`, {
      headers: { Cookie: member.Cookie },
    });
    assert.equal(download.status, 200);
    assert.match(download.headers.get('content-disposition')!, /^attachment;/);
    assert.equal(download.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(await download.text(), 'project plan');
    assert.equal(
      (await call(base, member, `/api/project-files/${adminFile.body.item.id}`, 'DELETE')).status,
      403,
    );
    assert.equal(
      (await call(base, member, `/api/project-files/${own.body.item.id}`, 'DELETE')).status,
      200,
    );
    assert.equal((await call(base, member, '/api/projects/1/files')).body.total, 2);
    assert.equal(
      (await call(base, member, `/api/project-files/${own.body.item.id}/restore`, 'POST')).status,
      200,
    );
    // P-06 manager may delete others' project files.
    await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-06'],
      permissions_version: 1,
    });
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'manager', version: 2 });
    assert.equal(
      (await call(base, member, `/api/project-files/${adminFile.body.item.id}`, 'DELETE')).status,
      200,
    );
    // Outsider cannot list or download.
    await call(base, admin, '/api/projects/1/members/2', 'DELETE', { version: 3 });
    assert.equal((await call(base, member, '/api/projects/1/files')).status, 404);
    const quota = await db(f, 'SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota');
    assert.equal(quota[0]!.reserved_bytes, 0);
    assert.equal(quota[0]!.stored_bytes, 12 + 12 + Buffer.byteLength('project plan'));
    assert.equal((await readdir(join(root, 'attachments'))).length, 3);
  }));

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
test('AT-36 Files: Viewer, quota boundary, type filter, deleted task hidden, P-06, 30-day window, purge, audit', () =>
  fixture(async (base, f, root) => {
    f.setTime('2026-10-01T00:00:00.000Z');
    const admin = await login(base);
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'viewer', version: 1 });
    let member = await login(base, 'Member');
    // Viewer reads the merged list but cannot upload or open the trash view.
    assert.equal((await upload(base, member, '/api/projects/1/files')).status, 403);
    assert.equal((await call(base, member, '/api/projects/1/files')).status, 200);
    assert.equal(
      (await call(base, member, '/api/projects/1/files?includeDeleted=true')).status,
      403,
    );
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 2 });
    member = await login(base, 'Member');
    const own = (await upload(base, member, '/api/projects/1/files', 'แผน.txt')).body.item;
    const boss = (await upload(base, admin, '/api/projects/1/files', 'boss.txt')).body.item;
    const image = await upload(base, admin, '/api/projects/1/files', 'ผัง.png', png);
    assert.equal(image.status, 201);
    assert.equal(image.body.item.validated_type, 'image/png');
    // Quota boundary: exactly the remaining bytes fit; one more byte does not.
    const total = 1024 * 1024 * 20;
    const stored = Number(
      (await db(f, 'SELECT stored_bytes FROM dbo.storage_quota'))[0]!.stored_bytes,
    );
    await db(f, 'UPDATE dbo.storage_quota SET stored_bytes=@v', { v: total - 12 });
    const fit = await upload(base, member, '/api/projects/1/files', 'fit.txt');
    assert.equal(fit.status, 201);
    const over = await upload(base, member, '/api/projects/1/files', 'over.txt', Buffer.from('x'));
    assert.deepEqual([over.status, over.body.error.code], [422, 'QUOTA_EXCEEDED']);
    assert.equal(
      Number((await db(f, 'SELECT reserved_bytes FROM dbo.storage_quota'))[0]!.reserved_bytes),
      0,
    );
    await db(f, 'UPDATE dbo.storage_quota SET stored_bytes=@v', { v: stored + 12 });
    // Type filter and source column.
    const byType = async (type: string) =>
      (await call(base, member, `/api/projects/1/files?type=${type}`)).body.total;
    assert.deepEqual(
      [await byType('image'), await byType('document'), await byType('pdf')],
      [1, 3, 0],
    );
    // Attachments of a deleted task disappear from the project list.
    await upload(base, admin, '/api/tasks/2/attachments', 'task.txt');
    assert.equal((await call(base, member, '/api/projects/1/files?source=task')).body.total, 1);
    assert.equal((await call(base, admin, '/api/tasks/2', 'DELETE', { version: 1 })).status, 200);
    assert.equal((await call(base, member, '/api/projects/1/files?source=task')).body.total, 0);
    // Manager without P-06 cannot delete others' files.
    await call(base, admin, '/api/users/2/permissions', 'PUT', {
      keys: ['P-01'],
      permissions_version: 1,
    });
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'manager', version: 3 });
    member = await login(base, 'Member');
    assert.equal((await call(base, member, `/api/project-files/${boss.id}`, 'DELETE')).status, 403);
    // Own file: delete, restore after 29 days, expire at exactly 30×24h.
    assert.equal((await call(base, member, `/api/project-files/${own.id}`, 'DELETE')).status, 200);
    const trashList = await call(base, member, '/api/projects/1/files?includeDeleted=true');
    assert.equal(
      trashList.body.items.find(
        (i: { id: number; source: string }) => i.source === 'project' && i.id === own.id,
      ).can_restore,
      true,
    );
    f.setTime('2026-10-30T00:00:00.000Z');
    member = await login(base, 'Member');
    assert.equal(
      (await call(base, member, `/api/project-files/${own.id}/restore`, 'POST')).status,
      200,
    );
    assert.equal((await call(base, member, `/api/project-files/${own.id}`, 'DELETE')).status, 200);
    f.setTime('2026-11-29T00:00:00.000Z');
    member = await login(base, 'Member');
    const expired = await call(base, member, `/api/project-files/${own.id}/restore`, 'POST');
    assert.deepEqual([expired.status, expired.body.error.code], [422, 'RETENTION_EXPIRED']);
    // Deleted bytes count toward quota until purge; purge unlinks and releases them.
    const before = Number(
      (await db(f, 'SELECT stored_bytes FROM dbo.storage_quota'))[0]!.stored_bytes,
    );
    const filesBefore = (await readdir(join(root, 'attachments'))).length;
    const retention = await retentionService(
      f.db,
      { directory: root, maxFileBytes: 10485760, totalUploadBytes: total },
      { clock: f.clock },
    );
    await retention.run();
    assert.equal(
      (await db(f, 'SELECT id FROM dbo.project_files WHERE id=@id', { id: own.id })).length,
      0,
    );
    assert.equal(
      Number((await db(f, 'SELECT stored_bytes FROM dbo.storage_quota'))[0]!.stored_bytes),
      // own file + the deleted task's attachment both passed 30×24h.
      before - 24,
    );
    assert.ok((await readdir(join(root, 'attachments'))).length < filesBefore);
    // Outsider: 404 for list and download.
    const admin2 = await login(base);
    await call(base, admin2, '/api/projects/1/members/2', 'DELETE', { version: 4 });
    member = await login(base, 'Member');
    assert.equal((await call(base, member, '/api/projects/1/files')).status, 404);
    const r = await fetch(`${base}/api/project-files/${boss.id}/download`, {
      headers: { Cookie: member.Cookie },
    });
    assert.equal(r.status, 404);
    const audit = await db(
      f,
      "SELECT action FROM dbo.admin_events WHERE resource_type='project_file' ORDER BY id",
    );
    assert.deepEqual(
      audit.map((a) => a.action),
      ['project_file_deleted', 'project_file_restored', 'project_file_deleted'],
    );
  }));
test('AT-38 batch: per-item outcomes without silent partial updates; @mention notifies only project users', () =>
  fixture(async (base, f) => {
    const admin = await login(base),
      member = await login(base, 'Member');
    await call(base, admin, '/api/projects/1/members/2', 'PUT', { access: 'editor', version: 1 });
    const result = await call(base, admin, '/api/tasks/batch', 'POST', {
      operation: 'patch',
      patch: { status: 'doing' },
      items: [
        { id: 1, version: 1 },
        { id: 2, version: 9 },
        { id: 999, version: 1 },
      ],
    });
    assert.equal(result.status, 200);
    assert.deepEqual(
      result.body.results.map((r: { outcome: string }) => r.outcome),
      ['updated', 'conflict', 'not_found'],
    );
    assert.equal(result.body.results[1].current_version, 1);
    const rows = await db(f, 'SELECT id,status,version FROM dbo.tasks ORDER BY id');
    assert.deepEqual(
      rows.map((r) => [r.status, r.version]),
      [
        ['doing', 2],
        ['todo', 1],
      ],
    );
    // Member cannot delete Admin's task: forbidden item, other item still deleted? none of them own.
    const del = await call(base, member, '/api/tasks/batch', 'POST', {
      operation: 'delete',
      items: [{ id: 2, version: 1 }],
    });
    assert.deepEqual(
      del.body.results.map((r: { outcome: string }) => r.outcome),
      ['forbidden'],
    );
    assert.equal((await db(f, 'SELECT deleted_at FROM dbo.tasks WHERE id=2'))[0]!.deleted_at, null);
    assert.equal(
      (
        await call(base, admin, '/api/tasks/batch', 'POST', {
          operation: 'delete',
          patch: { status: 'done' },
          items: [{ id: 2, version: 1 }],
        })
      ).status,
      422,
    );
    // Mention: Member (project editor) is notified; mention of an outsider id 1? Admin always has access.
    await db(
      f,
      "INSERT INTO dbo.users(username,display_name,password_hash,org_role,must_change_password) VALUES('Outsider','Out','x','member',0)",
    );
    const comment = await call(base, admin, '/api/tasks/2/comments', 'POST', {
      body: 'Please check @[Member](#user-2) and @[Out](#user-3)',
    });
    assert.equal(comment.status, 201);
    const notes = await db(
      f,
      "SELECT recipient_id FROM dbo.notifications WHERE type='comment' ORDER BY recipient_id",
    );
    assert.deepEqual(
      notes.map((n) => n.recipient_id),
      [2],
    );
  }));
