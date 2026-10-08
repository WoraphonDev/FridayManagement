import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database } from '../../src/domain/database.js';
import type { Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { retentionService } from '../../src/services/retention.js';
import { Maintenance } from '../../src/operations/maintenance.js';
const clock = () => new Date('2026-11-06T00:00:00.000Z');
export function retentionAcceptance(
  label: string,
  factory: () => Promise<Fixture>,
  skip: boolean | string = false,
) {
  test(
    `${label}: cutoff purge is atomic with audit/bytes queue and retains recurrence tombstones`,
    { skip },
    async () => {
      const f = await factory();
      const root = await mkdtemp(join(tmpdir(), 'friday-retention-'));
      const key = randomUUID();
      const storage = { directory: root, maxFileBytes: 1024, totalUploadBytes: 4096 };
      try {
        await mkdir(join(root, 'attachments'));
        // Directory at the blob path makes unlink fail: tracking/quota must survive.
        await mkdir(join(root, 'attachments', key));
        await f.db.transaction(async (tx) => {
          await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=1'));
          await tx.execute(
            sql(
              'UPDATE dbo.tasks SET deleted_at=@cutoff,deleted_by=1,successor_task_id=2 WHERE id=1',
              { cutoff: '2026-10-07T00:00:00.000Z' },
            ),
          );
          await tx.execute(
            sql(
              'UPDATE dbo.tasks SET predecessor_task_id=1,deleted_at=@after,deleted_by=1 WHERE id=2',
              { after: '2026-10-07T00:00:00.001Z' },
            ),
          );
          await tx.execute(
            sql('INSERT INTO dbo.recurrence_events(source_task_id,generated_task_id) VALUES(1,2)'),
          );
          await tx.execute(
            sql(
              "INSERT INTO dbo.attachments(task_id,uploader_id,original_name,storage_key,bytes,validated_type,sha256) VALUES(1,1,'fixture.txt',@key,2,'text/plain',@hash)",
              { key, hash: 'a'.repeat(64) },
            ),
          );
          await tx.execute(sql('UPDATE dbo.storage_quota SET stored_bytes=2 WHERE id=1'));
        });
        const service = await retentionService(f.db, storage, { clock });
        const first = await service.run();
        assert.equal(first.purged, 1);
        assert.equal(first.pendingFileCleanup, 1);
        await f.db.transaction(async (tx) => {
          assert.equal((await tx.query(sql('SELECT id FROM dbo.tasks WHERE id=1'))).length, 0);
          assert.equal(
            (await tx.query(sql('SELECT predecessor_task_id FROM dbo.tasks WHERE id=2')))[0]!
              .predecessor_task_id,
            null,
          );
          assert.equal(
            (await tx.query(sql('SELECT source_task_id FROM dbo.recurrence_events'))).length,
            1,
          );
          assert.equal(
            (await tx.query(sql("SELECT id FROM dbo.admin_events WHERE action='retention_purge'")))
              .length,
            1,
          );
          assert.equal(
            (await tx.query(sql('SELECT stored_bytes FROM dbo.storage_quota')))[0]!.stored_bytes,
            2,
          );
          assert.equal(
            (await tx.query(sql('SELECT attempts FROM dbo.file_cleanup_queue')))[0]!.attempts,
            1,
          );
        });
        await rm(join(root, 'attachments', key), { recursive: true });
        await writeFile(join(root, 'attachments', key), 'ok');
        await f.db.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.file_cleanup_queue SET next_attempt_at=@now', {
              now: clock().toISOString(),
            }),
          ),
        );
        const retried = await service.run();
        assert.equal(retried.pendingFileCleanup, 0);
        assert.equal(retried.purged, 0);
        await assert.rejects(stat(join(root, 'attachments', key)));
        await f.db.transaction(async (tx) => {
          assert.equal(
            (await tx.query(sql('SELECT stored_bytes FROM dbo.storage_quota')))[0]!.stored_bytes,
            0,
          );
        });
      } finally {
        await f.close();
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  test(
    `${label}: maintenance blocks retention, drains admitted work and owner loss never unlocks`,
    { skip },
    async () => {
      const f = await factory();
      const root = await mkdtemp(join(tmpdir(), 'friday-freeze-'));
      try {
        const stopping = new Maintenance(f.db);
        const complete = stopping.enter()!;
        let stopped = false;
        const draining = stopping.drain().then(() => {
          stopped = true;
        });
        await new Promise((r) => setImmediate(r));
        assert.equal(stopped, false);
        assert.equal(stopping.enter(), undefined);
        complete();
        await draining;
        assert.equal(stopped, true);
        const gate = new Maintenance(f.db);
        const finish = gate.enter()!;
        let frozen = false;
        const pending = gate.freeze().then((thaw) => {
          frozen = true;
          return thaw;
        });
        await new Promise((r) => setImmediate(r));
        assert.equal(frozen, false);
        assert.equal(gate.enter(), undefined);
        finish();
        finish();
        const thaw = await pending;
        const service = await retentionService(
          f.db,
          { directory: root, maxFileBytes: 1024, totalUploadBytes: 4096 },
          { clock },
        );
        assert.equal((await service.run()).skipped, true);
        await f.db.transaction((tx) =>
          tx.execute(
            sql('UPDATE dbo.maintenance_state SET owner_id=@owner', { owner: randomUUID() }),
          ),
        );
        await assert.rejects(thaw(), /MAINTENANCE_OWNER_LOST/);
        assert.equal(gate.enter(), undefined);
        assert.equal(
          (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.maintenance_state'))))
            .length,
          1,
        );
      } finally {
        await f.close();
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  test(
    `${label}: a failed parent deletion rolls audit/child/byte-queue changes back`,
    { skip },
    async () => {
      const f = await factory();
      const root = await mkdtemp(join(tmpdir(), 'friday-purge-rollback-'));
      try {
        await f.db.transaction(async (tx) => {
          await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=1'));
          await tx.execute(
            sql('UPDATE dbo.tasks SET deleted_at=@cutoff,deleted_by=1 WHERE id=1', {
              cutoff: '2026-10-07T00:00:00.000Z',
            }),
          );
          await tx.execute(sql("INSERT INTO dbo.subtasks(task_id,title) VALUES(1,'must survive')"));
        });
        const failing: Database = {
          provider: f.db.provider,
          close: async () => {},
          transaction: (work) =>
            f.db.transaction((tx) =>
              work({
                ...tx,
                execute: async (statement) => {
                  if (statement.sqlserver.startsWith('DELETE FROM dbo.tasks WHERE'))
                    throw new Error('INJECTED_DELETE_FAILURE');
                  await tx.execute(statement);
                },
              }),
            ),
        };
        const service = await retentionService(
          failing,
          { directory: root, maxFileBytes: 1024, totalUploadBytes: 4096 },
          { clock },
        );
        await assert.rejects(service.run(), /INJECTED_DELETE_FAILURE/);
        await f.db.transaction(async (tx) => {
          assert.equal((await tx.query(sql('SELECT id FROM dbo.tasks WHERE id=1'))).length, 1);
          assert.equal(
            (await tx.query(sql('SELECT id FROM dbo.subtasks WHERE task_id=1'))).length,
            1,
          );
          assert.equal(
            (await tx.query(sql("SELECT id FROM dbo.admin_events WHERE action='retention_purge'")))
              .length,
            0,
          );
          assert.equal(
            (await tx.query(sql('SELECT storage_key FROM dbo.file_cleanup_queue'))).length,
            0,
          );
        });
      } finally {
        await f.close();
        await rm(root, { recursive: true, force: true });
      }
    },
  );
  test(
    `${label}: expired sessions/idempotency/rate limits clean at the exact deadline`,
    { skip },
    async () => {
      const f = await factory();
      const root = await mkdtemp(join(tmpdir(), 'friday-expiry-'));
      try {
        await f.db.transaction(async (tx) => {
          for (const [hash, expires] of [
            ['a'.repeat(64), '2026-11-06T00:00:00.000Z'],
            ['b'.repeat(64), '2026-11-06T00:00:00.001Z'],
          ])
            await tx.execute(
              sql(
                'INSERT INTO dbo.sessions(token_hash,user_id,csrf_token,auth_version,created_at,last_seen_at,absolute_expires_at) VALUES(@hash,1,@csrf,1,@created,@seen,@expires)',
                {
                  hash: hash!,
                  csrf: 'fixture-only',
                  created: '2026-11-05T23:00:00.000Z',
                  seen: '2026-11-05T23:59:59.000Z',
                  expires: expires!,
                },
              ),
            );
          await tx.execute(
            sql(
              "INSERT INTO dbo.rate_limit_buckets(kind,bucket_hash,window_started_at,window_expires_at,attempts) VALUES('fixture',@hash,@created,@expires,1)",
              {
                hash: 'd'.repeat(64),
                created: '2026-11-05T23:59:00.000Z',
                expires: clock().toISOString(),
              },
            ),
          );
          for (const [dedupe, created] of [
            ['expired', '2026-08-08T00:00:00.000Z'],
            ['retained', '2026-08-08T00:00:00.001Z'],
          ])
            await tx.execute(
              sql(
                "INSERT INTO dbo.notifications(recipient_id,task_id,type,message,dedupe_key,created_at) VALUES(1,1,'comment','synthetic',@dedupe,@created)",
                { dedupe: dedupe!, created: created! },
              ),
            );
          await tx.execute(
            sql(
              "INSERT INTO dbo.idempotency_keys(user_id,route,key,request_hash,response_status,response_body,created_at,expires_at) VALUES(1,'fixture',@key,@hash,200,'{}',@created,@expires)",
              {
                key: randomUUID(),
                hash: 'c'.repeat(64),
                created: '2026-11-05T00:00:00.000Z',
                expires: clock().toISOString(),
              },
            ),
          );
        });
        await (
          await retentionService(
            f.db,
            { directory: root, maxFileBytes: 1024, totalUploadBytes: 4096 },
            { clock },
          )
        ).run();
        await f.db.transaction(async (tx) => {
          assert.deepEqual(
            (await tx.query(sql('SELECT token_hash FROM dbo.sessions'))).map((r) => r.token_hash),
            ['b'.repeat(64)],
          );
          assert.equal((await tx.query(sql('SELECT user_id FROM dbo.idempotency_keys'))).length, 0);
          assert.equal((await tx.query(sql('SELECT kind FROM dbo.rate_limit_buckets'))).length, 0);
          assert.deepEqual(
            (await tx.query(sql('SELECT dedupe_key FROM dbo.notifications'))).map(
              (r) => r.dedupe_key,
            ),
            ['retained'],
          );
        });
      } finally {
        await f.close();
        await rm(root, { recursive: true, force: true });
      }
    },
  );
}
