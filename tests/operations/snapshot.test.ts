import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { chmod, mkdir, readFile, rm, symlink, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { startupFixture } from '../setup/fixtures.js';
import { seed } from '../schema/fixtures.js';
import { loadConfiguration } from '../../src/config/load.js';
import { sql } from '../../src/repository/access-scope.js';
import {
  createSnapshot,
  restoreSqliteSnapshot,
  upgradeWithSnapshot,
  verifySnapshot,
  digestFile,
  privateDirectory,
} from '../../src/operations/snapshot.js';
import { restoreSql } from '../../src/operations/sql-restore.js';
import { startApplication } from '../../src/api/start.js';
import { migrate } from '../../src/repository/migrate.js';
import { fileService } from '../../src/services/files.js';

async function fixture() {
  const f = await startupFixture();
  await chmod(join(f.root, 'data'), 0o700);
  const config = await loadConfiguration(f.env);
  await chmod(config.logDirectory, 0o700);
  await chmod(f.path, 0o600);
  const db = new SqliteDatabase(f.path);
  await db.transaction(seed);
  const key = randomUUID();
  const bytes = Buffer.from('synthetic attachment');
  const hash = createHash('sha256').update(bytes).digest('hex');
  await mkdir(join(config.dataDirectory, 'attachments'), { mode: 0o700 });
  await writeFile(join(config.dataDirectory, 'attachments', key), bytes, { mode: 0o600 });
  await db.transaction(async (tx) => {
    await tx.execute(
      sql(
        "INSERT INTO dbo.attachments(task_id,uploader_id,original_name,storage_key,bytes,validated_type,sha256) VALUES(1,1,'fixture.txt',@key,@bytes,'text/plain',@hash)",
        { key, bytes: bytes.length, hash },
      ),
    );
    await tx.execute(
      sql('UPDATE dbo.storage_quota SET stored_bytes=@bytes WHERE id=1', { bytes: bytes.length }),
    );
    await tx.execute(
      sql(
        'INSERT INTO dbo.sessions(token_hash,user_id,csrf_token,auth_version,created_at,last_seen_at,absolute_expires_at) VALUES(@hash,1,@csrf,1,@now,@now,@expires)',
        {
          hash: 'b'.repeat(64),
          csrf: 'fixture-only',
          now: new Date().toISOString(),
          expires: new Date(Date.now() + 3600000).toISOString(),
        },
      ),
    );
  });
  return {
    ...f,
    config,
    db,
    key,
    bytes,
    close: async () => {
      await db.close();
      await rm(f.root, { recursive: true, force: true });
    },
  };
}
test('T062/T063 real SQLite snapshot/isolated restore verifies bytes/counts and revokes old sessions', async () => {
  const f = await fixture();
  try {
    const snapshot = join(f.root, 'snapshot');
    await createSnapshot(f.config, f.db, snapshot);
    const manifest = await verifySnapshot(snapshot);
    assert.equal(manifest.attachmentCount, 1);
    assert.equal(manifest.files.length, 2);
    const restored = join(f.root, 'restored');
    const result = await restoreSqliteSnapshot(snapshot, restored);
    assert.equal(result.status, 'complete');
    assert.ok(result.measuredRestoreMs >= 0);
    const db = new SqliteDatabase(join(restored, 'database.sqlite'));
    try {
      await db.transaction(async (tx) => {
        assert.equal((await tx.query(sql('SELECT id FROM dbo.tasks'))).length, 2);
        assert.equal((await tx.query(sql('SELECT token_hash FROM dbo.sessions'))).length, 0);
        assert.equal((await tx.query(sql('SELECT id FROM dbo.maintenance_state'))).length, 0);
        assert.equal(
          (await tx.query(sql('SELECT auth_version FROM dbo.users WHERE id=1')))[0]!.auth_version,
          2,
        );
      });
    } finally {
      await db.close();
    }
    assert.deepEqual(await readFile(join(restored, 'attachments', f.key)), f.bytes);
    await assert.rejects(restoreSqliteSnapshot(snapshot, restored), /EEXIST/);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT token_hash FROM dbo.sessions')))).length,
      1,
    );
  } finally {
    await f.close();
  }
});
test('T062 failed/tampered snapshot cannot publish or overwrite; thaw remains owned and secrets excluded', async () => {
  const f = await fixture();
  try {
    await writeFile(join(f.config.dataDirectory, 'attachments', f.key), 'tampered');
    await assert.rejects(
      createSnapshot(f.config, f.db, join(f.root, 'bad')),
      /ATTACHMENT_CHECKSUM_FAILED/,
    );
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.maintenance_state'))))
        .length,
      0,
    );
    assert.ok(!(await readdir(f.root)).some((name) => name.includes('.partial-')));
    await writeFile(join(f.config.dataDirectory, 'attachments', f.key), f.bytes);
    const snapshot = join(f.root, 'good');
    await createSnapshot(f.config, f.db, snapshot);
    assert.deepEqual((await readdir(snapshot)).sort(), [
      'attachments',
      'database.sqlite',
      'manifest.json',
    ]);
    await assert.rejects(createSnapshot(f.config, f.db, snapshot), /SNAPSHOT_TARGET_EXISTS/);
    await writeFile(join(snapshot, 'attachments', f.key), 'tampered');
    await assert.rejects(
      restoreSqliteSnapshot(snapshot, join(f.root, 'not-created')),
      /SNAPSHOT_CHECKSUM_FAILED/,
    );
  } finally {
    await f.close();
  }
});
test('T064 pre-upgrade snapshot, transactional legacy upgrade, repeat migration and isolated rollback preserve existing data/files', async () => {
  const f = await fixture();
  const migrationRoot = join(f.root, 'legacy-migrations');
  try {
    // The legacy schema is created from genuine first two migrations, not a fake ledger.
    await f.db.close();
    await rm(f.path);
    await mkdir(join(migrationRoot, 'sqlite'), { recursive: true });
    for (const name of ['0000_foundation.sql', '0001_business_schema.sql'])
      await writeFile(
        join(migrationRoot, 'sqlite', name),
        await readFile(resolve('migrations/sqlite', name)),
      );
    f.db = new SqliteDatabase(f.path);
    await migrate(f.db, migrationRoot);
    await f.db.transaction((tx) => seed(tx, 'blocked'));
    await f.db.transaction(async (tx) => {
      await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=1'));
      await tx.execute(sql("UPDATE dbo.tasks SET status='blocked' WHERE id=1"));
      await tx.execute(
        sql(
          "INSERT INTO dbo.board_positions(task_id,project_id,status,rank) VALUES(1,1,'blocked',1)",
        ),
      );
      await tx.execute(
        sql(
          "INSERT INTO dbo.attachments(task_id,uploader_id,original_name,storage_key,bytes,validated_type,sha256) VALUES(1,1,'fixture.txt',@key,@bytes,'text/plain',@hash)",
          {
            key: f.key,
            bytes: f.bytes.length,
            hash: createHash('sha256').update(f.bytes).digest('hex'),
          },
        ),
      );
      await tx.execute(
        sql('UPDATE dbo.storage_quota SET stored_bytes=@bytes WHERE id=1', {
          bytes: f.bytes.length,
        }),
      );
    });
    const snapshot = join(f.root, 'pre-upgrade');
    await upgradeWithSnapshot(f.config, f.db, snapshot);
    assert.deepEqual(await migrate(f.db), []);
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT status FROM dbo.tasks WHERE id=1'))))[0]!
        .status,
      'review',
    );
    const restored = join(f.root, 'rollback');
    await restoreSqliteSnapshot(snapshot, restored);
    assert.deepEqual(await readFile(join(restored, 'attachments', f.key)), f.bytes);
    const db = new SqliteDatabase(join(restored, 'database.sqlite'));
    try {
      assert.equal(
        (await db.transaction((tx) => tx.query(sql('SELECT status FROM dbo.tasks WHERE id=1'))))[0]!
          .status,
        'blocked',
      );
    } finally {
      await db.close();
    }
  } finally {
    await f.db.close();
    await rm(f.root, { recursive: true, force: true });
  }
});
test('T061 actual HTTP rejects admitted mutations while frozen; /me remains read-only and startup refuses a stale freeze', async () => {
  const f = await fixture();
  await f.db.close();
  const app = await startApplication(f.env);
  try {
    const thaw = await app.maintenance!.freeze();
    const response = await fetch(f.env.APP_ORIGIN + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: f.env.APP_ORIGIN },
      body: JSON.stringify({ username: 'Admin', password: 'synthetic-only-password' }),
    });
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'MAINTENANCE');
    assert.equal((await fetch(f.env.APP_ORIGIN + '/health/live')).status, 200);
    await thaw();
    assert.equal((await fetch(f.env.APP_ORIGIN + '/api/me')).status, 401);
    await app.maintenance!.freeze();
    await app.stop();
    await assert.rejects(startApplication(f.env), /MAINTENANCE_RECOVERY_REQUIRED/);
  } finally {
    await app.stop();
    await rm(f.root, { recursive: true, force: true });
  }
});
test('T060 startup recovery preserves referenced bytes while removing orphan/temp blobs', async () => {
  const f = await fixture();
  const orphan = randomUUID();
  try {
    const files = await fileService(f.db, {
      directory: f.config.dataDirectory,
      maxFileBytes: 1024,
      totalUploadBytes: 4096,
    });
    await writeFile(join(f.config.dataDirectory, 'attachments', orphan), 'orphan');
    await writeFile(join(f.config.dataDirectory, 'upload-temp', randomUUID()), 'temp');
    await files.recover();
    assert.deepEqual(await readdir(join(f.config.dataDirectory, 'attachments')), [f.key]);
    assert.deepEqual(await readdir(join(f.config.dataDirectory, 'upload-temp')), []);
    assert.deepEqual(await readFile(join(f.config.dataDirectory, 'attachments', f.key)), f.bytes);
  } finally {
    await f.close();
  }
});
test('T062 checksum reads reject symlinks; SQL restore plan binds paths and never uses REPLACE/system target', async () => {
  const f = await fixture();
  try {
    const link = join(f.root, 'link');
    await symlink(f.path, link);
    await assert.rejects(digestFile(link), /UNSAFE_SNAPSHOT_FILE/);
    const query = restoreSql('Friday_isolated_test', {
      logical_data: 'C:\\isolated\\data.mdf',
      logical_log: 'C:\\isolated\\log.ldf',
    });
    assert.match(query, /DB_ID\(@target\)/);
    assert.match(query, /RESTORE DATABASE/);
    assert.match(query, /MOVE @logical0 TO @physical0/);
    assert.doesNotMatch(query, /WITH REPLACE|C:\\/);
    assert.throws(() => restoreSql('master', { a: '/private/new.mdf' }));
    assert.throws(() => restoreSql('bad];DROP DATABASE x', { a: '/private/new.mdf' }));
  } finally {
    await f.close();
  }
});
test('T061 installer CLI rejects a running instance and emits no connection/credential details', async () => {
  const f = await fixture();
  await f.db.close();
  const app = await startApplication(f.env);
  try {
    await assert.rejects(
      promisify(execFile)(
        process.execPath,
        [
          '--import',
          'tsx',
          'src/operations/main.ts',
          'backup',
          join(f.root, 'must-not-exist'),
          '--confirm-local-maintenance',
        ],
        { env: { ...process.env, ...f.env } },
      ),
      (error: unknown) => {
        const e = error as { stderr: string };
        assert.match(e.stderr, /OPERATIONS_FAILED/);
        assert.doesNotMatch(e.stderr, /synthetic-only-password|ConnectionPool|password=/);
        return true;
      },
    );
  } finally {
    await app.stop();
    await rm(f.root, { recursive: true, force: true });
  }
});
test('T062/T063 installer command creates/verifies/restores a stopped local snapshot end to end', async () => {
  const f = await fixture();
  try {
    const snapshot = join(f.root, 'cli-snapshot');
    const run = promisify(execFile);
    const options = { env: { ...process.env, ...f.env } };
    const saved = await run(
      process.execPath,
      [
        '--import',
        'tsx',
        'src/operations/main.ts',
        'backup',
        snapshot,
        '--confirm-local-maintenance',
      ],
      options,
    );
    assert.equal(JSON.parse(saved.stdout).status, 'complete');
    const verified = await run(
      process.execPath,
      [
        '--import',
        'tsx',
        'src/operations/main.ts',
        'verify',
        snapshot,
        '--confirm-local-maintenance',
      ],
      options,
    );
    assert.equal(JSON.parse(verified.stdout).status, 'verified');
    const target = join(f.root, 'cli-restored');
    const restored = await run(
      process.execPath,
      [
        '--import',
        'tsx',
        'src/operations/main.ts',
        'restore-local',
        target,
        '--confirm-local-maintenance',
      ],
      { env: { ...options.env, FRIDAY_RESTORE_SOURCE: snapshot } },
    );
    assert.equal(JSON.parse(restored.stdout).status, 'complete');
    assert.deepEqual(await readFile(join(target, 'attachments', f.key)), f.bytes);
  } finally {
    await f.close();
  }
});

