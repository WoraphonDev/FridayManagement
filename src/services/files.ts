import { randomUUID, createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, unlink, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import Busboy from 'busboy';
import type { Request } from 'express';
import type { Database, Transaction, Row } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow, retentionWindow } from '../domain/dates.js';
import { sql } from '../repository/access-scope.js';
import { attachmentScope } from '../repository/access-scope.js';
import { lockColumns, statuses } from '../repository/board-helpers.js';
import { rights } from '../domain/permissions.js';
import { ApiFault, type SafeLog } from '../api/errors.js';
import {
  can,
  currentActor,
  projectAccess,
  type SessionProof,
  type AccessOptions,
} from './authorization.js';
import { normalizedName, validateFile } from './file-validation.js';
import type { UploadFingerprint } from '../repository/idempotency.js';
export interface StorageOptions {
  directory: string;
  maxFileBytes: number;
  totalUploadBytes: number;
  log?: SafeLog;
}
/** T-085: an upload targets exactly one task or (project-level) one project. */
export type UploadTarget = { kind: 'task' | 'project'; id: number };
export interface PreparedUpload {
  id: string;
  temp: string;
  key: string;
  task: number;
  target: UploadTarget;
  fingerprint: UploadFingerprint;
}
type ProjectFileRow = Row & {
  id: number;
  project_id: number;
  uploader_id: number;
  original_name: string;
  storage_key: string;
  bytes: number;
  validated_type: string;
  sha256: string;
  created_at: string;
  deleted_at: string | null;
};
const typeGroup = (t: string) =>
  t.startsWith('image/')
    ? 'image'
    : t === 'application/pdf'
      ? 'pdf'
      : t === 'application/zip'
        ? 'other'
        : 'document';
