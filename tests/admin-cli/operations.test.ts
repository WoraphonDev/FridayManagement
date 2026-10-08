import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  realpathSync,
  mkdirSync,
  chmodSync,
  rmSync,
  symlinkSync,
  linkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { parseConfiguration } from '../../src/config/config.js';
import { checkLocalAuthority } from '../../src/cli/authority.js';
import { parseInstallerArguments } from '../../src/cli/admin.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { seed } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { acquireLocalInstance } from '../../src/config/instance.js';
import { createApp } from '../../src/api/app.js';
const posix =
  process.platform === 'win32' ? 'NOT_RUN: real Windows terminal/DACL evidence required' : false;
const args = (action = 'force-logout', id = 2, username = 'Member') => [
  action,
  '--user-id',
  String(id),
  '--confirm-user',
  username,
  '--confirm-local-maintenance',
];
async function fixture() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'friday-installer-'))),
    data = join(root, 'data'),
    logs = join(root, 'logs'),
    path = join(data, 'fixture.sqlite');
  mkdirSync(data, { mode: 0o700 });
  mkdirSync(logs, { mode: 0o700 });
  writeFileSync(path, '', { mode: 0o600 });
  const db = new SqliteDatabase(path);
  await migrate(db);
  await db.transaction(seed);
  chmodSync(path, 0o600);
  const f = await sessionFixture(async () => ({
    db,
    reopen: async () => db,
    close: () => db.close(),
  }));
  return {
    ...f,
    root,
    path,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: data,
      LOG_DIR: logs,
      SQLITE_DB_PATH: path,
    },
    dispose: async () => {
      await db.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
function child(command: string[], env: NodeJS.ProcessEnv, input?: unknown) {
  return new Promise<{ code: number; output: string; stdout?: string; sent?: number }>(
    (res, rej) => {
      const job = spawn(command[0]!, command.slice(1), { env, stdio: ['pipe', 'pipe', 'pipe'] });
      let output = '',
        errors = '';
      const timer = setTimeout(() => {
        job.kill();
        rej(new Error('installer child timeout'));
      }, 25000);
      job.stdout.on('data', (d) => (output += String(d)));
      job.stderr.on('data', (d) => (errors += String(d)));
      job.on('error', (e) => {
        clearTimeout(timer);
        rej(e);
      });
      job.on('exit', (code) => {
        clearTimeout(timer);
        if (input !== undefined) {
          if (code === 0) res(JSON.parse(output));
          else rej(new Error(errors));
        } else res({ code: code ?? 1, output: output + errors, stdout: output });
      });
      job.stdin.end(input === undefined ? '' : JSON.stringify(input));
    },
  );
}
const command = (argv = args()) =>
  process.env.FRIDAY_CLI_BUILT === '1'
    ? [process.execPath, resolve('dist/server/cli/main.js'), ...argv]
    : [process.execPath, '--import', 'tsx', resolve('src/cli/main.ts'), ...argv];
test('T019 strict CLI allowlist rejects password arguments/duplicates/missing confirmation without echoing values', () => {
  assert.deepEqual(parseInstallerArguments(args()), {
    action: 'force-logout',
    userId: 2,
    confirmUser: 'Member',
  });
  for (const argv of [
    args().slice(0, -1),
    [...args(), '--password', 'private-fixture'],
    ['recover-admin', '--user-id', '2', '--user-id', '2', '--confirm-local-maintenance'],
    args('force-logout', 0),
    args('unknown'),
  ])
    assert.throws(() => parseInstallerArguments(argv));
});
test(
  'T019 real filesystem owner/modes/symlink/hardlink/environment-file permissions fail closed',
  { skip: posix },
  async () => {
    const f = await fixture();
    try {
      const config = parseConfiguration(f.env);
      await checkLocalAuthority(config);
      chmodSync(f.path, 0o644);
      await assert.rejects(checkLocalAuthority(config));
      chmodSync(f.path, 0o600);
      const link = join(f.root, 'linked.sqlite');
      symlinkSync(f.path, link);
      await assert.rejects(
        checkLocalAuthority({ ...config, database: { provider: 'sqlite', path: link } }),
      );
      const hard = join(f.root, 'hard.sqlite');
      linkSync(f.path, hard);
      await assert.rejects(checkLocalAuthority(config));
      rmSync(hard);
      const envFile = join(f.root, 'private.env');
      writeFileSync(envFile, 'DB_PROVIDER=sqlite\n', { mode: 0o644 });
      await assert.rejects(checkLocalAuthority(config, [envFile]));
      chmodSync(envFile, 0o600);
      await checkLocalAuthority(config, [envFile]);
      chmodSync(f.root, 0o777);
      await assert.rejects(checkLocalAuthority(config));
      chmodSync(f.root, 0o700);
      chmodSync(config.dataDirectory, 0o755);
      await assert.rejects(checkLocalAuthority(config));
    } finally {
      await f.dispose();
    }
  },
);
test(
  'T019 real CLI force logout revokes sessions and redacts argument failures; recovery requires TTY',
  { skip: posix },
  async () => {
    const f = await fixture();
    try {
      const old = await f.service.login({ username: 'Member', password }, '127.0.0.1');
      const result = await child(command(), f.env);
      assert.equal(result.code, 0);
      assert.equal(JSON.parse(result.stdout!).status, 'completed');
      assert.equal(await f.service.principal(tokenDigest(old.token)), null);
      const wrong = await child(
        command([...args(), '--password', 'private-fixture-secret']),
        f.env,
      );
      assert.equal(wrong.code, 1);
      assert(!wrong.output.includes('private-fixture-secret'));
      const piped = await child(command(args('recover-admin')), f.env);
      assert.equal(piped.code, 1);
      assert(piped.output.includes('INTERACTIVE_TTY_REQUIRED'));
    } finally {
      await f.dispose();
    }
  },
);
test(
  'T019 running application guard prevents installer and remains owned until released',
  { skip: posix },
  async () => {
    const f = await fixture();
    const release = await acquireLocalInstance(parseConfiguration(f.env));
    try {
      const result = await child(command(), f.env);
      assert.equal(result.code, 1);
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
    } finally {
      await release();
      await f.dispose();
    }
  },
);
test(
  'T019 actual hidden PTY recovery succeeds without password/hash in stdout/argv/env; old session revoked',
  { skip: posix },
  async () => {
    const f = await fixture();
    const temp = 'PTY-fixture-secret-12';
    try {
      const old = await f.service.login({ username: 'Member', password }, '127.0.0.1');
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=2')));
      const cmd = command(args('recover-admin'));
      assert(!JSON.stringify(cmd).includes(temp));
      assert(!JSON.stringify(f.env).includes(temp));
      const result = await child(
        ['python3', resolve('tests/admin-cli/terminal_fixture.py')],
        f.env,
        {
          command: cmd,
          env: f.env,
          inputs: [temp, temp],
        },
      );
      assert.equal(result.code, 0);
      assert.equal(result.sent, 2);
      assert(!result.output.includes(temp));
      assert(!result.output.includes('scrypt$'));
      assert(result.output.includes('completed'));
      assert.equal(await f.service.principal(tokenDigest(old.token)), null);
      assert(
        (await f.service.login({ username: 'Member', password: temp }, '127.0.0.2')).body
          .must_change_password,
      );
    } finally {
      await f.dispose();
    }
  },
);
test(
  'T019 actual PTY mismatch and Ctrl-C leave password/session/audit untouched',
  { skip: posix },
  async () => {
    const f = await fixture();
    try {
      for (const inputs of [['PTY-fixture-secret-12', 'different-fixture-12'], ['\u0003']]) {
        const result = await child(
          ['python3', resolve('tests/admin-cli/terminal_fixture.py')],
          f.env,
          {
            command: command(args('recover-admin')),
            env: f.env,
            inputs,
          },
        );
        assert.equal(result.code, 1);
      }
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
      assert.equal(
        (await f.service.login({ username: 'Member', password }, '127.0.0.2')).body
          .must_change_password,
        false,
      );
    } finally {
      await f.dispose();
    }
  },
);
test('T019 no unauthenticated public recovery routes were added to real HTTP app', async () => {
  const config = parseConfiguration({
    NODE_ENV: 'test',
    DB_PROVIDER: 'sqlite',
    DATA_DIR: '/private/tmp/cli-route',
    LOG_DIR: '/private/tmp/cli-route-log',
    SQLITE_DB_PATH: '/private/tmp/cli-route/db.sqlite',
  });
  const server = createApp(undefined, config).listen(0, '127.0.0.1');
  await new Promise<void>((r) => server.once('listening', r));
  const a = server.address();
  assert(a && typeof a === 'object');
  try {
    for (const path of [
      '/api/recover-admin',
      '/api/recovery',
      '/api/admin/recover',
      '/api/force-logout',
    ]) {
      const response: Response = await fetch(`http://127.0.0.1:${a.port}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: config.origin },
        body: JSON.stringify({ user_id: 1, password: 'not-used-fixture' }),
      });
      assert.equal(response.status, 404);
    }
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