test(
  'T062 private backup path rejects a replaceable public ancestor',
  {
    skip:
      process.platform === 'win32'
        ? 'POSIX path policy; native Windows DACL checks required'
        : false,
  },
  async () => {
    const f = await fixture();
    try {
      const parent = join(f.root, 'public-parent');
      await mkdir(parent, { mode: 0o777 });
      await chmod(parent, 0o777);
      const child = join(parent, 'private-child');
      await mkdir(child, { mode: 0o700 });
      await assert.rejects(privateDirectory(child), /PRIVATE_SNAPSHOT_ANCESTOR_REQUIRED/);
    } finally {
      await f.close();
    }
  },
);

test('T074 clean restored application old-cookie revoke, real Member scope/download and restart persistence', async () => {
  const f = await fixture();
  const { hashPassword } = await import('../../src/security/passwords.js');
  const { sessionHooks } = await import('../../src/api/sessions.js');
  const { createApp } = await import('../../src/api/app.js');
  const { insert } = await import('../schema/fixtures.js');
  const password = `Restore-${randomUUID()}`,
    encoded = await hashPassword(password);
  let restoredApp: Awaited<ReturnType<typeof startApplication>> | undefined;
  let server: ReturnType<ReturnType<typeof createApp>['listen']> | undefined;
  try {
    await f.db.transaction(async (tx) => {
      await tx.execute(
        sql('UPDATE dbo.users SET password_hash=@hash,must_change_password=0', { hash: encoded }),
      );
      for (const id of [1, 2])
        await tx.execute(
          insert('user_view_revisions', {
            user_id: id,
            revision: randomUUID(),
            updated_at: new Date().toISOString(),
          }),
        );
      await tx.execute(
        insert('project_members', { project_id: 1, user_id: 2, access: 'editor', added_by: 1 }),
      );
      await tx.execute(
        insert('tasks', { project_id: 2, title: 'PRIVATE_ONLY_RESTORE', creator_id: 1 }),
      );
      await tx.execute(
        insert('board_positions', { project_id: 2, task_id: 3, status: 'todo', rank: 1 }),
      );
    });
    server = createApp(
      undefined,
      f.config,
      await sessionHooks(f.db, {
        cookieSecure: false,
        storage: {
          directory: f.config.dataDirectory,
          maxFileBytes: 10485760,
          totalUploadBytes: 5368709120,
        },
      }),
    ).listen(Number(f.env.PORT), '127.0.0.1');
    await new Promise<void>((r, j) => {
      server!.once('listening', r);
      server!.once('error', j);
    });
    const login = async (base: string) => {
      const response = await fetch(base + '/api/login', {
        method: 'POST',
        headers: { Origin: f.env.APP_ORIGIN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'Member', password }),
      });
      assert.equal(response.status, 200);
      const self = await response.json();
      return { cookie: response.headers.get('set-cookie')!.split(';')[0]!, csrf: self.csrf };
    };
    const old = await login(f.env.APP_ORIGIN);
    server.closeAllConnections();
    await new Promise<void>((r, j) => server!.close((e) => (e ? j(e) : r())));
    server = undefined;
    const snapshot = join(f.root, 'T074-snapshot');
    await createSnapshot(f.config, f.db, snapshot);
    const target = join(f.root, 'T074-restored');
    await restoreSqliteSnapshot(snapshot, target);
    const env = {
      ...f.env,
      DATA_DIR: target,
      LOG_DIR: join(target, 'logs'),
      SQLITE_DB_PATH: join(target, 'database.sqlite'),
    };
    restoredApp = await startApplication(env);
    assert.equal(
      (await fetch(f.env.APP_ORIGIN + '/api/me', { headers: { Cookie: old.cookie } })).status,
      401,
    );
    const fresh = await login(f.env.APP_ORIGIN),
      headers = { Cookie: fresh.cookie };
    assert.equal((await fetch(f.env.APP_ORIGIN + '/health/ready')).status, 200);
    assert.equal((await fetch(f.env.APP_ORIGIN + '/api/tasks/3', { headers })).status, 404);
    assert.equal((await fetch(f.env.APP_ORIGIN + '/api/audit', { headers })).status, 403);
    const download = await fetch(f.env.APP_ORIGIN + '/api/attachments/1/download', { headers });
    assert.equal(download.status, 200);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), f.bytes);
    const changed = await fetch(f.env.APP_ORIGIN + '/api/tasks/1', {
      method: 'PATCH',
      headers: {
        ...headers,
        Origin: f.env.APP_ORIGIN,
        'Content-Type': 'application/json',
        'X-CSRF-Token': fresh.csrf,
        'Idempotency-Key': randomUUID(),
      },
      body: JSON.stringify({ version: 1, title: 'Restored member edit' }),
    });
    assert.equal(changed.status, 200);
    await restoredApp.stop();
    restoredApp = undefined;
    restoredApp = await startApplication(env);
    const persisted = await fetch(f.env.APP_ORIGIN + '/api/tasks/1', { headers });
    assert.equal(persisted.status, 200);
    assert.equal((await persisted.json()).item.title, 'Restored member edit');
    const again = await fetch(f.env.APP_ORIGIN + '/api/attachments/1/download', { headers });
    assert.equal(again.status, 200);
    assert.deepEqual(Buffer.from(await again.arrayBuffer()), f.bytes);
    assert.equal((await fetch(f.env.APP_ORIGIN + '/health/live')).status, 200);
  } finally {
    try {
      if (server) {
        server.closeAllConnections();
        await new Promise<void>((r) => server!.close(() => r()));
      }
    } finally {
      try {
        await restoredApp?.stop();
      } finally {
        await f.close();
      }
    }
  }
});
