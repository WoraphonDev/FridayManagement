import { copyFile, mkdir, readFile, chmod, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join, resolve, isAbsolute } from 'node:path';
import type { AppConfig } from '../config/config.js';
import { sqlServerOptions } from '../config/sql-options.js';
import { acquireSqlInstance } from '../config/sql-instance.js';
import { openDatabase } from '../repository/open.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { verifySnapshot, verifyLedger, digestFile, privateDirectory } from './snapshot.js';

export function restoreSql(target: string, moves: Record<string, string>) {
  if (
    !/^[A-Za-z][A-Za-z0-9_]{0,127}$/.test(target) ||
    ['master', 'model', 'msdb', 'tempdb'].includes(target.toLowerCase())
  )
    throw new Error('ISOLATED_SQL_TARGET_REQUIRED');
  const entries = Object.entries(moves);
  if (
    !entries.length ||
    entries.length > 64 ||
    new Set(entries.map(([, path]) => path.toLowerCase())).size !== entries.length ||
    entries.some(
      ([logical, path]) =>
        !logical ||
        logical.length > 128 ||
        typeof path !== 'string' ||
        path.length > 4000 ||
        !/^(?:[A-Za-z]:\\|\\\\[^\\]+\\[^\\]+\\|\/)/.test(path),
    )
  )
    throw new Error('SQL_FILE_MOVES_REQUIRED');
  return `IF DB_ID(@target) IS NOT NULL THROW 50000, 'RESTORE_TARGET_EXISTS', 1; RESTORE DATABASE [${target}] FROM DISK=@bak WITH CHECKSUM, RECOVERY, ${entries.map((_, index) => `MOVE @logical${index} TO @physical${index}`).join(', ')}`;
}
/** SQL service must see the configured backup path and every explicit MOVE destination. */
export async function restoreSqlSnapshot(
  config: AppConfig,
  env: NodeJS.ProcessEnv,
  source: string,
  targetDirectory: string,
  movesFile: string,
) {
  if (config.database.provider !== 'sqlserver') throw new Error('PROVIDER_MISMATCH');
  if (!isAbsolute(config.database.backupDirectory)) throw new Error('SQL_BACKUP_PATH_REQUIRED');
  await privateDirectory(config.database.backupDirectory);
  const started = Date.now();
  const manifest = await verifySnapshot(source);
  if (manifest.provider !== 'sqlserver') throw new Error('PROVIDER_MISMATCH');
  const target = config.database.name;
  await digestFile(movesFile);
  const moves = JSON.parse(await readFile(movesFile, 'utf8')) as Record<string, string>;
  const command = restoreSql(target, moves);
  const directory = resolve(targetDirectory);
  await privateDirectory(dirname(directory));
  await privateDirectory(directory);
  if ((await readdir(directory)).length) throw new Error('EMPTY_RESTORE_DIRECTORY_REQUIRED');
  await mkdir(join(directory, 'attachments'), { mode: 0o700 });
  const driver = (await import('mssql')).default;
  let lost = false;
  const assertAuthority = () => {
    if (lost) throw new Error('INSTANCE_GUARD_LOST');
  };
  const releaseMaster = await acquireSqlInstance({ ...config.database, name: 'master' }, () => {
    lost = true;
  });
  let releaseTarget: (() => Promise<void>) | undefined;
  const remote = join(config.database.backupDirectory, `friday-restore-${randomUUID()}.bak`);
  let pool: InstanceType<typeof driver.ConnectionPool> | undefined;
  let database: Awaited<ReturnType<typeof openDatabase>> | undefined;
  try {
    await copyFile(join(resolve(source), 'database.bak'), remote, constants.COPYFILE_EXCL);
    await chmod(remote, 0o600);
    pool = await new driver.ConnectionPool({
      ...sqlServerOptions(config.database),
      database: 'master',
      requestTimeout: 3600000,
    }).connect();
    await pool
      .request()
      .input('bak', driver.NVarChar(4000), remote)
      .query('RESTORE VERIFYONLY FROM DISK=@bak WITH CHECKSUM');
    const list = await pool
      .request()
      .input('bak', driver.NVarChar(4000), remote)
      .query('RESTORE FILELISTONLY FROM DISK=@bak');
    if (
      list.recordset.length !== Object.keys(moves).length ||
      list.recordset.some(
        (row: { LogicalName: string; Type: string }) =>
          !['D', 'L'].includes(row.Type) || !Object.hasOwn(moves, row.LogicalName),
      )
    )
      throw new Error('SQL_FILE_MOVES_MISMATCH');
    const request = pool
      .request()
      .input('target', driver.NVarChar(128), target)
      .input('bak', driver.NVarChar(4000), remote);
    Object.entries(moves).forEach(([logical, physical], index) => {
      request.input(`logical${index}`, driver.NVarChar(128), logical);
      request.input(`physical${index}`, driver.NVarChar(4000), physical);
    });
    assertAuthority();
    await request.query(command); // Actual restore, never REPLACE; VERIFYONLY alone is insufficient.
    releaseTarget = await acquireSqlInstance(config.database, () => {
      lost = true;
    });
    database = await openDatabase('sqlserver', { env });
    if (JSON.stringify(await verifyLedger(database)) !== JSON.stringify(manifest.schema))
      throw new Error('MANIFEST_SCHEMA_MISMATCH');
    const freeze = await runTransaction(database, (tx) =>
      tx.query(sql("SELECT id FROM dbo.maintenance_state WHERE id=1 AND state='frozen'")),
    );
    if (!freeze.length) throw new Error('RESTORED_FREEZE_REQUIRED');
    const rows = await runTransaction(database, (tx) =>
      tx.query<{ storage_key: string; bytes: number; sha256: string }>(
        sql('SELECT storage_key,bytes,sha256 FROM dbo.attachments ORDER BY storage_key'),
      ),
    );
    if (rows.length !== manifest.attachmentCount) throw new Error('MANIFEST_ATTACHMENTS_MISMATCH');
    for (const row of rows) {
      const path = 'attachments/' + row.storage_key;
      if (
        !manifest.files.some(
          (entry) =>
            entry.path === path && entry.bytes === row.bytes && entry.sha256 === row.sha256,
        )
      )
        throw new Error('MANIFEST_ATTACHMENTS_MISMATCH');
      await copyFile(join(resolve(source), path), join(directory, path), constants.COPYFILE_EXCL);
      await chmod(join(directory, path), 0o600);
      const actual = await digestFile(join(directory, path));
      if (actual.bytes !== row.bytes || actual.sha256 !== row.sha256)
        throw new Error('SNAPSHOT_CHECKSUM_FAILED');
    }
    assertAuthority();
    await runTransaction(database, async (tx) => {
      await tx.execute(sql('DELETE FROM dbo.sessions'));
      await tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1'));
      await tx.execute(sql('DELETE FROM dbo.idempotency_keys'));
      await tx.execute(sql('DELETE FROM dbo.maintenance_state'));
      assertAuthority();
    });
    assertAuthority();
    return {
      status: 'complete',
      provider: 'sqlserver',
      attachments: rows.length,
      measuredRestoreMs: Date.now() - started,
      snapshotAgeMs: started - Date.parse(manifest.createdAt),
      scope:
        'actual isolated restore; permissions/download/startup still require operator acceptance',
    };
  } finally {
    try {
      await database?.close();
    } finally {
      try {
        await pool?.close();
      } finally {
        try {
          await releaseTarget?.();
        } finally {
          await releaseMaster();
        }
      }
    }
    // On failure keep the isolated target and its persistent freeze for explicit review.
  }
}
