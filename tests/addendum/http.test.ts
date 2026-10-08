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
    assert.equal(o.body.due_this_week, 2);
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
