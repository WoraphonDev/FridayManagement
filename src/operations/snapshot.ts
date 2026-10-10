import { createHash, randomUUID } from 'node:crypto';
import { DatabaseSync, backup } from 'node:sqlite';
import {
  copyFile,
  lstat,
  stat,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  chmod,
  open,
} from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants } from 'node:fs';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import type { Database } from '../domain/database.js';
import type { AppConfig } from '../config/config.js';
import { sqlServerOptions } from '../config/sql-options.js';
import { sql } from '../repository/access-scope.js';
import { runTransaction } from '../domain/transaction.js';
import { SqliteDatabase } from '../repository/sqlite/database.js';
import { migrate } from '../repository/migrate.js';
import { Maintenance } from './maintenance.js';

interface Entry {
  path: string;
  bytes: number;
  sha256: string;
}
interface Ledger {
  id: string;
  sha256: string;
}
interface Manifest {
  format: 1;
  provider: 'sqlite' | 'sqlserver' | 'postgres';
  appVersion: string;
  createdAt: string;
  schema: Ledger[];
  files: Entry[];
  attachmentCount: number;
}
export async function digestFile(path: string) {
  const info = await lstat(path);
  if (!info.isFile() || info.isSymbolicLink() || info.nlink !== 1)
    throw new Error('UNSAFE_SNAPSHOT_FILE');
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const hash = createHash('sha256');
    let bytes = 0;
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    return { bytes, sha256: hash.digest('hex') };
  } finally {
    await handle.close();
  }
}
export async function verifyLedger(database: Database) {
  const rows = await runTransaction(database, (tx) =>
    tx.query<{ id: string; sha256: string }>(
      sql('SELECT id,sha256 FROM dbo.schema_migrations ORDER BY id'),
    ),
  );
  await compatibleLedger(database.provider, rows);
  return rows;
}
async function compatibleLedger(provider: string, rows: Ledger[]) {
  const root = resolve('migrations', provider);
  const names = (await readdir(root)).filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name)).sort();
  if (!rows.length || rows.length > names.length) throw new Error('SCHEMA_INCOMPATIBLE');
  for (const [index, row] of rows.entries())
    if (
      row.id !== names[index] ||
      row.sha256 !==
        createHash('sha256')
          .update(await readFile(join(root, row.id)))
          .digest('hex')
    )
      throw new Error('SCHEMA_INCOMPATIBLE');
}
export async function privateDirectory(path: string) {
  // Require a private existing parent; never follow a supplied symlink.
  const info = await lstat(path);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    (process.platform !== 'win32' &&
      ((info.mode & 0o077) !== 0 ||
        (process.geteuid?.() !== 0 && info.uid !== process.geteuid?.())))
  )
    throw new Error('PRIVATE_SNAPSHOT_PARENT_REQUIRED');
  if (process.platform !== 'win32') {
    const trusted = new Set([0, process.geteuid?.(), info.uid]);
    let parent = dirname(resolve(path));
    for (;;) {
      const ancestor = await stat(parent);
      if (
        !ancestor.isDirectory() ||
        !trusted.has(ancestor.uid) ||
        ((ancestor.mode & 0o022) !== 0 && !(ancestor.uid === 0 && (ancestor.mode & 0o1000) !== 0))
      )
        throw new Error('PRIVATE_SNAPSHOT_ANCESTOR_REQUIRED');
      const next = dirname(parent);
      if (next === parent) break;
      parent = next;
    }
  }
  if (process.platform === 'win32') {
    const script = `$ErrorActionPreference='Stop';try{$identity=[Security.Principal.WindowsIdentity]::GetCurrent();$sid=$identity.User.Value;$principal=[Security.Principal.WindowsPrincipal]::new($identity);$acl=Get-Acl -LiteralPath $env:FRIDAY_PRIVATE_PATH;$owner=([Security.Principal.NTAccount]::new($acl.Owner)).Translate([Security.Principal.SecurityIdentifier]).Value;if($sid -ne $owner -and $sid -ne 'S-1-5-18' -and -not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){exit 1};foreach($rule in $acl.GetAccessRules($true,$true,[Security.Principal.SecurityIdentifier])){if($rule.AccessControlType -eq 'Allow' -and $rule.IdentityReference.Value -notin @($sid,$owner,'S-1-5-18','S-1-5-32-544')){exit 1}};exit 0}catch{exit 1}`;
    await promisify(execFile)(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 5000, windowsHide: true, env: { ...process.env, FRIDAY_PRIVATE_PATH: path } },
    );
  }
}
export async function createSnapshot(
  config: AppConfig,
  database: Database,
  destination: string,
  assertAuthority: () => void = () => {},
) {
  const target = resolve(destination);
  await privateDirectory(dirname(target));
  // Never overwrite an existing backup, including a partial or symlink target.
  try {
    await lstat(target);
    throw new Error('SNAPSHOT_TARGET_EXISTS');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const stage = join(target, '.partial-' + randomUUID());
  const thaw = await new Maintenance(database).freeze();
  let created = false,
    complete = false;
  try {
    assertAuthority();
    const schema = await verifyLedger(database);
    await privateDirectory(join(config.dataDirectory, 'attachments'));
    const reservations = await runTransaction(database, (tx) =>
      tx.query(sql('SELECT id FROM dbo.upload_reservations')),
    );
    if (reservations.length) throw new Error('UPLOAD_RECOVERY_REQUIRED');
    await mkdir(target, { mode: 0o700 });
    created = true;
    await mkdir(stage, { mode: 0o700 });
    await mkdir(join(stage, 'attachments'), { mode: 0o700 });
    const files: Entry[] = [];
    const dbName = config.database.provider === 'sqlite' ? 'database.sqlite' : 'database.bak';
    if (config.database.provider === 'sqlite') {
      const source = new DatabaseSync(config.database.path, { readOnly: true });
      try {
        await backup(source, join(stage, dbName));
      } finally {
        source.close();
      }
    } else if (config.database.provider === 'postgres') {
      // pg_dump (custom format) from the app host; credentials go only through the environment.
      const d = config.database;
      await promisify(execFile)(
        'pg_dump',
        [
          '--format=custom',
          '--no-owner',
          '--no-privileges',
          `--file=${join(stage, dbName)}`,
          `--host=${d.server}`,
          `--port=${d.port}`,
          `--username=${d.user}`,
          d.name,
        ],
        {
          env: { ...process.env, PGPASSWORD: d.password, PGSSLMODE: d.encrypt ? 'require' : 'disable' },
          maxBuffer: 1024 * 1024,
        },
      );
    } else {
      // The app and SQL service must both access this configured backup directory.
      if (!isAbsolute(config.database.backupDirectory)) throw new Error('SQL_BACKUP_PATH_REQUIRED');
      await privateDirectory(config.database.backupDirectory);
      const sqlDriver = (await import('mssql')).default;
      const pool = await new sqlDriver.ConnectionPool({
        ...sqlServerOptions(config.database),
        requestTimeout: 3600000,
      }).connect();
      const remote = join(config.database.backupDirectory, `friday-${randomUUID()}.bak`);
      try {
        await pool
          .request()
          .input('path', sqlDriver.NVarChar(4000), remote)
          .query(
            `BACKUP DATABASE [${config.database.name.replaceAll(']', ']]')}] TO DISK=@path WITH COPY_ONLY, CHECKSUM, STOP_ON_ERROR`,
          );
        await copyFile(remote, join(stage, dbName), constants.COPYFILE_EXCL);
        // SQL output remains under the installer-controlled backup retention policy.
      } finally {
        await pool.close();
      }
    }
    await chmod(join(stage, dbName), 0o600);
    files.push({ path: dbName, ...(await digestFile(join(stage, dbName))) });
    const attachments = await runTransaction(database, (tx) =>
      tx.query<{ storage_key: string; bytes: number; sha256: string }>(
        sql('SELECT storage_key,bytes,sha256 FROM dbo.attachments ORDER BY storage_key'),
      ),
    );
    for (const file of attachments) {
      if (!/^[0-9a-f-]{36}$/i.test(file.storage_key)) throw new Error('INVALID_STORAGE_KEY');
      const path = 'attachments/' + file.storage_key;
      const original = await digestFile(join(config.dataDirectory, path));
      if (original.bytes !== file.bytes || original.sha256 !== file.sha256)
        throw new Error('ATTACHMENT_CHECKSUM_FAILED');
      await copyFile(join(config.dataDirectory, path), join(stage, path), constants.COPYFILE_EXCL);
      await chmod(join(stage, path), 0o600);
      const actual = await digestFile(join(stage, path));
      if (actual.bytes !== file.bytes || actual.sha256 !== file.sha256)
        throw new Error('ATTACHMENT_CHECKSUM_FAILED');
      files.push({ path, ...actual });
      assertAuthority();
    }
    const version: unknown = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version;
    if (typeof version !== 'string') throw new Error('APP_VERSION_INVALID');
    const manifest: Manifest = {
      format: 1,
      provider: database.provider,
      appVersion: version,
      createdAt: new Date().toISOString(),
      schema,
      files,
      attachmentCount: attachments.length,
    };
    const handle = await open(join(stage, 'manifest.json'), 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(manifest, null, 2) + '\n');
      await handle.sync();
    } finally {
      await handle.close();
    }
    assertAuthority();
    // mkdir reserves a new destination atomically; publish the complete marker last.
    await rename(join(stage, 'attachments'), join(target, 'attachments'));
    await rename(join(stage, dbName), join(target, dbName));
    await rename(join(stage, 'manifest.json'), join(target, 'manifest.json'));
    complete = true;
    return {
      status: 'complete',
      provider: database.provider,
      fileCount: files.length,
      createdAt: manifest.createdAt,
    };
  } finally {
    await rm(stage, { recursive: true, force: true });
    if (created && !complete) await rm(target, { recursive: true, force: true });
    assertAuthority();
    await thaw();
  }
}
export async function verifySnapshot(source: string): Promise<Manifest> {
  const root = resolve(source);
  await privateDirectory(root);
  await privateDirectory(join(root, 'attachments'));
  await digestFile(join(root, 'manifest.json'));
  const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8')) as Manifest;
  const version: unknown = JSON.parse(await readFile(resolve('package.json'), 'utf8')).version;
  if (
    manifest.format !== 1 ||
    !['sqlite', 'sqlserver'].includes(manifest.provider) ||
    manifest.appVersion !== version ||
    !Array.isArray(manifest.schema) ||
    !Array.isArray(manifest.files) ||
    !Number.isInteger(manifest.attachmentCount) ||
    manifest.attachmentCount < 0 ||
    !Number.isFinite(Date.parse(manifest.createdAt))
  )
    throw new Error('MANIFEST_INVALID');
  await compatibleLedger(manifest.provider, manifest.schema);
  const expectedDb = manifest.provider === 'sqlite' ? 'database.sqlite' : 'database.bak';
  const seen = new Set<string>();
  for (const item of manifest.files) {
    if (
      typeof item.path !== 'string' ||
      !(item.path === expectedDb || /^attachments\/[0-9a-f-]{36}$/i.test(item.path)) ||
      seen.has(item.path) ||
      !Number.isSafeInteger(item.bytes) ||
      item.bytes < 0 ||
      !/^[0-9a-f]{64}$/.test(item.sha256)
    )
      throw new Error('MANIFEST_INVALID');
    seen.add(item.path);
    const actual = await digestFile(join(root, item.path));
    if (actual.bytes !== item.bytes || actual.sha256 !== item.sha256)
      throw new Error('SNAPSHOT_CHECKSUM_FAILED');
  }
  if (!seen.has(expectedDb) || seen.size !== manifest.attachmentCount + 1)
    throw new Error('MANIFEST_INVALID');
  return manifest;
}
/** Always restore into a new isolated directory; never overwrite or switch a live deployment. */
export async function restoreSqliteSnapshot(source: string, destination: string) {
  const started = Date.now();
  const manifest = await verifySnapshot(source);
  if (manifest.provider !== 'sqlite') throw new Error('SQL_RESTORE_REQUIRES_ISOLATED_PLAN');
  const target = resolve(destination);
  await privateDirectory(dirname(target));
  await mkdir(target, { mode: 0o700 });
  let database: SqliteDatabase | undefined;
  try {
    await mkdir(join(target, 'attachments'), { mode: 0o700 });
    for (const file of manifest.files) {
      await copyFile(
        join(resolve(source), file.path),
        join(target, file.path),
        constants.COPYFILE_EXCL,
      );
      await chmod(join(target, file.path), 0o600);
    }
    database = new SqliteDatabase(join(target, 'database.sqlite'));
    const restoredLedger = await verifyLedger(database);
    if (JSON.stringify(restoredLedger) !== JSON.stringify(manifest.schema))
      throw new Error('MANIFEST_SCHEMA_MISMATCH');
    const rows = await runTransaction(database, async (tx) => {
      await tx.execute(sql('DELETE FROM dbo.sessions'));
      await tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1'));
      await tx.execute(sql('DELETE FROM dbo.idempotency_keys'));
      await tx.execute(sql('DELETE FROM dbo.maintenance_state'));
      return tx.query<{ storage_key: string; bytes: number; sha256: string }>(
        sql('SELECT storage_key,bytes,sha256 FROM dbo.attachments ORDER BY storage_key'),
      );
    });
    if (
      rows.length !== manifest.attachmentCount ||
      rows.some(
        (row) =>
          !manifest.files.some(
            (entry) =>
              entry.path === 'attachments/' + row.storage_key &&
              entry.bytes === row.bytes &&
              entry.sha256 === row.sha256,
          ),
      )
    )
      throw new Error('MANIFEST_ATTACHMENTS_MISMATCH');
    await database.close();
    database = undefined;
    return {
      status: 'complete',
      provider: 'sqlite',
      attachments: rows.length,
      measuredRestoreMs: Date.now() - started,
      snapshotAgeMs: started - Date.parse(manifest.createdAt),
      scope: 'isolated local restore; deployment RPO/RTO not certified',
    };
  } catch (error) {
    await database?.close();
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}
export async function upgradeWithSnapshot(
  config: AppConfig,
  database: Database,
  destination: string,
  assertAuthority: () => void = () => {},
) {
  await createSnapshot(config, database, destination, assertAuthority);
  const thaw = await new Maintenance(database).freeze();
  try {
    assertAuthority();
    const applied = await migrate(database);
    assertAuthority();
    await verifyLedger(database);
    return {
      status: 'complete',
      applied,
      rollback:
        'restore pre-upgrade snapshot into an isolated target using matching source version',
    };
  } finally {
    assertAuthority();
    await thaw();
  }
}
