import { randomUUID } from 'node:crypto';
import type { Database } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { sql } from '../repository/access-scope.js';
import { fileService, type StorageOptions } from './files.js';
import type { Maintenance } from '../operations/maintenance.js';
export async function retentionService(
  database: Database,
  storage: StorageOptions,
  options: { clock?: () => Date; idleMinutes?: number } = {},
) {
  const files = await fileService(database, storage, options);
  return {
    async run() {
      const now = (options.clock?.() ?? new Date()).toISOString();
      const cutoff = new Date(Date.parse(now) - 30 * 86400000).toISOString();
      const purged = await runTransaction(database, async (tx) => {
        if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
          return undefined;
        const query = sql(
          'SELECT id,creator_id FROM dbo.tasks WHERE deleted_at<=@cutoff ORDER BY id',
          { cutoff },
        );
        const rows = await tx.query<{ id: number; creator_id: number }>({
          ...query,
          sqlite: query.sqlite + ' LIMIT 100',
          sqlserver: query.sqlserver + ' OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY',
        });
        for (const task of rows) {
          // Audit and byte tracking commit with the parent deletion; tombstones are never deleted.
          await tx.execute(
            sql(
              "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,'retention_purge','task',@id,@changes,@request,@now)",
              {
                actor: task.creator_id,
                id: task.id,
                changes: JSON.stringify({
                  origin: 'retention_job',
                  actor_reference: 'task_creator',
                  cutoff,
                }),
                request: randomUUID(),
                now,
              },
            ),
          );
          await tx.execute(
            sql(
              "INSERT INTO dbo.file_cleanup_queue(storage_key,bytes,reason,next_attempt_at,created_at) SELECT storage_key,bytes,'retention',@now,@now FROM dbo.attachments WHERE task_id=@id",
              { id: task.id, now },
            ),
          );
          await tx.execute(
            sql(
              'UPDATE dbo.tasks SET predecessor_task_id=CASE WHEN predecessor_task_id=@id THEN NULL ELSE predecessor_task_id END,successor_task_id=CASE WHEN successor_task_id=@id THEN NULL ELSE successor_task_id END,version=version+1,updated_at=@now WHERE predecessor_task_id=@id OR successor_task_id=@id',
              { id: task.id, now },
            ),
          );
          for (const table of [
            'task_assignees',
            'attachments',
            'notifications',
            'task_events',
            'comments',
            'subtasks',
            'board_positions',
          ])
            await tx.execute(sql(`DELETE FROM dbo.${table} WHERE task_id=@id`, { id: task.id }));
          await tx.execute(
            sql('DELETE FROM dbo.tasks WHERE id=@id AND deleted_at<=@cutoff', {
              id: task.id,
              cutoff,
            }),
          );
        }
        // T-084: project docs past the 30-day trash window are purged with their history.
        const docs = await tx.query<{ id: number; project_id: number; deleted_by: number }>(
          sql(
            'SELECT id,project_id,deleted_by FROM dbo.project_docs WHERE deleted_at<=@cutoff ORDER BY id',
            { cutoff },
          ),
        );
        for (const doc of docs.slice(0, 100)) {
          await tx.execute(
            sql(
              "INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,'retention_purge','project_doc',@id,@changes,@request,@now)",
              {
                actor: doc.deleted_by,
                id: doc.id,
                changes: JSON.stringify({
                  origin: 'retention_job',
                  project_id: doc.project_id,
                  cutoff,
                }),
                request: randomUUID(),
                now,
              },
            ),
          );
          await tx.execute(
            sql('DELETE FROM dbo.project_doc_versions WHERE doc_id=@id', { id: doc.id }),
          );
          await tx.execute(sql('DELETE FROM dbo.project_docs WHERE id=@id', { id: doc.id }));
        }
        await tx.execute(
          sql('DELETE FROM dbo.notifications WHERE created_at<=@cutoff', {
            cutoff: new Date(Date.parse(now) - 90 * 86400000).toISOString(),
          }),
        );
        await tx.execute(
          sql('DELETE FROM dbo.sessions WHERE absolute_expires_at<=@now OR last_seen_at<=@idle', {
            now,
            idle: new Date(Date.parse(now) - (options.idleMinutes ?? 30) * 60000).toISOString(),
          }),
        );
        await tx.execute(sql('DELETE FROM dbo.idempotency_keys WHERE expires_at<=@now', { now }));
        await tx.execute(
          sql('DELETE FROM dbo.rate_limit_buckets WHERE window_expires_at<=@now', { now }),
        );
        return rows.length;
      });
      // File service retains quota/tracking until confirmed unlink or ENOENT, with retries.
      if (purged !== undefined) await files.purgeExpired();
      const pending = await runTransaction(database, (tx) =>
        tx.query<{ count: number }>(sql('SELECT COUNT(*) AS count FROM dbo.file_cleanup_queue')),
      );
      return {
        purged: purged ?? 0,
        skipped: purged === undefined,
        pendingFileCleanup: pending[0]!.count,
      };
    },
  };
}
export async function startRetentionScheduler(
  database: Database,
  storage: StorageOptions,
  gate: Maintenance,
  options: { idleMinutes: number; log: () => void },
) {
  const service = await retentionService(database, storage, options);
  let stopped = false,
    running: Promise<unknown> | undefined;
  const tick = () => {
    if (stopped || running) return;
    const release = gate.enter();
    if (!release) return;
    running = service
      .run()
      .then((result) => {
        if (result.pendingFileCleanup) options.log();
      }, options.log)
      .finally(() => {
        release();
        running = undefined;
      });
  };
  tick();
  const timer = setInterval(tick, 60000);
  timer.unref();
  return {
    stop: async () => {
      stopped = true;
      clearInterval(timer);
      await running;
    },
  };
}
