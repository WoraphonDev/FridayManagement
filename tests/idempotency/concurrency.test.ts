import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed } from '../schema/fixtures.js';
import { counts } from './provider-suite.js';
test('separate Node processes share SQLite claim: one business/audit/notification/cache record', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'friday-idempotency-'));
  const path = join(dir, 'fixture.sqlite');
  const db = new SqliteDatabase(path);
  let closed = false;
  try {
    await migrate(db);
    await db.transaction(seed);
    await db.close();
    closed = true;
    const key = randomUUID();
    let ready = 0;
    const children: ReturnType<typeof spawn>[] = [];
    const worker = () =>
      new Promise<string>((resolvePromise, reject) => {
        const child = spawn(
          process.execPath,
          ['--import', 'tsx', resolve('tests/idempotency/worker.ts'), path, key],
          { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
        );
        children.push(child);
        child.on('message', () => {
          ready++;
          if (ready === 3) for (const worker of children) worker.send('start');
        });
        let output = '',
          errors = '';
        const timer = setTimeout(() => {
          child.kill();
          reject(new Error('fixture worker timeout'));
        }, 15000);
        child.stdout!.on('data', (data) => {
          output += String(data);
        });
        child.stderr!.on('data', (data) => {
          errors += String(data);
        });
        child.on('error', (e) => {
          clearTimeout(timer);
          reject(e);
        });
        child.on('exit', (code) => {
          clearTimeout(timer);
          if (code === 0) resolvePromise(output.trim());
          else reject(new Error(`fixture worker ${code}: ${errors}`));
        });
      });
    const outcomes = await Promise.allSettled([worker(), worker(), worker()]);
    const results = outcomes.map((outcome) => {
      if (outcome.status === 'rejected') throw outcome.reason;
      return outcome.value;
    });
    assert.deepEqual(
      results.map((r) => JSON.parse(r)),
      Array(3).fill(JSON.parse(results[0]!)),
    );
    const reopened = new SqliteDatabase(path);
    try {
      assert.deepEqual(await counts(reopened), [1, 1, 1, 1]);
    } finally {
      await reopened.close();
    }
  } finally {
    if (!closed) await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
