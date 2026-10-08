import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { regressionFixture, roles, projects, type RegressionFixture } from './fixture.js';
export function regressionAcceptance(
  label: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: false | string = false,
) {
  const scenario = (name: string, work: (f: RegressionFixture) => Promise<void>) =>
    test(`${label} ${name}`, { skip }, async () => {
      const f = await regressionFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  scenario(
    'T067 fixture roles/project topology, generated hashes, independent reset and Bangkok clock',
    async (f) => {
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.users')))).length,
        7,
      );
      for (const role of roles) await f.login(role);
      const other = await regressionFixture(factory);
      try {
        await f.db.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.tasks SET title=@title WHERE id=@id', {
              title: 'changed only in first',
              id: f.tasks.P1,
            }),
          ),
        );
        const task = (
          await other.db.transaction((tx) =>
            tx.query(sql('SELECT title FROM dbo.tasks WHERE id=@id', { id: other.tasks.P1 })),
          )
        )[0]!;
        assert.equal(task.title, 'P1 synthetic task');
        f.setTime('2026-10-06T17:00:00.000Z');
        assert.equal(
          new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Bangkok',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(f.clock()),
          '2026-10-07',
        );
        assert.equal(other.clock().toISOString(), '2026-10-06T00:00:00.000Z');
        assert.throws(() => f.setTime('invalid'));
        const hash = (
          await f.db.transaction((tx) => tx.query(sql('SELECT password_hash FROM dbo.users')))
        )[0]!.password_hash;
        assert.notEqual(
          hash,
          (
            await other.db.transaction((tx) => tx.query(sql('SELECT password_hash FROM dbo.users')))
          )[0]!.password_hash,
        );
      } finally {
        await other.close();
      }
    },
  );
  scenario(
    'T068 real login hash-only sessions, polling idle boundary and absolute expiry despite activity',
    async (f) => {
      const login = await f.login('M1');
      const token = login.headers.get('set-cookie')!.split(';')[0]!.split('=')[1]!;
      for (const attribute of ['Secure', 'HttpOnly', 'SameSite=Strict', 'Path=/'])
        assert(login.headers.get('set-cookie')!.includes(attribute));
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT token_hash,last_seen_at FROM dbo.sessions')),
      );
      assert(!JSON.stringify(before).includes(token));
      f.setTime('2026-10-06T00:59:59.999Z');
      assert.equal((await f.request('M1', '/api/notifications')).status, 200);
      assert.deepEqual(
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT token_hash,last_seen_at FROM dbo.sessions')),
        ),
        before,
      );
      f.setTime('2026-10-06T01:00:00.000Z');
      assert.equal((await f.request('M1', '/api/me')).status, 401);
      f.setTime('2026-10-06T00:00:00.000Z');
      await f.login('M1');
      for (let minute = 45; minute < 720; minute += 45) {
        f.setTime(new Date(Date.parse('2026-10-06T00:00:00.000Z') + minute * 60000).toISOString());
        assert.equal((await f.request('M1', '/api/session/activity', 'POST')).status, 204);
      }
      f.setTime('2026-10-06T12:00:00.000Z');
      assert.equal((await f.request('M1', '/api/me')).status, 401);
    },
  );
  scenario('T068 last Admin guard, role/deactivate revocation and history retention', async (f) => {
    await f.login('A');
    await f.login('M1');
    const denied = await f.request('A', `/api/users/${f.users.A}`, 'PATCH', {
      version: 1,
      active: false,
    });
    assert.equal(denied.status, 422);
    assert.equal((await denied.json()).error.code, 'LAST_ACTIVE_ADMIN');
    assert.equal(
      (await f.request('A', `/api/users/${f.users.M1}`, 'PATCH', { version: 1, org_role: 'admin' }))
        .status,
      200,
    );
    assert.equal((await f.request('M1', '/api/me')).status, 401);
    await f.login('M1');
    assert.equal(
      (await f.request('A', `/api/users/${f.users.M1}`, 'PATCH', { version: 2, active: false }))
        .status,
      200,
    );
    assert.equal((await f.request('M1', '/api/me')).status, 401);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.tasks')))).length,
      4,
    );
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
      2,
    );
  });
  scenario(
    'T068 password rotation/reset revokes old cookie and keeps audit secret-free',
    async (f) => {
      await f.login('A');
      await f.login('M1');
      const current = f.password,
        next = `Next-${randomUUID()}`;
      const changed = await f.request('M1', '/api/password', 'POST', {
        current_password: current,
        new_password: next,
      });
      assert.equal(changed.status, 200);
      assert.equal((await f.request('M1', '/api/me')).status, 401); // old jar intentionally retained
      const reset = await f.request('A', `/api/users/${f.users.M1}/reset-password`, 'POST', {
        version: 2,
        admin_password: current,
        temp_password: current,
      });
      assert.equal(reset.status, 200);
      await f.login('M1');
      assert.equal((await f.request('M1', '/api/tasks')).status, 403);
      assert.equal((await f.request('M1', '/api/logout', 'POST')).status, 204);
      assert.equal((await f.request('M1', '/api/me')).status, 401);
      const audit = JSON.stringify(
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT redacted_changes FROM dbo.admin_events')),
        ),
      );
      assert(!audit.includes(current));
      assert(!audit.includes(next));
      assert(!audit.includes('scrypt$'));
    },
  );
  scenario('T069 exact role/project read matrix and byte-authorized file IDOR', async (f) => {
    const readable = {
      A: projects,
      L1: ['P1', 'Pshared', 'Pprivate'],
      L2: ['P2'],
      M1: ['P1', 'Pshared'],
      M2: ['P2', 'Pshared'],
      V: ['Pshared'],
    };
    for (const role of ['A', 'L1', 'L2', 'M1', 'M2', 'V'] as const) {
      await f.login(role);
      for (const project of projects) {
        const allowed = (readable[role] as readonly string[]).includes(project);
        const response = await f.request(role, `/api/tasks/${f.tasks[project]}`);
        assert.equal(response.status, allowed ? 200 : 404, `${role}/${project} detail`);
        const download = await f.request(role, `/api/attachments/${f.files[project]}/download`);
        assert.equal(download.status, allowed ? 200 : 404, `${role}/${project} file`);
        if (allowed) assert.deepEqual(Buffer.from(await download.arrayBuffer()), f.bytes);
        else assert(!(await download.text()).includes('PRIVATE_ONLY'));
      }
    }
  });
  scenario(
    'T069 Viewer write matrix preserves DB/attachment bytes across all task actions',
    async (f) => {
      await f.login('V');
      const id = f.tasks.Pshared,
        project = f.projects.Pshared;
      const before = await f.db.transaction(async (tx) => ({
        tasks: await tx.query(sql('SELECT * FROM dbo.tasks')),
        events: await tx.query(sql('SELECT * FROM dbo.task_events')),
        attachments: await tx.query(sql('SELECT * FROM dbo.attachments')),
        keys: await tx.query(sql('SELECT * FROM dbo.idempotency_keys')),
      }));
      const entries = await readdir(join(f.root, 'attachments'));
      const contents = await Promise.all(
        entries.map((name) => readFile(join(f.root, 'attachments', name))),
      );
      const subtask = Number(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.subtasks WHERE task_id=@id', { id })),
          )
        )[0]!.id,
      );
      const commands: [string, string, unknown][] = [
        ['/api/tasks', 'POST', { project_id: project, title: 'denied' }],
        [`/api/tasks/${id}`, 'PATCH', { version: 1, title: 'denied' }],
        [`/api/tasks/${id}`, 'DELETE', { version: 1 }],
        [`/api/tasks/${id}/restore`, 'POST', { version: 1 }],
        [
          `/api/projects/${project}/board/move`,
          'POST',
          {
            task_id: id,
            task_version: 1,
            from_status: 'todo',
            to_status: 'doing',
            source_column_version: 1,
            target_column_version: 1,
            before_task_id: null,
          },
        ],
        [`/api/tasks/${id}/comments`, 'POST', { body: 'denied' }],
        [`/api/tasks/${id}/subtasks`, 'POST', { task_version: 1, title: 'denied' }],
        [`/api/subtasks/${subtask}`, 'PATCH', { version: 1, task_version: 1, done: true }],
        [`/api/subtasks/${subtask}`, 'DELETE', { version: 1, task_version: 1 }],
        [`/api/attachments/${f.files.Pshared}`, 'DELETE', undefined],
        [`/api/attachments/${f.files.Pshared}/restore`, 'POST', undefined],
      ];
      for (const [path, method, body] of commands)
        assert.equal(
          (await f.request('V', path, method, body)).status,
          path === `/api/tasks/${id}/restore` ? 404 : 403,
          `${method} ${path}`,
        );
      const upload = new FormData();
      upload.append('file', new Blob(['denied']), 'denied.txt');
      assert.equal(
        (await f.request('V', `/api/tasks/${id}/attachments`, 'POST', upload)).status,
        403,
      );
      const after = await f.db.transaction(async (tx) => ({
        tasks: await tx.query(sql('SELECT * FROM dbo.tasks')),
        events: await tx.query(sql('SELECT * FROM dbo.task_events')),
        attachments: await tx.query(sql('SELECT * FROM dbo.attachments')),
        keys: await tx.query(sql('SELECT * FROM dbo.idempotency_keys')),
      }));
      assert.deepEqual(after, before);
      assert.deepEqual(await readdir(join(f.root, 'attachments')), entries);
      assert.deepEqual(
        await Promise.all(entries.map((name) => readFile(join(f.root, 'attachments', name)))),
        contents,
      );
    },
  );
  scenario('T069 scope across search/count/report/CSV/notification and directory', async (f) => {
    await f.login('M2');
    for (const path of [
      '/api/projects',
      '/api/tasks?q=PRIVATE_ONLY',
      '/api/reports/summary',
      '/api/export/tasks.csv',
      '/api/notifications',
    ]) {
      const response = await f.request('M2', path);
      assert.equal(response.status, 200, path);
      const value = await response.text();
      assert(!value.includes('PRIVATE_ONLY'), path);
      assert(!value.includes('Pprivate'), path);
      if (path.includes('q=')) assert.equal(JSON.parse(value).total, 0);
      if (path === '/api/notifications') {
        const result = JSON.parse(value);
        assert.equal(result.total, 1);
        assert.equal(result.unread_count, 1);
      }
    }
    assert.equal((await f.request('M2', '/api/directory')).status, 403);
    await f.login('L1');
    assert.equal((await f.request('L1', '/api/directory')).status, 200);
  });
  scenario(
    'T069 revoke open detail prevents new reads/write/replay and cleans open assignment',
    async (f) => {
      await f.login('M2');
      await f.login('L1');
      const id = f.tasks.Pshared,
        key = '11111111-2222-4333-8444-555555555555';
      const path = `/api/tasks/${id}/comments`,
        body = { body: 'Before revoke' };
      assert.equal((await f.request('M2', `/api/tasks/${id}`)).status, 200);
      assert.equal(
        (await f.request('M2', path, 'POST', body, { 'Idempotency-Key': key })).status,
        201,
      );
      assert.equal(
        (
          await f.request(
            'L1',
            `/api/projects/${f.projects.Pshared}/members/${f.users.M2}`,
            'DELETE',
            { version: 1 },
          )
        ).status,
        200,
      );
      for (const p of [`/api/tasks/${id}`, `/api/attachments/${f.files.Pshared}/download`])
        assert.equal((await f.request('M2', p)).status, 404);
      assert.equal(
        (await f.request('M2', path, 'POST', body, { 'Idempotency-Key': key })).status,
        404,
      );
      const row = (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=@id', { id })),
        )
      )[0]!;
      assert.equal(row.assignee_id, null);
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.comments WHERE task_id=@id', { id })),
          )
        ).length,
        1,
      );
      const notification = await f.request('M2', '/api/notifications');
      assert.equal((await notification.json()).total, 0);
    },
  );
  scenario(
    'T069 archived project rejects normal writes, owner lifecycle exception and unarchive',
    async (f) => {
      await f.login('L1');
      await f.login('M1');
      const project = f.projects.P1,
        id = f.tasks.P1;
      assert.equal(
        (await f.request('L1', `/api/projects/${project}`, 'PATCH', { version: 1, archived: true }))
          .status,
        200,
      );
      assert.equal((await f.request('M1', `/api/tasks/${id}`)).status, 200);
      const write = await f.request('M1', `/api/tasks/${id}`, 'PATCH', {
        version: 1,
        title: 'denied',
      });
      assert.equal(write.status, 422);
      assert.equal((await write.json()).error.code, 'PROJECT_ARCHIVED');
      assert.equal(
        (await f.request('L1', `/api/tasks/${id}`, 'DELETE', { version: 1 })).status,
        200,
      );
      assert.equal(
        (await f.request('L1', `/api/tasks/${id}/restore`, 'POST', { version: 2 })).status,
        200,
      );
      assert.equal(
        (
          await f.request('L1', `/api/projects/${project}`, 'PATCH', {
            version: 2,
            archived: false,
          })
        ).status,
        200,
      );
      assert.equal(
        (await f.request('M1', `/api/tasks/${id}`, 'PATCH', { version: 3, title: 'editable' }))
          .status,
        200,
      );
    },
  );
  scenario('T069 CSRF/no Origin/spoofed proxy, parameterized SQLi and plaintext XSS', async (f) => {
    await f.login('M1');
    const path = `/api/tasks/${f.tasks.P1}/comments`,
      body = { body: '<script>alert(1)</script>' };
    for (const extra of [
      { Origin: null },
      { Origin: 'https://evil.invalid' },
      { 'X-CSRF-Token': 'bad' },
      { Origin: null, 'X-Forwarded-Host': 'regression.invalid', 'X-Forwarded-Proto': 'https' },
    ])
      assert.equal((await f.request('M1', path, 'POST', body, extra)).status, 403);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.comments')))).length,
      0,
    );
    const response = await f.request('M1', path, 'POST', body);
    assert.equal(response.status, 201);
    const read = await f.request('M1', path);
    assert(read.headers.get('content-type')!.includes('application/json'));
    assert((await read.text()).includes('<script>'));
    const injected = await f.request('M1', `/api/tasks?q=${encodeURIComponent("' OR 1=1 --")}`);
    assert.equal(injected.status, 200);
    assert.equal((await injected.json()).total, 0);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.tasks')))).length,
      4,
    );
  });
}
