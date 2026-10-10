import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chmod, copyFile, mkdir, readdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import type { AppConfig } from '../config/config.js';
import { openDatabase } from '../repository/open.js';
import { sql } from '../repository/access-scope.js';
import { runTransaction } from '../domain/transaction.js';
import { digestFile, privateDirectory, verifyLedger, verifySnapshot } from './snapshot.js';

/**
 * Restores a PostgreSQL snapshot into an EMPTY configured database and an EMPTY data directory.
 * Never overwrites or switches a live deployment: the operator points DB_NAME/DATA_DIR at the
 * isolated target, verifies, then cuts over deliberately (runbook).
 */
export async function restorePostgresSnapshot(
  config: AppConfig,
  source: string,
  targetDirectory: string,
) {
  if (config.database.provider !== 'postgres') throw new Error('PROVIDER_MISMATCH');
  const started = Date.now();
  const manifest = await verifySnapshot(source);
  if (manifest.provider !== 'postgres') throw new Error('PROVIDER_MISMATCH');
  const directory = resolve(targetDirectory);
  await privateDirectory(directory);
  if ((await readdir(directory)).length) throw new Error('EMPTY_RESTORE_DIRECTORY_REQUIRED');
  const database = await openDatabase('postgres');
  try {
    const existing = await runTransaction(database, (tx) =>
      tx.query<{ n: number }>({
        sqlite:
          "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema=current_schema() AND table_type='BASE TABLE'",
        sqlserver: '',
      }),
    );
    if (existing[0]!.n !== 0) throw new Error('EMPTY_RESTORE_DATABASE_REQUIRED');
    const d = config.database;
    await promisify(execFile)(
      'pg_restore',
      [
        '--no-owner',
        '--no-privileges',
        '--exit-on-error',
        '--single-transaction',
        `--host=${d.server}`,
        `--port=${d.port}`,
        `--username=${d.user}`,
        `--dbname=${d.name}`,
        join(resolve(source), 'database.dump'),
      ],
      {
        env: {
          ...process.env,
          PGPASSWORD: d.password,
          PGSSLMODE: d.encrypt ? 'require' : 'disable',
        },
        maxBuffer: 1024 * 1024,
      },
    );
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
    await mkdir(join(directory, 'attachments'), { mode: 0o700 });
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
    // Restored copies start with no live sessions or replay cache, and leave maintenance.
    await runTransaction(database, async (tx) => {
      await tx.execute(sql('DELETE FROM dbo.sessions'));
      await tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1'));
      await tx.execute(sql('DELETE FROM dbo.idempotency_keys'));
      await tx.execute(sql('DELETE FROM dbo.maintenance_state'));
    });
    return {
      status: 'complete',
      provider: 'postgres',
      attachments: rows.length,
      measuredRestoreMs: Date.now() - started,
      snapshotAgeMs: started - Date.parse(manifest.createdAt),
      scope: 'isolated restore into an empty database; cut-over is a separate operator step',
    };
  } finally {
    await database.close();
  }
}
