import test from 'node:test';
import assert from 'node:assert/strict';
import { rmSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { startApplication, safeStartupError } from '../../src/api/start.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { startupFixture } from './fixtures.js';
import { input } from './provider-suite.js';
test('actual startup announces only after listen; empty restart rotates token; configured restart emits none', async () => {
  const f = await startupFixture();
  const tokens: string[] = [];
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  try {
    app = await startApplication(f.env, { announceSetupToken: (t) => tokens.push(t) });
    assert.equal(tokens.length, 1);
    assert.equal((await fetch(f.env.APP_ORIGIN + '/health/ready')).status, 503);
    assert.equal((await (await fetch(f.env.APP_ORIGIN + '/api/meta')).json()).setupRequired, true);
    await app.stop();
    app = await startApplication(f.env, { announceSetupToken: (t) => tokens.push(t) });
    assert.equal(tokens.length, 2);
    assert(tokens[0] !== tokens[1]);
    const send = (token: string) =>
      fetch(f.env.APP_ORIGIN + '/api/setup', {
        method: 'POST',
        headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' },
        body: JSON.stringify(input(token)),
      });
    assert.equal((await send(tokens[0]!)).status, 403);
    assert.equal((await send(tokens[1]!)).status, 201);
    await app.stop();
    app = await startApplication(f.env, { announceSetupToken: (t) => tokens.push(t) });
    assert.equal(tokens.length, 2);
    assert.equal((await (await fetch(f.env.APP_ORIGIN + '/api/meta')).json()).setupRequired, false);
    assert.equal((await fetch(f.env.APP_ORIGIN + '/health/ready')).status, 200);
    assert.deepEqual(readdirSync(f.env.LOG_DIR), ['application.jsonl']);
    const log = readFileSync(join(f.env.LOG_DIR, 'application.jsonl'), 'utf8');
    for (const token of tokens) assert.equal(log.includes(token), false);
  } finally {
    await app?.stop();
    rmSync(f.root, { recursive: true, force: true });
  }
});
test('existing unmigrated database rejected without token/DDL; startup error is safe', async () => {
  const f = await startupFixture(false);
  let emitted = false;
  try {
    await assert.rejects(
      startApplication(f.env, {
        announceSetupToken: () => {
          emitted = true;
        },
      }),
      (e: unknown) => {
        assert.equal(safeStartupError(e), 'STARTUP_FAILED');
        return true;
      },
    );
    assert.equal(emitted, false);
    const db = new SqliteDatabase(f.path);
    try {
      await db.transaction(async (tx) =>
        assert.equal(
          (
            await tx.query({
              sqlite: "SELECT name FROM sqlite_master WHERE type='table'",
              sqlserver: '',
            })
          ).length,
          0,
        ),
      );
    } finally {
      await db.close();
    }
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
