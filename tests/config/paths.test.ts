import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, symlink, writeFile, readdir, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseConfiguration } from '../../src/config/config.js';
import { preparePaths } from '../../src/config/paths.js';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'friday-paths-')),
    source = join(root, 'source'),
    data = join(root, 'data'),
    logs = join(root, 'logs');
  await mkdir(source);
  return {
    root,
    source,
    data,
    logs,
    env: {
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: data,
      LOG_DIR: logs,
      SQLITE_DB_PATH: join(data, 'local.sqlite'),
    },
  };
}
test('Paths are canonical, writable, outside source; probe files are removed and no database is created', async () => {
  const f = await fixture();
  try {
    const c = await preparePaths(parseConfiguration(f.env), f.source);
    assert.notEqual(c.dataDirectory, c.logDirectory);
    assert.deepEqual(await readdir(f.data), []);
    assert.deepEqual(await readdir(f.logs), []);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Relative paths and source/build/webroot descendants or ancestors are rejected', async () => {
  const f = await fixture();
  try {
    for (const key of ['DATA_DIR', 'LOG_DIR', 'SQLITE_DB_PATH'])
      assert.throws(() => parseConfiguration({ ...f.env, [key]: 'relative/path' }));
    for (const [key, path] of [
      ['DATA_DIR', f.source],
      ['LOG_DIR', join(f.source, 'dist')],
      ['DATA_DIR', f.root],
      ['LOG_DIR', f.root],
    ])
      await assert.rejects(preparePaths(parseConfiguration({ ...f.env, [key!]: path }), f.source));
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Existing symlink/junction back into source is rejected before directories or files are created', async () => {
  const f = await fixture();
  try {
    const alias = join(f.root, 'alias');
    await symlink(f.source, alias, 'dir');
    await assert.rejects(
      preparePaths(
        parseConfiguration({
          ...f.env,
          DATA_DIR: alias,
          SQLITE_DB_PATH: join(alias, 'local.sqlite'),
        }),
        f.source,
      ),
    );
    assert.deepEqual(await readdir(f.source), []);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('SQLite outside DATA_DIR, directory path, logs/uploads/temp locations are rejected', async () => {
  const f = await fixture();
  try {
    await mkdir(f.data);
    for (const path of [
      f.data,
      join(f.root, 'other.sqlite'),
      join(f.logs, 'local.sqlite'),
      join(f.data, 'uploads', 'local.sqlite'),
      join(f.data, 'temp', 'local.sqlite'),
    ])
      await assert.rejects(
        preparePaths(parseConfiguration({ ...f.env, SQLITE_DB_PATH: path }), f.source),
      );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Dangling database symlink cannot create a database in source or outside storage', async () => {
  const f = await fixture();
  try {
    await mkdir(f.data);
    await symlink(join(f.source, 'missing.sqlite'), join(f.data, 'local.sqlite'));
    await assert.rejects(preparePaths(parseConfiguration(f.env), f.source));
    assert.deepEqual(await readdir(f.source), []);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Database aliases into source and hardlinked database files are rejected', async () => {
  const f = await fixture();
  try {
    await mkdir(f.data);
    await writeFile(join(f.source, 'existing.sqlite'), 'synthetic');
    await symlink(join(f.source, 'existing.sqlite'), join(f.data, 'local.sqlite'));
    await assert.rejects(preparePaths(parseConfiguration(f.env), f.source));
    await rm(join(f.data, 'local.sqlite'));
    await link(join(f.source, 'existing.sqlite'), join(f.data, 'local.sqlite'));
    await assert.rejects(preparePaths(parseConfiguration(f.env), f.source));
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('File-as-directory/unwritable path fails with only configuration key names', async () => {
  const f = await fixture();
  try {
    await writeFile(f.data, 'synthetic');
    await assert.rejects(
      preparePaths(parseConfiguration(f.env), f.source),
      (error) => error instanceof Error && !error.message.includes(f.root),
    );
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
test('Remote SQL backup paths are parsed but never created/probed on app host', async () => {
  const f = await fixture();
  try {
    const c = parseConfiguration({
      ...f.env,
      DB_PROVIDER: 'sqlserver',
      DB_SERVER: 'db.test',
      DB_NAME: 'fixture_test',
      DB_USER: 'fixture',
      DB_PASSWORD: 'synthetic',
      DB_BACKUP_DIR: 'C:\\SqlRemoteBackup',
    });
    assert.equal((await preparePaths(c, f.source)).database.provider, 'sqlserver');
    assert(!(await readdir(f.root)).some((name) => name.includes('SqlRemoteBackup')));
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
