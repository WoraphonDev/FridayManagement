import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import { rmSync } from 'node:fs';
import { startupFixture } from '../setup/fixtures.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { setupService } from '../../src/services/setup.js';
import { input } from '../setup/provider-suite.js';
import { randomUUID } from 'node:crypto';
import { revokeUserSessions } from '../../src/services/sessions.js';
import { sql } from '../../src/repository/access-scope.js';
import { password, time } from './fixtures.js';
async function fixture() {
  const f = await startupFixture(),
    db = new SqliteDatabase(f.path);
  let token = '';
  const setup = await setupService(db, {
    announceToken: (t) => {
      token = t;
    },
    clock: () => new Date(time),
  });
  await setup.create({ ...input(token, 'Admin'), password }, '127.0.0.1', randomUUID());
  return { ...f, db };
}
function worker(
  path: string,
  mode: string,
  id: number,
  onMessage: (value: unknown, child: ChildProcess) => Promise<void> | void,
) {
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', resolve('tests/sessions/worker.ts'), path, mode, String(id)],
    { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
  );
  const result = new Promise<{ allowed?: number; limited?: number; status?: number }>(
    (res, rej) => {
      let out = '',
        errors = '';
      const timer = setTimeout(() => {
        child.kill();
        rej(new Error('fixture worker timed out'));
      }, 15000);
      child.stdout!.on('data', (chunk) => {
        out += String(chunk);
      });
      child.stderr!.on('data', (chunk) => {
        errors += String(chunk);
      });
      child.on('message', (value) => {
        Promise.resolve(onMessage(value, child)).catch(rej);
      });
      child.on('error', (e) => {
        clearTimeout(timer);
        rej(e);
      });
      child.on('exit', (code) => {
        clearTimeout(timer);
        if (code === 0) res(JSON.parse(out));
        else rej(new Error(`fixture worker ${code}: ${errors}`));
      });
    },
  );
  return { child, result };
}
test('two processes atomically enforce shared username10 across independent IP buckets', async () => {
  const f = await fixture(),
    children: ChildProcess[] = [];
  let ready = 0;
  const onReady = () => {
    if (++ready === 2) for (const child of children) child.send('start');
  };
  try {
    const jobs = [1, 2].map((id) => {
      const job = worker(f.path, 'rate', id, onReady);
      children.push(job.child);
      return job.result;
    });
    const rows = await Promise.all(jobs);
    assert.equal(
      rows.reduce((s, r) => s + r.allowed!, 0),
      10,
    );
    assert.equal(
      rows.reduce((s, r) => s + r.limited!, 0),
      10,
    );
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query<{ attempts: number }>(
            sql("SELECT attempts FROM dbo.rate_limit_buckets WHERE kind='login_username'"),
          ),
        )
      )[0]!.attempts,
      10,
    );
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
    await f.db.close();
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('independent process login snapshot cannot create a session after committed role revocation', async () => {
  const f = await fixture();
  let child: ChildProcess | undefined;
  try {
    const job = worker(f.path, 'login', 1, async () => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql("UPDATE dbo.users SET org_role='member' WHERE id=1"));
        await revokeUserSessions(tx, 1);
      });
      job.child.send('release');
    });
    child = job.child;
    assert.equal((await job.result).status, 401);
    assert.equal(
      (
        await f.db.transaction((tx) =>
          tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.sessions')),
        )
      )[0]!.n,
      0,
    );
  } finally {
    if (child?.exitCode === null) child.kill();
    await f.db.close();
    rmSync(f.root, { recursive: true, force: true });
  }
});
