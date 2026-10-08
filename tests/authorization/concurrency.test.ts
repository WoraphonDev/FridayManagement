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
import { accessFixture, proof, now } from './fixtures.js';
import { authorizeOperation } from '../../src/services/authorization.js';
import { executeIdempotent } from '../../src/repository/idempotency.js';
import { ApiFault } from '../../src/api/errors.js';
import { command, comment, counts } from '../idempotency/provider-suite.js';
test('separate process revoke vs write barrier: authorized transaction completes, post-revocation new/replay denied', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'friday-authorization-')),
    path = join(dir, 'fixture.sqlite');
  let db = new SqliteDatabase(path);
  let closed = false;
  const children: ReturnType<typeof spawn>[] = [];
  try {
    await migrate(db);
    await db.transaction(seed);
    await accessFixture(async () => ({ db, reopen: async () => db, close: () => db.close() }));
    await db.close();
    closed = true;
    const key = randomUUID();
    let writer: ReturnType<typeof spawn>;
    let startedResolve: () => void = () => {};
    const authorized = new Promise<void>((r) => {
      startedResolve = r;
    });
    const run = (mode: string) =>
      new Promise<string>((res, rej) => {
        const child = spawn(
          process.execPath,
          ['--import', 'tsx', resolve('tests/authorization/worker.ts'), path, mode, key],
          { stdio: ['ignore', 'pipe', 'pipe', 'ipc'] },
        );
        children.push(child);
        if (mode === 'write') writer = child;
        let output = '',
          errors = '';
        const timer = setTimeout(() => {
          child.kill();
          rej(new Error('authorization worker timeout'));
        }, 15000);
        child.stdout!.on('data', (d) => {
          output += String(d);
        });
        child.stderr!.on('data', (d) => {
          errors += String(d);
        });
        child.on('message', (m) => {
          if (m === 'authorized') startedResolve();
          else if (m === 'attempting-revoke') writer.send('commit');
        });
        child.on('error', (e) => {
          clearTimeout(timer);
          rej(e);
        });
        child.on('exit', (code) => {
          clearTimeout(timer);
          if (code === 0) res(output.trim());
          else rej(new Error(`fixture worker ${code}: ${errors}`));
        });
      });
    const writing = run('write');
    await Promise.race([
      authorized,
      writing.then(() => {
        throw new Error('worker exited before barrier');
      }),
    ]);
    const outcomes = await Promise.allSettled([writing, run('revoke')]);
    const results = outcomes.map((o) => {
      if (o.status === 'rejected') throw o.reason;
      return JSON.parse(o.value);
    });
    assert.equal(results[0].status, 201);
    assert.equal(results[1].revoked, true);
    db = new SqliteDatabase(path);
    closed = false;
    const c = {
      ...command(key),
      userId: 4,
      clock: () => new Date(now),
      authorize: async (tx: Parameters<typeof comment>[0]) => {
        await authorizeOperation(
          tx,
          proof(4),
          { method: 'POST', path: '/api/tasks/{id}/comments', params: { id: 1 } },
          { clock: () => new Date(now) },
        );
      },
      mutate: (tx: Parameters<typeof comment>[0], body: unknown) => comment(tx, body, 4),
    };
    for (const key of [c.key, randomUUID()])
      await assert.rejects(
        executeIdempotent(db, { ...c, key }),
        (e: unknown) => e instanceof ApiFault && e.code === 'NOT_FOUND',
      );
    assert.deepEqual(await counts(db), [1, 1, 4, 1]);
  } finally {
    for (const child of children) if (child.exitCode === null) child.kill();
    if (!closed) await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
