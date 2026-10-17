import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { startupFixture, fixtureDatabase } from '../setup/fixtures.js';
import { startApplication } from '../../src/api/start.js';
import { sql } from '../../src/repository/access-scope.js';
// HTTP evidence for RV-12 (lock timeout → 503 Retry-After, readiness answers, same-key retry)
// and RV-15 (response lost after commit → same-key replay, different body 409) on PostgreSQL 17.
const skip =
  process.env.RUN_POSTGRES_TESTS === '1' &&
  process.env.FRIDAY_FIXTURE_PROVIDER === 'postgres' &&
  /_test$/.test(process.env.DB_NAME ?? '')
    ? false
    : 'NOT_RUN: FRIDAY_FIXTURE_PROVIDER=postgres with an isolated PostgreSQL test database required';
const password = 'Fault-http-fixture-password';

async function app() {
  const f = await startupFixture();
  let token = '';
  const env = { ...f.env, DB_LOCK_TIMEOUT_MS: '300', DB_REQUEST_TIMEOUT_MS: '5000' };
  const running = await startApplication(env, { announceSetupToken: (t) => (token = t) });
  const base = f.env.APP_ORIGIN;
  const origin = { Origin: base, 'Content-Type': 'application/json' };
  const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
    fetch(base + path, {
      method: 'POST',
      headers: { ...origin, ...headers },
      body: JSON.stringify(body),
    });
  assert.equal(
    (
      await post('/api/setup', {
        token,
        organization_name: 'Fault org',
        username: 'FaultAdmin',
        display_name: 'Fault Admin',
        password,
      })
    ).status,
    201,
  );
  const login = await post('/api/login', { username: 'FaultAdmin', password });
  const cookie = login.headers.get('set-cookie')!.split(';')[0]!;
  const csrf = ((await login.json()) as { csrf: string }).csrf;
  const auth = { Cookie: cookie, 'X-CSRF-Token': csrf };
  const write = (path: string, body: unknown, key = randomUUID()) =>
    post(path, body, { ...auth, 'Idempotency-Key': key });
  const team = (await (await write('/api/teams', { name: 'Fault team' })).json()) as {
    item: { id: number };
  };
  const project = (await (
    await write('/api/projects', { name: 'Fault project', owner_team_id: team.item.id })
  ).json()) as { item: { id: number } };
  const task = (await (
    await write('/api/tasks', { project_id: project.item.id, title: 'Fault task' })
  ).json()) as { item: { id: number } };
  const db = await fixtureDatabase(f);
  const comments = async () =>
    Number(
      (
        await db.transaction((tx) =>
          tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.comments')),
        )
      )[0]!.n,
    );
  return {
    f,
    base,
    write,
    taskId: task.item.id,
    comments,
    close: async () => {
      await db.close();
      await running.stop();
      rmSync(f.root, { recursive: true, force: true });
    },
  };
}

test(
  'PostgreSQL 17 HTTP: RV-12 held row lock → 503 Retry-After, readiness answers, same key then succeeds once',
  { skip },
  async () => {
    const a = await app();
    const pg = (await import('pg')).default;
    const holder = new pg.Client({
      host: a.f.env.DB_SERVER,
      port: Number(a.f.env.DB_PORT),
      database: a.f.env.DB_NAME,
      user: a.f.env.DB_USER,
      password: a.f.env.DB_PASSWORD,
    });
    await holder.connect();
    try {
      await holder.query('BEGIN');
      await holder.query('SELECT id FROM tasks WHERE id=$1 FOR UPDATE', [a.taskId]);
      const key = randomUUID();
      const started = Date.now();
      const blocked = await a.write(
        `/api/tasks/${a.taskId}/comments`,
        { body: 'RV-12 comment' },
        key,
      );
      assert.equal(blocked.status, 503);
      assert.equal(blocked.headers.get('retry-after'), '5');
      assert.equal(
        ((await blocked.json()) as { error: { code: string } }).error.code,
        'DATABASE_BUSY',
      );
      assert(Date.now() - started < 4000, 'bounded by DB_LOCK_TIMEOUT_MS');
      // Readiness keeps answering (it does not hang behind the business row lock).
      const ready = await fetch(a.base + '/health/ready');
      assert([200, 503].includes(ready.status));
      assert.equal(await a.comments(), 0);
      await holder.query('ROLLBACK');
      const created = await a.write(
        `/api/tasks/${a.taskId}/comments`,
        { body: 'RV-12 comment' },
        key,
      );
      assert.equal(created.status, 201);
      const replay = await a.write(
        `/api/tasks/${a.taskId}/comments`,
        { body: 'RV-12 comment' },
        key,
      );
      assert.equal(replay.status, 201);
      assert.deepEqual(await replay.json(), await created.json());
      assert.equal(await a.comments(), 1);
    } finally {
      await holder.end();
      await a.close();
    }
  },
);

test(
  'PostgreSQL 17 HTTP: RV-15 response lost after commit → same-key replay returns the committed result; different body 409',
  { skip },
  async () => {
    const a = await app();
    try {
      const key = randomUUID();
      // The client never reads this response (lost acknowledgement); the server committed it.
      const lost = await a.write(`/api/tasks/${a.taskId}/comments`, { body: 'RV-15 comment' }, key);
      const committed = (await lost.json()) as { item: { id: number } };
      assert.equal(lost.status, 201);
      assert.equal(await a.comments(), 1);
      const replay = await a.write(
        `/api/tasks/${a.taskId}/comments`,
        { body: 'RV-15 comment' },
        key,
      );
      assert.equal(replay.status, 201);
      assert.equal(((await replay.json()) as { item: { id: number } }).item.id, committed.item.id);
      const conflict = await a.write(
        `/api/tasks/${a.taskId}/comments`,
        { body: 'changed body' },
        key,
      );
      assert.equal(conflict.status, 409);
      assert.equal(
        ((await conflict.json()) as { error: { code: string } }).error.code,
        'IDEMPOTENCY_CONFLICT',
      );
      assert.equal(await a.comments(), 1);
    } finally {
      await a.close();
    }
  },
);
