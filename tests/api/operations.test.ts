import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createApp } from '../../src/api/app.js';
import { readinessProbe } from '../../src/api/health.js';
import { operationalLog } from '../../src/services/operational-log.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
test('Local readiness reflects live SQLite, setup gate and actual storage; probes leave no files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'friday-health-'));
  const db = new SqliteDatabase(join(root, 'health.sqlite'));
  let configured = false;
  const probe = readinessProbe(db, [root], async () => configured);
  try {
    assert.equal(await probe(), false);
    configured = true;
    assert.equal(await probe(), true);
    assert.equal(await readinessProbe(db, [join(root, 'missing')], async () => true)(), false);
    assert.equal(
      (await readdir(root)).some((name) => name.startsWith('.health-')),
      false,
    );
    await db.close();
    assert.equal(await probe(), false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test('Health is status-only; forwarded/external clients never invoke readiness; errors are redacted', async () => {
  let probes = 0,
    fail = false;
  const server = createApp(undefined, undefined, {}, () => {}, {
    ready: async () => {
      probes++;
      if (fail) throw Error('password token C:/private/path');
      return true;
    },
  }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert(address && typeof address === 'object');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.deepEqual(await (await fetch(base + '/health/live')).json(), { status: 'ok' });
    assert.deepEqual(await (await fetch(base + '/health/ready')).json(), { status: 'ok' });
    assert.equal(probes, 1);
    for (const headers of [
      { 'X-Forwarded-For': '203.0.113.2' },
      { Forwarded: 'for=203.0.113.2' },
    ]) {
      const reply = await fetch(base + '/health/ready', { headers });
      assert.equal(reply.status, 503);
      assert.deepEqual(await reply.json(), { status: 'not_ready' });
    }
    assert.equal(probes, 1);
    fail = true;
    const reply = await fetch(base + '/health/ready');
    assert.equal(reply.status, 503);
    assert.equal(reply.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await reply.json(), { status: 'not_ready' });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test('Operational logs rotate real files and discard secrets/unknown fields; unsafe links fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'friday-log-'));
  try {
    const log = operationalLog(root, 600, 2);
    for (let i = 0; i < 15; i++)
      log.write({
        event: 'request',
        requestId: randomUUID(),
        status: 200,
        code: 'password=secret',
        ...{ body: 'PRIVATE_TASK', token: 'SECRET_TOKEN' },
      });
    assert.equal(log.healthy(), true);
    assert.deepEqual((await readdir(root)).sort(), [
      'application.jsonl',
      'application.jsonl.1',
      'application.jsonl.2',
    ]);
    for (const name of await readdir(root)) {
      const text = await readFile(join(root, name), 'utf8');
      assert.doesNotMatch(text, /PRIVATE_TASK|SECRET_TOKEN|password|secret/);
      for (const line of text.trim().split('\n'))
        assert.deepEqual(Object.keys(JSON.parse(line)).sort(), [
          'event',
          'requestId',
          'status',
          'timestamp',
        ]);
    }
    await rm(join(root, 'application.jsonl'));
    const target = join(root, 'private');
    await symlink(target, join(root, 'application.jsonl'));
    log.error({ code: 'INTERNAL_ERROR', requestId: randomUUID() });
    assert.equal(log.healthy(), false);
    await assert.rejects(readFile(target));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
