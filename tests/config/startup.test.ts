import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { startApplication, safeStartupError } from '../../src/api/start.js';
import { openDatabase } from '../../src/repository/open.js';
import { parseConfiguration } from '../../src/config/config.js';
import { createApp } from '../../src/api/app.js';

async function port() {
  const probe = createServer();
  await new Promise<void>((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  assert(address && typeof address === 'object');
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  return address.port;
}
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'friday-startup-'));
  return {
    root,
    env: {
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: join(root, 'data'),
      LOG_DIR: join(root, 'logs'),
      SQLITE_DB_PATH: join(root, 'data', 'local.sqlite'),
      PORT: String(await port()),
    },
  };
}

test('Valid config starts loopback without creating a DB; duplicate instance is rejected and shutdown releases guard', async () => {
  const f = await fixture();
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  try {
    app = await startApplication(f.env);
    const response = await fetch(`http://127.0.0.1:${f.env.PORT}/health/live`);
    assert.equal(response.status, 200);
    assert.deepEqual(await readdir(f.env.DATA_DIR), []);
    await assert.rejects(
      startApplication({ ...f.env, PORT: String(await port()) }),
      /INSTANCE_GUARD/,
    );
    await app.stop();
    app = await startApplication({ ...f.env, PORT: String(await port()) });
    assert.equal(app.server.listening, true);
  } finally {
    await app?.stop();
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Invalid configuration stops before server/filesystem setup and safe formatter does not disclose secrets', async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      startApplication({ ...f.env, APP_ORIGIN: 'https://synthetic-secret@example.test' }),
      (error) => {
        assert(!safeStartupError(error).includes('synthetic-secret'));
        return true;
      },
    );
    assert.deepEqual(await readdir(f.root), []);
    await assert.rejects(
      fetch(`http://127.0.0.1:${f.env.PORT}/health/live`, { signal: AbortSignal.timeout(500) }),
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Listen failure releases instance guard instead of leaving a lock owned by the failed startup', async () => {
  const f = await fixture();
  const blocker = createServer();
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  try {
    await new Promise<void>((resolve) => blocker.listen(Number(f.env.PORT), '127.0.0.1', resolve));
    await assert.rejects(startApplication(f.env), /SERVER_LISTEN_FAILED/);
    app = await startApplication({ ...f.env, PORT: String(await port()) });
    assert.equal(app.server.listening, true);
  } finally {
    await app?.stop();
    await new Promise<void>((resolve) => blocker.close(() => resolve()));
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Origin is immutable and trust-proxy function recognizes only explicit IPs', () => {
  const env = {
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    DATA_DIR: '/private/tmp/friday-origin-data',
    LOG_DIR: '/private/tmp/friday-origin-logs',
    SQLITE_DB_PATH: '/private/tmp/friday-origin-data/local.sqlite',
    APP_ORIGIN: 'https://tasks.example.test',
    TRUSTED_PROXY: '127.0.0.1',
  };
  const app = createApp(undefined, parseConfiguration(env));
  assert.equal(app.locals.appOrigin, 'https://tasks.example.test');
  const trust = app.get('trust proxy fn') as (address: string, index: number) => boolean;
  assert.equal(trust('127.0.0.1', 0), true);
  assert.equal(trust('198.51.100.1', 0), false);
  assert.equal(trust('198.51.100.1', 1), false);
  const untrusted = createApp(undefined, parseConfiguration({ ...env, TRUSTED_PROXY: '' }));
  assert.equal(
    (untrusted.get('trust proxy fn') as (address: string) => boolean)('127.0.0.1'),
    false,
  );
});
test('SQL connection failure never falls back to SQLite or creates a local DB', async () => {
  const f = await fixture();
  let called = false;
  try {
    const env = {
      ...f.env,
      DB_PROVIDER: 'sqlserver',
      DB_SERVER: 'db.example.test',
      DB_NAME: 'fixture_test',
      DB_USER: 'fixture',
      DB_PASSWORD: 'synthetic-secret',
    };
    await assert.rejects(
      openDatabase('sqlserver', {
        env,
        connectSql: async (options) => {
          called = true;
          assert.equal(options.server, 'db.example.test');
          throw new Error('driver synthetic-secret');
        },
      }),
    );
    assert(called);
    assert.deepEqual(await readdir(f.env.DATA_DIR), []);
    await assert.rejects(openDatabase('sqlite', { env }), /PROVIDER_MISMATCH/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Kernel instance guard releases on process crash; no stale PID/lock file is deleted', async () => {
  const f = await fixture();
  const child = spawn(process.execPath, ['--import', 'tsx', resolve('src/api/main.ts')], {
    env: { ...process.env, ...f.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let app: Awaited<ReturnType<typeof startApplication>> | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Child startup timeout')), 8000);
      child.stdout.on('data', (data) => {
        if (data.toString().includes('foundation_started')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.once('exit', () => {
        clearTimeout(timer);
        reject(new Error('Child exited before startup'));
      });
    });
    await assert.rejects(
      startApplication({ ...f.env, PORT: String(await port()) }),
      /INSTANCE_GUARD/,
    );
    const exit = once(child, 'exit');
    child.kill('SIGKILL');
    await exit;
    app = await startApplication({ ...f.env, PORT: String(await port()) });
    assert.equal(app.server.listening, true);
    assert.deepEqual(await readdir(f.env.DATA_DIR), []);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      const exit = once(child, 'exit');
      child.kill('SIGKILL');
      await exit;
    }
    await app?.stop();
    await rm(f.root, { recursive: true, force: true });
  }
});
