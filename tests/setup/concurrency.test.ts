import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { snapshot } from './provider-suite.js';
test('separate processes with independent valid startup tokens share one DB no-users claim', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'friday-setup-race-')),
    path = join(dir, 'fixture.sqlite');
  let db = new SqliteDatabase(path),
    closed = false;
  const children: ReturnType<typeof spawn>[] = [];
  try {
    await migrate(db);
    await db.close();
    closed = true;
    let ready = 0;
    const worker = (id: number) =>
      new Promise<string>((res, rej) => {
        const child = spawn(
          process.execPath,
          ['--import', 'tsx', resolve('tests/setup/worker.ts'), path, String(id)],
          { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
        );
        children.push(child);
        let out = '',
          errors = '';
        const timer = setTimeout(() => {
          child.kill();
          rej(new Error('setup worker timeout'));
        }, 15000);
        child.stdout!.on('data', (d) => {
          out += String(d);
        });
        child.stderr!.on('data', (d) => {
          errors += String(d);
        });
        child.on('message', () => {
          ready++;
          if (ready === 2) for (const worker of children) worker.send('start');
        });
        child.on('error', (e) => {
          clearTimeout(timer);
          rej(e);
        });
        child.on('exit', (code) => {
          clearTimeout(timer);
          if (code === 0) res(out.trim());
          else rej(new Error(`fixture worker ${code}: ${errors}`));
        });
      });
    const results = (await Promise.allSettled([worker(1), worker(2)])).map((o) => {
      if (o.status === 'rejected') throw o.reason;
      return JSON.parse(o.value).status;
    });
    assert.deepEqual(results.sort(), [201, 409]);
    db = new SqliteDatabase(path);
    closed = false;
    assert.deepEqual(await snapshot(db), [1, 1, 1, 1, 0, 0]);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
    if (!closed) await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
