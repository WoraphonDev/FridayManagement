import { runTransaction } from '../domain/transaction.js';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Database, Statement } from '../domain/database.js';

/** Startup verifies the applied ledger; it never applies DDL or creates a database. */
export async function verifyAppliedSchema(database: Database, root = resolve('migrations')) {
  const directory = resolve(root, database.provider);
  const files = readdirSync(directory)
    .filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name))
    .sort();
  if (
    files[0] !== '0000_foundation.sql' ||
    files.some((name, index) => Number(name.slice(0, 4)) !== index)
  )
    throw new Error('SCHEMA_NOT_READY');
  const rows = await runTransaction(database, (tx) =>
    tx.query<{ id: string; sha256: string }>({
      sqlite: 'SELECT id,sha256 FROM schema_migrations',
      sqlserver: 'SELECT id,sha256 FROM dbo.schema_migrations',
    }),
  );
  if (
    rows.length !== files.length ||
    files.some(
      (name) =>
        rows.find((row) => row.id === name)?.sha256 !==
        createHash('sha256')
          .update(readFileSync(resolve(directory, name), 'utf8'))
          .digest('hex'),
    )
  )
    throw new Error('SCHEMA_NOT_READY');
}

export async function migrate(database: Database, root = resolve('migrations')): Promise<string[]> {
  const directory = resolve(root, database.provider);
  const files = readdirSync(directory)
    .filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name))
    .sort();
  if (files.some((file, index) => Number(file.slice(0, 4)) !== index))
    throw new Error('MIGRATION_SEQUENCE_INVALID');
  if (files[0] !== '0000_foundation.sql') throw new Error('MIGRATION_BASELINE_REQUIRED');
  return runTransaction(database, async (transaction) => {
    if (database.provider === 'sqlserver') {
      const rows = await transaction.query<{ result: number }>({
        sqlite: '',
        sqlserver:
          "DECLARE @result int; EXEC @result=sys.sp_getapplock @Resource=N'FridayManagement:schema-migrations', @LockMode='Exclusive', @LockOwner='Transaction', @LockTimeout=0; SELECT @result AS result;",
      });
      if (![0, 1].includes(rows[0]?.result ?? -1)) throw new Error('MIGRATION_GUARD_UNAVAILABLE');
    } else if (database.provider === 'postgres') {
      const rows = await transaction.query<{ locked: number }>({
        sqlite: "SELECT CASE WHEN pg_try_advisory_xact_lock(hashtext('FridayManagement:schema-migrations')) THEN 1 ELSE 0 END AS locked",
        sqlserver: '',
      });
      if (rows[0]?.locked !== 1) throw new Error('MIGRATION_GUARD_UNAVAILABLE');
    }
    const applied: string[] = [];
    for (const file of files) {
      const content = readFileSync(resolve(directory, file), 'utf8');
      const sha256 = createHash('sha256').update(content).digest('hex');
      const ddl: Statement = { sqlite: content, sqlserver: content };
      // Bootstrap the ledger first; subsequent files execute only if not already recorded.
      if (file === '0000_foundation.sql') {
        await transaction.execute(ddl);
        const ledger = await transaction.query<{ id: string }>({
          sqlite: 'SELECT id FROM schema_migrations',
          sqlserver: 'SELECT id FROM dbo.schema_migrations WITH (UPDLOCK,HOLDLOCK)',
        });
        if (ledger.some((row) => !files.includes(row.id)))
          throw new Error('MIGRATION_SOURCE_MISSING');
      }
      const existing = await transaction.query<{ sha256: string }>({
        sqlite: 'SELECT sha256 FROM schema_migrations WHERE id=$id',
        sqlserver: 'SELECT sha256 FROM dbo.schema_migrations WITH (UPDLOCK, HOLDLOCK) WHERE id=@id',
        parameters: { id: file },
      });
      if (existing.length) {
        if (existing[0]?.sha256 !== sha256) throw new Error('MIGRATION_CHECKSUM_CHANGED');
        continue;
      }
      if (file !== '0000_foundation.sql') await transaction.execute(ddl);
      await transaction.execute({
        sqlite:
          'INSERT INTO schema_migrations(id,sha256,applied_at) VALUES($id,$sha256,$applied_at)',
        sqlserver:
          'INSERT INTO dbo.schema_migrations(id,sha256,applied_at) VALUES(@id,@sha256,@applied_at)',
        parameters: { id: file, sha256, applied_at: new Date().toISOString() },
      });
      applied.push(file);
    }
    return applied;
  });
}
