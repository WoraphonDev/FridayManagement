/** T067 internal harness: no public clock/reset routes; credentials exist in memory only. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Fixture } from '../schema/fixtures.js';
import { insert } from '../schema/fixtures.js';
import { migrate } from '../../src/repository/migrate.js';
import { sql } from '../../src/repository/access-scope.js';
import { hashPassword } from '../../src/security/passwords.js';
import { sessionHooks } from '../../src/api/sessions.js';
import { createApp } from '../../src/api/app.js';
import { parseConfiguration } from '../../src/config/config.js';
export const roles = ['A', 'L1', 'L2', 'M1', 'M2', 'V', 'Inactive'] as const;
export type Role = (typeof roles)[number];
export const projects = ['P1', 'P2', 'Pshared', 'Pprivate'] as const;
export type Project = (typeof projects)[number];
export const epoch = '2026-10-06T00:00:00.000Z';
export const origin = 'https://regression.invalid';
export async function regressionFixture(factory: (initial?: boolean) => Promise<Fixture>) {
  const f = await factory(false);
  let root: string | undefined;
  let stopHttp: (() => Promise<void>) | undefined;
  try {
    root = await mkdtemp(join(tmpdir(), 'friday-regression-'));
    const directory = root;
    await mkdir(join(directory, 'attachments'), { mode: 0o700 });
    await migrate(f.db);
    const password = `Test-${randomUUID()}`,
      encoded = await hashPassword(password);
    const users = {} as Record<Role, number>,
      ids = {} as Record<Project, number>,
      tasks = {} as Record<Project, number>,
      files = {} as Record<Project, number>;
    const bytes = Buffer.from('Synthetic fixture text; ไม่มีข้อมูลจริง');
    await f.db.transaction(async (tx) => {
      await tx.execute(insert('organizations', { id: 1, name: 'Regression Synthetic' }));
      for (const role of roles) {
        const username = role === 'A' ? 'admin_a' : role;
        await tx.execute(
          insert('users', {
            username,
            display_name: role,
            org_role: role === 'A' ? 'admin' : 'member',
            active: role === 'Inactive' ? 0 : 1,
            must_change_password: 0,
            password_hash: encoded,
            created_at: epoch,
            updated_at: epoch,
          }),
        );
        users[role] = Number(
          (
            await tx.query(sql('SELECT id FROM dbo.users WHERE username=@username', { username }))
          )[0]!.id,
        );
      }
      for (const role of roles)
        await tx.execute(
          insert('user_view_revisions', {
            user_id: users[role],
            revision: randomUUID(),
            updated_at: epoch,
          }),
        );
      for (const name of ['ทีม1', 'ทีม2'])
        await tx.execute(insert('teams', { name, created_at: epoch, updated_at: epoch }));
      const teams = await tx.query(sql('SELECT id,name FROM dbo.teams ORDER BY id'));
      const team1 = Number(teams[0]!.id),
        team2 = Number(teams[1]!.id);
      for (const [role, team_id, team_role] of [
        ['L1', team1, 'lead'],
        ['L2', team2, 'lead'],
        ['M1', team1, 'member'],
        ['M2', team2, 'member'],
      ] as const)
        await tx.execute(insert('team_members', { user_id: users[role], team_id, team_role }));
      for (const name of projects) {
        await tx.execute(
          insert('projects', {
            name,
            owner_team_id: name === 'P2' ? team2 : team1,
            created_by: users.A,
            created_at: epoch,
            updated_at: epoch,
          }),
        );
        const project_id = Number(
          (await tx.query(sql('SELECT id FROM dbo.projects WHERE name=@name', { name })))[0]!.id,
        );
        ids[name] = project_id;
        for (const status of ['todo', 'doing', 'review', 'done'])
          await tx.execute(insert('board_columns', { project_id, status }));
        const title = name === 'Pprivate' ? 'PRIVATE_ONLY' : `${name} synthetic task`;
        await tx.execute(
          insert('tasks', {
            project_id,
            title,
            creator_id: users.A,
            assignee_id: name === 'Pshared' || name === 'P2' ? users.M2 : null,
            start_date: '2026-10-06',
            due_date: '2026-10-07',
            created_at: epoch,
            updated_at: epoch,
          }),
        );
        const task_id = Number(
          (
            await tx.query(sql('SELECT id FROM dbo.tasks WHERE project_id=@id', { id: project_id }))
          )[0]!.id,
        );
        tasks[name] = task_id;
        await tx.execute(
          insert('board_positions', { project_id, task_id, status: 'todo', rank: 1 }),
        );
        await tx.execute(insert('subtasks', { task_id, title: 'Synthetic checklist' }));
        const key = randomUUID();
        await writeFile(join(directory, 'attachments', key), bytes, { mode: 0o600 });
        await tx.execute(
          insert('attachments', {
            task_id,
            uploader_id: users.A,
            original_name: `${title}.txt`,
            storage_key: key,
            bytes: bytes.length,
            validated_type: 'text/plain',
            sha256: createHash('sha256').update(bytes).digest('hex'),
            created_at: epoch,
          }),
        );
        files[name] = Number(
          (
            await tx.query(sql('SELECT id FROM dbo.attachments WHERE task_id=@id', { id: task_id }))
          )[0]!.id,
        );
      }
      for (const [project, role, access] of [
        ['P1', 'M1', 'editor'],
        ['P2', 'M2', 'editor'],
        ['Pshared', 'M1', 'editor'],
        ['Pshared', 'M2', 'editor'],
        ['Pshared', 'V', 'viewer'],
      ] as const)
        await tx.execute(
          insert('project_members', {
            project_id: ids[project],
            user_id: users[role],
            access,
            added_by: users.A,
          }),
        );
      // Includes a stale private notification deliberately; consumers must recheck current access.
      for (const project of ['Pshared', 'Pprivate'] as const)
        await tx.execute(
          insert('notifications', {
            recipient_id: users.M2,
            task_id: tasks[project],
            type: 'comment',
            message: project === 'Pprivate' ? 'PRIVATE_ONLY' : 'Shared notification',
            dedupe_key: randomUUID(),
            created_at: epoch,
          }),
        );
      await tx.execute(
        sql('UPDATE dbo.storage_quota SET stored_bytes=@bytes WHERE id=1', {
          bytes: bytes.length * projects.length,
        }),
      );
    });
    let current = new Date(epoch);
    const clock = () => new Date(current);
    const config = parseConfiguration({
      // Only SQL connection settings may come from the guarded native fixture profile.
      ...Object.fromEntries(
        [
          'DB_SERVER',
          'DB_PORT',
          'DB_NAME',
          'DB_USER',
          'DB_PASSWORD',
          'DB_ENCRYPT',
          'DB_TRUST_SERVER_CERTIFICATE',
        ].map((key) => [key, process.env[key]]),
      ),
      TRUSTED_PROXY: '',
      NODE_ENV: 'test',
      DB_PROVIDER: f.db.provider,
      DATA_DIR: directory,
      LOG_DIR: join(directory, 'logs'),
      SQLITE_DB_PATH: join(directory, 'config-only.sqlite'),
      APP_ORIGIN: origin,
      COOKIE_SECURE: 'true',
    });
    const server = createApp(
      undefined,
      config,
      await sessionHooks(f.db, {
        clock,
        cookieSecure: true,
        storage: { directory, maxFileBytes: 10485760, totalUploadBytes: 5368709120 },
      }),
    ).listen(0, '127.0.0.1');
    stopHttp = async () => {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    };
    await new Promise<void>((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    const address = server.address();
    assert(address && typeof address === 'object');
    const base = `http://127.0.0.1:${address.port}`;
    const jars = new Map<Role, { cookie: string; csrf: string }>();
    async function login(role: Role) {
      const response = await fetch(base + '/api/login', {
        method: 'POST',
        headers: { Origin: origin, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: role === 'A' ? 'ADMIN_A' : role, password }),
      });
      if (role === 'Inactive') {
        assert.equal(response.status, 401);
        return response;
      }
      assert.equal(response.status, 200, `login ${role}`);
      const self = await response.json();
      jars.set(role, {
        cookie: response.headers.get('set-cookie')!.split(';')[0]!,
        csrf: self.csrf,
      });
      return response;
    }
    function request(
      role: Role,
      path: string,
      method = 'GET',
      body?: unknown,
      extra: Record<string, string | null> = {},
    ) {
      const jar = jars.get(role);
      assert(jar, `login ${role} before request`);
      const headers: Record<string, string> = { Cookie: jar.cookie };
      if (method !== 'GET')
        Object.assign(headers, {
          Origin: origin,
          'X-CSRF-Token': jar.csrf,
          'Idempotency-Key': randomUUID(),
        });
      if (body !== undefined && !(body instanceof FormData))
        headers['Content-Type'] = 'application/json';
      for (const [name, value] of Object.entries(extra)) {
        if (value === null) delete headers[name];
        else headers[name] = value;
      }
      return fetch(base + path, {
        method,
        headers,
        ...(body === undefined
          ? {}
          : { body: body instanceof FormData ? body : JSON.stringify(body) }),
      });
    }
    return {
      db: f.db,
      root: directory,
      users,
      projects: ids,
      tasks,
      files,
      bytes,
      clock,
      login,
      request,
      password,
      setTime(value: string) {
        const date = new Date(value);
        assert(Number.isFinite(date.valueOf()), 'valid controlled UTC clock required');
        current = date;
      },
      async close() {
        try {
          await stopHttp!();
        } finally {
          try {
            await f.close();
          } finally {
            await rm(directory, { recursive: true, force: true });
            jars.clear();
          }
        }
      },
    };
  } catch (error) {
    try {
      if (stopHttp) await stopHttp();
    } finally {
      try {
        await f.close();
      } finally {
        if (root) await rm(root, { recursive: true, force: true });
      }
    }
    throw error;
  }
}
export type RegressionFixture = Awaited<ReturnType<typeof regressionFixture>>;
