import { restoreSqlSnapshot } from './sql-restore.js';
import { restorePostgresSnapshot } from './pg-restore.js';
import { loadConfiguration } from '../config/load.js';
import { parseConfiguration } from '../config/config.js';
import { checkLocalAuthority } from '../cli/authority.js';
import { acquireLocalInstance } from '../config/instance.js';
import { acquireSqlInstance } from '../config/sql-instance.js';
import { openDatabase } from '../repository/open.js';
import { sql } from '../repository/access-scope.js';
import { runTransaction } from '../domain/transaction.js';
import { retentionService } from '../services/retention.js';
import {
  createSnapshot,
  restoreSqliteSnapshot,
  upgradeWithSnapshot,
  verifySnapshot,
  verifyLedger,
} from './snapshot.js';
const args = process.argv.slice(2);
try {
  const [action, target, confirmation] = args;
  if (
    ![
      'backup',
      'restore-local',
      'verify',
      'upgrade',
      'retention',
      'clear-maintenance',
      'restore-sql',
      'restore-postgres',
    ].includes(action ?? '') ||
    !target ||
    confirmation !== '--confirm-local-maintenance' ||
    args.length !== 3
  )
    throw new Error('USAGE');
  if (action === 'verify') {
    const manifest = await verifySnapshot(target);
    console.log(
      JSON.stringify({
        status: 'verified',
        provider: manifest.provider,
        fileCount: manifest.files.length,
      }),
    );
  } else if (action === 'restore-local') {
    // Source path is supplied through an environment value, never inferred from a live DB.
    if (!process.env.FRIDAY_RESTORE_SOURCE) throw new Error('RESTORE_SOURCE_REQUIRED');
    console.log(
      JSON.stringify(await restoreSqliteSnapshot(process.env.FRIDAY_RESTORE_SOURCE, target)),
    );
  } else {
    const config = parseConfiguration(process.env);
    const environmentFiles = process.execArgv.flatMap((arg, i, list) =>
      arg.startsWith('--env-file=') ? [arg.slice(11)] : arg === '--env-file' ? [list[i + 1]!] : [],
    );
    await checkLocalAuthority(config, environmentFiles);
    const ready = await loadConfiguration(process.env);
    const release = await acquireLocalInstance(ready);
    let releaseSql: (() => Promise<void>) | undefined;
    let database: Awaited<ReturnType<typeof openDatabase>> | undefined;
    let lost = false;
    const assertAuthority = () => {
      if (lost) throw new Error('INSTANCE_GUARD_LOST');
    };
    try {
      if (ready.database.provider === 'sqlserver' && action !== 'restore-sql')
        releaseSql = await acquireSqlInstance(ready.database, () => {
          lost = true;
        });
      if (action !== 'restore-sql' && action !== 'restore-postgres') {
        database = await openDatabase(ready.database.provider);
        await verifyLedger(database);
      }
      await checkLocalAuthority(ready, environmentFiles);
      assertAuthority();
      let result: unknown;
      if (action === 'restore-sql') {
        if (
          !process.env.FRIDAY_RESTORE_SOURCE ||
          !process.env.FRIDAY_SQL_MOVES_FILE ||
          ready.dataDirectory !== target
        )
          throw new Error('ISOLATED_SQL_TARGET_REQUIRED');
        result = await restoreSqlSnapshot(
          ready,
          process.env,
          process.env.FRIDAY_RESTORE_SOURCE,
          target,
          process.env.FRIDAY_SQL_MOVES_FILE,
        );
      } else if (action === 'restore-postgres') {
        if (!process.env.FRIDAY_RESTORE_SOURCE || ready.dataDirectory !== target)
          throw new Error('ISOLATED_RESTORE_TARGET_REQUIRED');
        result = await restorePostgresSnapshot(ready, process.env.FRIDAY_RESTORE_SOURCE, target);
      } else if (!database) throw new Error('DATABASE_REQUIRED');
      else if (action === 'backup')
        result = await createSnapshot(ready, database, target, assertAuthority);
      else if (action === 'upgrade')
        result = await upgradeWithSnapshot(ready, database, target, assertAuthority);
      else if (action === 'retention') {
        if (target !== 'run') throw new Error('USAGE');
        result = await (
          await retentionService(
            database,
            {
              directory: ready.dataDirectory,
              maxFileBytes: ready.maxFileBytes,
              totalUploadBytes: ready.totalUploadBytes,
            },
            { idleMinutes: ready.sessionIdleMinutes },
          )
        ).run();
      } else {
        if (!/^[0-9a-f-]{36}$/i.test(target)) throw new Error('OWNER_REQUIRED');
        await runTransaction(database, async (tx) => {
          const rows = await tx.query(sql('SELECT owner_id FROM dbo.maintenance_state WHERE id=1'));
          if (rows[0]?.owner_id !== target) throw new Error('MAINTENANCE_OWNER_MISMATCH');
          assertAuthority();
          await tx.execute(
            sql('DELETE FROM dbo.maintenance_state WHERE id=1 AND owner_id=@owner', {
              owner: target,
            }),
          );
        });
        result = {
          status: 'cleared',
          scope: 'explicit offline owner recovery; no snapshot success implied',
        };
      }
      assertAuthority();
      console.log(JSON.stringify(result));
    } finally {
      try {
        await database?.close();
      } finally {
        try {
          await releaseSql?.();
        } finally {
          await release();
        }
      }
    }
  }
} catch {
  console.error(
    JSON.stringify({
      status: 'failed',
      code: 'OPERATIONS_FAILED',
      message:
        'ตรวจคำสั่ง สิทธิ์ไฟล์ schema และหยุด application ก่อนรัน; ไม่ปลด maintenance ค้างโดยอัตโนมัติ; ห้ามส่ง secrets ผ่าน arguments/log',
    }),
  );
  process.exitCode = 1;
}