type FileRow = Row & {
  id: number;
  task_id: number;
  uploader_id: number;
  storage_key: string;
  bytes: number;
  deleted_at: string | null;
};
export async function fileService(
  database: Database,
  storage: StorageOptions,
  options: AccessOptions = {},
) {
  const folder = join(storage.directory, 'attachments'),
    temps = join(storage.directory, 'upload-temp');
  await mkdir(folder, { recursive: true, mode: 0o700 });
  await mkdir(temps, { recursive: true, mode: 0o700 });
  const now = () => utcNow(options.clock);
  const path = (key: string, temp = false) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key))
      throw new ApiFault('INTERNAL_ERROR');
    return join(temp ? temps : folder, key);
  };
  const quota = async (tx: Transaction) => {
    let q = (
      await tx.query<{ stored_bytes: number; reserved_bytes: number }>({
        sqlite: 'SELECT stored_bytes,reserved_bytes FROM storage_quota WHERE id=1',
        sqlserver:
          'SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota WITH (UPDLOCK,HOLDLOCK) WHERE id=1',
      })
    )[0];
    if (!q) {
      const existing = (
        await tx.query<{ total: number }>(
          sql(
            'SELECT COALESCE((SELECT SUM(bytes) FROM dbo.attachments),0)+COALESCE((SELECT SUM(bytes) FROM dbo.project_files),0)+COALESCE((SELECT SUM(bytes) FROM dbo.file_cleanup_queue),0) AS total',
          ),
        )
      )[0]!.total;
      await tx.execute(
        sql('INSERT INTO dbo.storage_quota(id,stored_bytes,reserved_bytes) VALUES(1,@stored,0)', {
          stored: existing,
        }),
      );
      q = { stored_bytes: existing, reserved_bytes: 0 };
    }
    return q;
  };
  const access = async (
    tx: Transaction,
    proof: SessionProof,
    task: number,
    write = false,
    lock = false,
  ) => {
    let t = (
      await tx.query<{ id: number; project_id: number; deleted_at: string | null }>(
        sql('SELECT id,project_id,deleted_at FROM dbo.tasks WHERE id=@task', { task }),
      )
    )[0];
    if (!t) throw new ApiFault('NOT_FOUND');
    if (lock) {
      await lockColumns(tx, t.project_id, statuses);
      await tx.query({
        sqlite: 'SELECT id FROM tasks WHERE id=$task',
        sqlserver: 'SELECT id FROM dbo.tasks WITH (UPDLOCK,HOLDLOCK) WHERE id=@task',
        parameters: { task },
      });
      t = (
        await tx.query<typeof t>(
          sql('SELECT id,project_id,deleted_at FROM dbo.tasks WHERE id=@task', { task }),
        )
      )[0]!;
    }
    const actor = await currentActor(tx, proof, false, options),
      project = await projectAccess(tx, actor, t.project_id);
    if (t.deleted_at) throw new ApiFault('NOT_FOUND');
    if (write) {
      if (!rights(project.role).write) throw new ApiFault('FORBIDDEN');
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      if (project.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
      if (project.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
    }
    return { actor, project };
  };
  const projectTarget = async (
    tx: Transaction,
    proof: SessionProof,
    projectId: number,
    write = false,
    lock = false,
  ) => {
    if (lock)
      await tx.query({
        sqlite: 'SELECT id FROM projects WHERE id=$id',
        sqlserver: 'SELECT id FROM dbo.projects WITH (UPDLOCK,HOLDLOCK) WHERE id=@id',
        parameters: { id: projectId },
      });
    const actor = await currentActor(tx, proof, false, options),
      project = await projectAccess(tx, actor, projectId);
    if (write) {
      if (!rights(project.role).write) throw new ApiFault('FORBIDDEN');
      if ((await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length)
        throw new ApiFault('MAINTENANCE');
      if (project.team_archived_at) throw new ApiFault('TEAM_ARCHIVED');
      if (project.archived_at) throw new ApiFault('PROJECT_ARCHIVED');
    }
    return { actor, project };
  };
  const targetAccess = (tx: Transaction, proof: SessionProof, target: UploadTarget) =>
    target.kind === 'task'
      ? access(tx, proof, target.id, true, true)
      : projectTarget(tx, proof, target.id, true, true);
  const projectRow = async (tx: Transaction, id: number) =>
    (
      await tx.query<ProjectFileRow>(sql('SELECT * FROM dbo.project_files WHERE id=@id', { id }))
    )[0];
  const person = async (tx: Transaction, id: number) => {
    const u = (
      await tx.query(sql('SELECT id,display_name,active FROM dbo.users WHERE id=@id', { id }))
    )[0]!;
    return { ...u, active: !!u.active };
  };
  const projectDto = async (tx: Transaction, r: ProjectFileRow, proof: SessionProof) => {
    const { project } = await projectTarget(tx, proof, r.project_id);
    const allowed =
      rights(project.role).write &&
      (can(project, 'P-06') || r.uploader_id === proof.userId) &&
      !project.archived_at &&
      !project.team_archived_at &&
      !(await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length;
    return {
      source: 'project' as const,
      id: r.id,
      project_id: r.project_id,
      task_id: null,
      task_title: null,
      uploader: await person(tx, r.uploader_id),
      original_name: r.original_name,
      bytes: r.bytes,
      validated_type: r.validated_type,
      sha256: r.sha256,
      created_at: r.created_at,
      deleted_at: r.deleted_at,
      download_path: `/api/project-files/${r.id}/download`,
      can_delete: allowed && !r.deleted_at,
      can_restore: allowed && !!r.deleted_at && retentionWindow(r.deleted_at, now()).restorable,
    };
  };
  const row = async (tx: Transaction, id: number) =>
    (await tx.query<FileRow>(sql('SELECT * FROM dbo.attachments WHERE id=@id', { id })))[0];
  const dto = async (tx: Transaction, r: FileRow, proof: SessionProof) => {
    const { project } = await access(tx, proof, r.task_id);
    const u = (
      await tx.query(
        sql('SELECT id,display_name,active FROM dbo.users WHERE id=@id', { id: r.uploader_id }),
      )
    )[0]!;
    const allowed =
      rights(project.role).write &&
      (can(project, 'P-06') || r.uploader_id === proof.userId) &&
      !project.archived_at &&
      !project.team_archived_at &&
      !(await tx.query(sql('SELECT id FROM dbo.maintenance_state WHERE id=1'))).length;
    return {
      id: r.id,
      task_id: r.task_id,
      uploader: { ...u, active: !!u.active },
      original_name: r.original_name,
      bytes: r.bytes,
      validated_type: r.validated_type,
      sha256: r.sha256,
      created_at: r.created_at,
      deleted_at: r.deleted_at,
      can_delete: allowed && !r.deleted_at,
      can_restore: allowed && !!r.deleted_at && retentionWindow(r.deleted_at, now()).restorable,
    };
  };
  const event = (
    tx: Transaction,
    task: number,
    actor: number,
    before: number | string | null,
    after: number | string | null,
    request: string,
  ) =>
    tx.execute(
      sql(
        "INSERT INTO dbo.task_events(task_id,actor_id,action,field_changes,request_id,created_at) VALUES(@task,@actor,'attachment_changed',@changes,@request,@now)",
        {
          task,
          actor,
          changes: JSON.stringify([{ field: 'attachment', before, after }]),
          request,
          now: now(),
        },
      ),
    );
  const remove = async (p: string) => {
    try {
      await unlink(p);
    } catch (e) {
      if (!(e && typeof e === 'object' && 'code' in e && e.code === 'ENOENT')) throw e;
    }
  };
  const release = async (id: string) =>
    runTransaction(database, async (tx) => {
      await quota(tx);
      const r = (
        await tx.query(sql('SELECT * FROM dbo.upload_reservations WHERE id=@id', { id }))
      )[0];
      if (!r) return;
      if (
        r.storage_key &&
        (
          await tx.query(
            sql('SELECT id FROM dbo.attachments WHERE storage_key=@key', {
              key: String(r.storage_key),
            }),
          )
        ).length
      )
        return;
      // Disk must be removed before the reservation can stop counting its bytes.
      await remove(path(String(r.temp_key), true));
      if (r.storage_key) await remove(path(String(r.storage_key)));
      await tx.execute(
        sql('UPDATE dbo.storage_quota SET reserved_bytes=reserved_bytes-@bytes WHERE id=1', {
          bytes: Number(r.reserved_bytes),
        }),
      );
      await tx.execute(sql('DELETE FROM dbo.upload_reservations WHERE id=@id', { id }));
    });
  const reserve = async (proof: SessionProof, target: UploadTarget) => {
    const id = randomUUID(),
      temp = randomUUID(),
      key = randomUUID(),
      task = target.kind === 'task' ? target.id : null,
      project = target.kind === 'project' ? target.id : null;
    await runTransaction(database, async (tx) => {
      await targetAccess(tx, proof, target);
      const q = await quota(tx);
      if (q.stored_bytes + q.reserved_bytes + 1 > storage.totalUploadBytes)
        throw new ApiFault('QUOTA_EXCEEDED');
      const created = now();
      await tx.execute(
        sql(
          'INSERT INTO dbo.upload_reservations(id,user_id,task_id,project_id,reserved_bytes,temp_key,storage_key,created_at,expires_at) VALUES(@id,@user,@task,@project,1,@temp,@key,@now,@expires)',
          {
            id,
            user: proof.userId,
            task,
            project,
            temp,
            key,
            now: created,
            expires: new Date(Date.parse(created) + 3600000).toISOString(),
          },
        ),
      );
      await tx.execute(
        sql('UPDATE dbo.storage_quota SET reserved_bytes=reserved_bytes+1 WHERE id=1'),
      );
    });
    return { id, temp, key, task: task ?? 0, target };
  };
  const grow = async (id: string, bytes: number) =>
    runTransaction(database, async (tx) => {
      const q = await quota(tx),
        r = (
          await tx.query<{ reserved_bytes: number }>(
            sql('SELECT reserved_bytes FROM dbo.upload_reservations WHERE id=@id', { id }),
          )
        )[0];
      if (!r) throw new ApiFault('SERVICE_NOT_READY');
      const delta = Math.max(0, bytes - r.reserved_bytes);
      if (q.stored_bytes + q.reserved_bytes + delta > storage.totalUploadBytes)
        throw new ApiFault('QUOTA_EXCEEDED');
      await tx.execute(
        sql('UPDATE dbo.upload_reservations SET reserved_bytes=@bytes WHERE id=@id', {
          id,
          bytes: Math.max(bytes, r.reserved_bytes),
        }),
      );
      await tx.execute(
        sql('UPDATE dbo.storage_quota SET reserved_bytes=reserved_bytes+@delta WHERE id=1', {
          delta,
        }),
      );
    });
  return {
    /** Called only at startup while the app owns its exclusive instance guard. */
    async recover() {
      const reservations = await runTransaction(database, (tx) =>
        tx.query<{ id: string }>(sql('SELECT id FROM dbo.upload_reservations ORDER BY id')),
      );
      for (const r of reservations) await release(r.id);
      // A crash before metadata commit can leave only a UUID file; never delete a referenced key.
      for (const temp of [false, true])
        for (const key of await readdir(temp ? temps : folder)) {
          if (!/^[0-9a-f-]{36}$/i.test(key)) continue;
          await runTransaction(database, async (tx) => {
            const referenced = await tx.query(
              sql(
                temp
                  ? 'SELECT id FROM dbo.upload_reservations WHERE temp_key=@key'
                  : 'SELECT storage_key FROM dbo.attachments WHERE storage_key=@key UNION ALL SELECT storage_key FROM dbo.project_files WHERE storage_key=@key UNION ALL SELECT storage_key FROM dbo.upload_reservations WHERE storage_key=@key',
                { key },
              ),
            );
            const queued = temp
              ? []
              : await tx.query(
                  sql('SELECT storage_key FROM dbo.file_cleanup_queue WHERE storage_key=@key', {
                    key,
                  }),
                );
            if (!referenced.length && !queued.length) await remove(path(key, temp));
          });
        }
      await this.cleanup();
    },
    async receive(
      req: Request,
      proof: SessionProof,
      task: number,
      target: UploadTarget = { kind: 'task', id: task },
    ): Promise<PreparedUpload> {
      const r = await reserve(proof, target);
      let fileCount = 0,
        bytes = 0;
      let name: ReturnType<typeof normalizedName> | undefined;
      const hash = createHash('sha256');
      try {
        let parser: ReturnType<typeof Busboy>;
        try {
          parser = Busboy({
            headers: req.headers,
            preservePath: true,
            defParamCharset: 'utf8',
            limits: {
              files: 1,
              fields: 0,
              parts: 2,
              fileSize: storage.maxFileBytes + 1,
              headerPairs: 50,
            },
          });
        } catch {
          throw new ApiFault('VALIDATION_FAILED');
        }
        let failure: unknown, work: Promise<void> | undefined;
        parser.on('file', (field, stream, info) => {
          fileCount++;
          work = (async () => {
            if (field !== 'file') throw new ApiFault('VALIDATION_FAILED');
            name = normalizedName(info.filename);
            const handle = await open(path(r.temp, true), 'wx', 0o600);
            try {
              for await (const chunk of stream) {
                const b = chunk as Buffer;
                bytes += b.length;
                if (bytes > storage.maxFileBytes) {
                  failure = new ApiFault('FILE_TOO_LARGE');
                  continue;
                }
                if (failure) continue;
                try {
                  await grow(r.id, bytes);
                  for (let offset = 0; offset < b.length;) {
                    const written = await handle.write(b, offset, b.length - offset);
                    if (!written.bytesWritten) throw new ApiFault('INTERNAL_ERROR');
                    offset += written.bytesWritten;
                  }
                  hash.update(b);
                } catch (e) {
                  failure = e;
                }
              }
              if (stream.truncated) throw new ApiFault('FILE_TOO_LARGE');
              await handle.sync();
            } finally {
              await handle.close();
            }
          })().catch((e) => {
            failure = e;
            stream.resume();
          });
        });
        parser.on('field', () => {
          failure = new ApiFault('VALIDATION_FAILED');
        });
        for (const limit of ['filesLimit', 'fieldsLimit', 'partsLimit'])
          parser.on(limit, () => {
            failure = new ApiFault('VALIDATION_FAILED');
          });
        await new Promise<void>((resolve, reject) => {
          const aborted = () => {
            parser.destroy(new ApiFault('VALIDATION_FAILED'));
          };
          req.once('aborted', aborted);
          parser.once('error', reject);
          parser.once('close', () => {
            req.off('aborted', aborted);
            resolve();
          });
          req.pipe(parser);
        }).catch((e) => {
          failure = e instanceof ApiFault ? e : new ApiFault('VALIDATION_FAILED');
        });
        await work;
        if (failure) throw failure;
        if (fileCount !== 1 || !name || !bytes) throw new ApiFault('VALIDATION_FAILED');
        await validateFile(path(r.temp, true), name.ext, bytes);
        await runTransaction(database, async (tx) => {
          await targetAccess(tx, proof, target);
          await tx.execute(
            sql(
              "UPDATE dbo.upload_reservations SET actual_bytes=@bytes,phase='finalizing' WHERE id=@id",
              { bytes, id: r.id },
            ),
          );
        });
        await rename(path(r.temp, true), path(r.key));
        return {
          ...r,
          fingerprint: {
            original_name: name.name,
            validated_type: name.type,
            bytes,
            sha256: hash.digest('hex'),
          },
        };
      } catch (e) {
        try {
          await release(r.id);
        } catch {
          /* Persistent reservation remains recoverable. */
        }
        throw e;
      }
    },
    release,
    async finalize(tx: Transaction, proof: SessionProof, p: PreparedUpload, request: string) {
      await targetAccess(tx, proof, p.target);
      await quota(tx);
      const reservation = (
        await tx.query(
          sql(
            "SELECT id,reserved_bytes,actual_bytes,storage_key FROM dbo.upload_reservations WHERE id=@id AND user_id=@user AND phase='finalizing'",
            { id: p.id, user: proof.userId },
          ),
        )
      )[0];
      if (
        !reservation ||
        reservation.storage_key !== p.key ||
        reservation.actual_bytes !== p.fingerprint.bytes
      )
        throw new ApiFault('SERVICE_NOT_READY');
      const b = p.fingerprint,
        parameters = {
          task: p.task,
          user: proof.userId,
          key: p.key,
          name: b.original_name,
          bytes: b.bytes,
          type: b.validated_type,
          hash: b.sha256,
          now: now(),
        };
      if (p.target.kind === 'project') {
        const created = await tx.query<{ id: number }>({
          sqlite:
            'INSERT INTO project_files(project_id,uploader_id,storage_key,original_name,bytes,validated_type,sha256,created_at) VALUES($project,$user,$key,$name,$bytes,$type,$hash,$now) RETURNING id',
          sqlserver:
            'INSERT INTO dbo.project_files(project_id,uploader_id,storage_key,original_name,bytes,validated_type,sha256,created_at) OUTPUT INSERTED.id VALUES(@project,@user,@key,@name,@bytes,@type,@hash,@now)',
          parameters: (({ task: _task, ...rest }) => {
            void _task;
            return { ...rest, project: p.target.id };
          })(parameters),
        });
        await tx.execute(
          sql(
            'UPDATE dbo.storage_quota SET stored_bytes=stored_bytes+@bytes,reserved_bytes=reserved_bytes-@reserved WHERE id=1',
            { bytes: b.bytes, reserved: Number(reservation.reserved_bytes) },
          ),
        );
        await tx.execute(sql('DELETE FROM dbo.upload_reservations WHERE id=@id', { id: p.id }));
        return { item: await projectDto(tx, (await projectRow(tx, created[0]!.id))!, proof) };
      }
      const ids = await tx.query<{ id: number }>({
        sqlite:
          'INSERT INTO attachments(task_id,uploader_id,storage_key,original_name,bytes,validated_type,sha256,created_at) VALUES($task,$user,$key,$name,$bytes,$type,$hash,$now) RETURNING id',
        sqlserver:
          'INSERT INTO dbo.attachments(task_id,uploader_id,storage_key,original_name,bytes,validated_type,sha256,created_at) OUTPUT INSERTED.id VALUES(@task,@user,@key,@name,@bytes,@type,@hash,@now)',
        parameters,
      });
      await tx.execute(
        sql(
          'UPDATE dbo.storage_quota SET stored_bytes=stored_bytes+@bytes,reserved_bytes=reserved_bytes-@reserved WHERE id=1',
          { bytes: b.bytes, reserved: Number(reservation.reserved_bytes) },
        ),
      );
      await tx.execute(sql('DELETE FROM dbo.upload_reservations WHERE id=@id', { id: p.id }));
      await event(tx, p.task, proof.userId, null, `${b.original_name} (#${ids[0]!.id})`, request);
      return { item: await dto(tx, (await row(tx, ids[0]!.id))!, proof) };
    },
    async list(tx: Transaction, proof: SessionProof, task: number, q: Record<string, unknown>) {
      const { project } = await access(tx, proof, task);
      if (q.includeDeleted === true) {
        if (!rights(project.role).write) throw new ApiFault('FORBIDDEN');
        await access(tx, proof, task, true);
      }
      const scoped = await tx.query(
        attachmentScope(proof.userId, task, q.includeDeleted === true, now()),
      );
      const page = Number(q.page ?? 1),
        pageSize = Number(q.pageSize ?? 50),
        items = [];
      for (const a of scoped.slice((page - 1) * pageSize, page * pageSize))
        items.push(await dto(tx, (await row(tx, Number(a.id)))!, proof));
      return { items, page, pageSize, total: scoped.length };
    },
    async change(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      restore: boolean,
      request: string,
    ) {
      let r = await row(tx, id);
      if (!r) throw new ApiFault('NOT_FOUND');
      const { project } = await access(tx, proof, r.task_id, true, true);
      r = (await row(tx, id))!;
      if (!r) throw new ApiFault('NOT_FOUND');
      if (!can(project, 'P-06') && r.uploader_id !== proof.userId) throw new ApiFault('FORBIDDEN');
      if (restore && r.deleted_at && !retentionWindow(r.deleted_at, now()).restorable)
        throw new ApiFault('RETENTION_EXPIRED');
      if (restore ? !!r.deleted_at : !r.deleted_at) {
        const deleted = restore ? null : now();
        await tx.execute(
          sql('UPDATE dbo.attachments SET deleted_at=@deleted WHERE id=@id', { id, deleted }),
        );
        await event(
          tx,
          r.task_id,
          proof.userId,
          `${r.deleted_at ? 'ลบแล้ว' : 'ใช้งาน'}: ${r.original_name} (#${id})`,
          `${restore ? 'ใช้งาน' : 'ลบแล้ว'}: ${r.original_name} (#${id})`,
          request,
        );
      }
      return { item: await dto(tx, (await row(tx, id))!, proof) };
    },
    async download(tx: Transaction, proof: SessionProof, id: number, request: string) {
      const r = await row(tx, id);
      if (!r || r.deleted_at) throw new ApiFault('NOT_FOUND');
      await access(tx, proof, r.task_id);
      return {
        bytes: r.bytes,
        name: String(r.original_name),
        open: async () => {
          try {
            const handle = await open(
              path(r.storage_key),
              constants.O_RDONLY | constants.O_NOFOLLOW,
            );
            try {
              const s = await handle.stat();
              if (!s.isFile() || s.size !== r.bytes) throw new Error('missing');
              return handle.createReadStream();
            } catch (e) {
              await handle.close().catch(() => {});
              throw e;
            }
          } catch {
            try {
              storage.log?.({ requestId: request, code: 'NOT_FOUND' });
            } catch {
              /* Safe log only. */
            }
            throw new ApiFault('NOT_FOUND');
          }
        },
      };
    },
    /** Metadata removal queues bytes until unlink is confirmed. Scheduler integration belongs to T-060. */
    async purgeExpired() {
      await runTransaction(database, async (tx) => {
        const cutoff = new Date(Date.parse(now()) - 30 * 86400000).toISOString();
        const rows = await tx.query<FileRow>(
          sql(
            'SELECT a.* FROM dbo.attachments a JOIN dbo.tasks t ON t.id=a.task_id WHERE a.deleted_at<=@cutoff OR t.deleted_at<=@cutoff',
            { cutoff },
          ),
        );
        for (const r of rows) {
          await tx.execute(
            sql(
              "INSERT INTO dbo.file_cleanup_queue(storage_key,bytes,reason,next_attempt_at,created_at) VALUES(@key,@bytes,'retention',@now,@now)",
              { key: String(r.storage_key), bytes: r.bytes, now: now() },
            ),
          );
          await tx.execute(sql('DELETE FROM dbo.attachments WHERE id=@id', { id: r.id }));
        }
        const projectFiles = await tx.query<ProjectFileRow>(
          sql('SELECT * FROM dbo.project_files WHERE deleted_at<=@cutoff', { cutoff }),
        );
        for (const r of projectFiles) {
          await tx.execute(
            sql(
              "INSERT INTO dbo.file_cleanup_queue(storage_key,bytes,reason,next_attempt_at,created_at) VALUES(@key,@bytes,'retention',@now,@now)",
              { key: String(r.storage_key), bytes: r.bytes, now: now() },
            ),
          );
          await tx.execute(sql('DELETE FROM dbo.project_files WHERE id=@id', { id: r.id }));
        }
      });
      await this.cleanup();
    },
    async cleanup() {
      const rows = await runTransaction(database, (tx) =>
        tx.query(
          sql(
            'SELECT storage_key FROM dbo.file_cleanup_queue WHERE next_attempt_at<=@now ORDER BY storage_key',
            { now: now() },
          ),
        ),
      );
      for (const r of rows) {
        try {
          await runTransaction(database, async (tx) => {
            await quota(tx);
            const q = (
              await tx.query(
                sql('SELECT bytes FROM dbo.file_cleanup_queue WHERE storage_key=@key', {
                  key: String(r.storage_key),
                }),
              )
            )[0];
            if (!q) return;
            if (
              (
                await tx.query(
                  sql(
                    'SELECT id FROM dbo.attachments WHERE storage_key=@key UNION ALL SELECT id FROM dbo.project_files WHERE storage_key=@key',
                    { key: String(r.storage_key) },
                  ),
                )
              ).length
            )
              throw new ApiFault('INTERNAL_ERROR');
            await remove(path(String(r.storage_key)));
            await tx.execute(
              sql('UPDATE dbo.storage_quota SET stored_bytes=stored_bytes-@bytes WHERE id=1', {
                bytes: Number(q.bytes),
              }),
            );
            await tx.execute(
              sql('DELETE FROM dbo.file_cleanup_queue WHERE storage_key=@key', {
                key: String(r.storage_key),
              }),
            );
          });
        } catch {
          await runTransaction(database, (tx) =>
            tx.execute(
              sql(
                'UPDATE dbo.file_cleanup_queue SET attempts=attempts+1,next_attempt_at=@next WHERE storage_key=@key',
                {
                  key: String(r.storage_key),
                  next: new Date(Date.parse(now()) + 60000).toISOString(),
                },
              ),
            ),
          );
        }
      }
    },
    /** FR-49: project files + task attachments the viewer can read (SRS §9.8). */
    async projectFiles(
      tx: Transaction,
      proof: SessionProof,
      projectId: number,
      q: Record<string, unknown>,
    ) {
      const { project } = await projectTarget(tx, proof, projectId);
      const deleted = q.includeDeleted === true;
      if (deleted) await projectTarget(tx, proof, projectId, true);
      const cutoff = new Date(Date.parse(now()) - 30 * 86400000).toISOString();
      const manager = can(project, 'P-06');
      const own = (r: { uploader_id: number }) => manager || r.uploader_id === proof.userId;
      const projectRows = await tx.query<ProjectFileRow>(
        sql(
          'SELECT * FROM dbo.project_files WHERE project_id=@project AND (deleted_at IS NULL OR (@deleted=1 AND deleted_at>@cutoff)) ORDER BY id DESC',
          { project: projectId, deleted: Number(deleted), cutoff },
        ),
      );
      const taskRows = await tx.query<FileRow & { task_title: string }>(
        sql(
          'SELECT a.*,t.title AS task_title FROM dbo.attachments a JOIN dbo.tasks t ON t.id=a.task_id WHERE t.project_id=@project AND t.deleted_at IS NULL AND (a.deleted_at IS NULL OR (@deleted=1 AND a.deleted_at>@cutoff)) ORDER BY a.id DESC',
          { project: projectId, deleted: Number(deleted), cutoff },
        ),
      );
      const search = typeof q.q === 'string' ? q.q.normalize('NFC').toLowerCase() : '';
      const keep = (r: Row & { deleted_at: string | null; uploader_id: number }) =>
        (!r.deleted_at || own(r)) &&
        (!search || String(r.original_name).toLowerCase().includes(search)) &&
        (!q.type || typeGroup(String(r.validated_type)) === q.type);
      const merged = [
        ...(q.source === 'task'
          ? []
          : projectRows.filter(keep).map((r) => ({ source: 'project' as const, r }))),
        ...(q.source === 'project'
          ? []
          : taskRows.filter(keep).map((r) => ({ source: 'task' as const, r }))),
      ].sort(
        (a, b) => String(b.r.created_at).localeCompare(String(a.r.created_at)) || b.r.id - a.r.id,
      );
      const page = Number(q.page ?? 1),
        pageSize = Number(q.pageSize ?? 50),
        items = [];
      for (const entry of merged.slice((page - 1) * pageSize, page * pageSize)) {
        if (entry.source === 'project')
          items.push(await projectDto(tx, entry.r as ProjectFileRow, proof));
        else {
          const a = await dto(tx, entry.r as FileRow, proof);
          items.push({
            source: 'task' as const,
            id: a.id,
            project_id: projectId,
            task_id: a.task_id,
            task_title: String((entry.r as { task_title: string }).task_title),
            uploader: a.uploader,
            original_name: a.original_name,
            bytes: a.bytes,
            validated_type: a.validated_type,
            sha256: a.sha256,
            created_at: a.created_at,
            deleted_at: a.deleted_at,
            download_path: `/api/attachments/${a.id}/download`,
            can_delete: a.can_delete,
            can_restore: a.can_restore,
          });
        }
      }
      return { items, page, pageSize, total: merged.length };
    },
    async projectChange(
      tx: Transaction,
      proof: SessionProof,
      id: number,
      restore: boolean,
      request: string,
    ) {
      let r = await projectRow(tx, id);
      if (!r) throw new ApiFault('NOT_FOUND');
      const { project } = await projectTarget(tx, proof, r.project_id, true, true);
      r = (await projectRow(tx, id))!;
      if (!can(project, 'P-06') && r.uploader_id !== proof.userId) throw new ApiFault('FORBIDDEN');
      if (restore && r.deleted_at && !retentionWindow(r.deleted_at, now()).restorable)
        throw new ApiFault('RETENTION_EXPIRED');
      if (restore ? !!r.deleted_at : !r.deleted_at) {
        const at = now();
        await tx.execute(
          sql('UPDATE dbo.project_files SET deleted_at=@deleted WHERE id=@id', {
            id,
            deleted: restore ? null : at,
          }),
        );
        // FR-28/§8.4: project-level delete/restore is audited atomically like task attachments.
        await tx.execute(
          sql(
            'INSERT INTO dbo.admin_events(actor_id,action,resource_type,resource_id,redacted_changes,request_id,created_at) VALUES(@actor,@action,@type,@id,@changes,@request,@at)',
            {
              actor: proof.userId,
              action: restore ? 'project_file_restored' : 'project_file_deleted',
              type: 'project_file',
              id,
              changes: JSON.stringify({ project_id: r.project_id, name: r.original_name }),
              request,
              at,
            },
          ),
        );
      }
      return { item: await projectDto(tx, (await projectRow(tx, id))!, proof) };
    },
    async projectDownload(tx: Transaction, proof: SessionProof, id: number, request: string) {
      const r = await projectRow(tx, id);
      if (!r || r.deleted_at) throw new ApiFault('NOT_FOUND');
      await projectTarget(tx, proof, r.project_id);
      return {
        bytes: r.bytes,
        name: String(r.original_name),
        open: async () => {
          try {
            const handle = await open(
              path(r.storage_key),
              constants.O_RDONLY | constants.O_NOFOLLOW,
            );
            try {
              const st = await handle.stat();
              if (!st.isFile() || st.size !== r.bytes) throw new Error('missing');
              return handle.createReadStream();
            } catch (e) {
              await handle.close().catch(() => {});
              throw e;
            }
          } catch {
            try {
              storage.log?.({ requestId: request, code: 'NOT_FOUND' });
            } catch {
              /* Safe log only. */
            }
            throw new ApiFault('NOT_FOUND');
          }
        },
      };
    },
    async usage() {
      return runTransaction(database, quota);
    },
  };
}
