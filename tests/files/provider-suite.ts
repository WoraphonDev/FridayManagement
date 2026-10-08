import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { accessFixture, proof, now } from '../authorization/fixtures.js';
import { insert, type Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { fileService } from '../../src/services/files.js';
import { historyService } from '../../src/services/history.js';
import { taskService } from '../../src/services/tasks.js';
import { ApiFault } from '../../src/api/errors.js';
import { operations, parseSchema } from '../../src/api/contract.js';
import { receive, archive, multipart } from './helpers.js';
import { redactAudit } from '../../src/security/audit.js';
export function fileAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  type F = Awaited<ReturnType<typeof accessFixture>>;
  type S = Awaited<ReturnType<typeof fileService>>;
  const check = (
    name: string,
    work: (f: F, s: S, root: string) => Promise<void>,
    limit = 5 * 1024 ** 3,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await accessFixture(factory),
        root = await mkdtemp(join(tmpdir(), 'friday-files-'));
      try {
        await f.db.transaction((tx) => tx.execute(sql('DELETE FROM dbo.attachments')));
        const s = await fileService(
          f.db,
          { directory: root, maxFileBytes: 10485760, totalUploadBytes: limit },
          { clock: () => new Date(now) },
        );
        await work(f, s, root);
      } finally {
        await f.close();
        await rm(root, { recursive: true, force: true });
      }
    });
  const rows = (f: F, q: string) => f.db.transaction((tx) => tx.query(sql(q)));
  const reject = (p: Promise<unknown>, code: string) =>
    assert.rejects(p, (e: unknown) => e instanceof ApiFault && e.code === code);
  const upload = async (
    f: F,
    s: S,
    user = 4,
    bytes = Buffer.from('file content'),
    name = 'file.txt',
  ) => {
    const p = await receive(s, proof(user), bytes, name);
    try {
      return await f.db.transaction((tx) => s.finalize(tx, proof(user), p, randomUUID()));
    } finally {
      await s.release(p.id);
    }
  };
  check(
    'T040 paginated current-scope task history/legacy structured values/admin recursive redaction and mutation actor/time/request',
    async (f) => {
      const tasks = taskService({ clock: () => new Date(now) }),
        h = historyService({ clock: () => new Date(now) }),
        request = randomUUID();
      await f.db.transaction((tx) =>
        tasks.createComment(tx, proof(4), 1, { body: '<script>plain</script>' }, request),
      );
      await f.db.transaction((tx) =>
        tasks.patch(tx, proof(4), 1, { version: 1, title: 'Changed' }, randomUUID()),
      );
      const p = await f.db.transaction((tx) => h.page(tx, proof(5), 1, { page: 1, pageSize: 1 }));
      assert.equal(p.total, 2);
      assert.equal(p.items[0]!.request_id, request);
      assert.equal(p.items[0]!.actor!.id, 4);
      const op = operations.find((o) => o.path === '/api/tasks/{id}/events')!.operation;
      parseSchema(op.responses['200']!.content!['application/json']!.schema, p);
      await reject(
        f.db.transaction((tx) => h.page(tx, proof(4), 3, {})),
        'NOT_FOUND',
      );
      await reject(
        f.db.transaction((tx) => h.page(tx, proof(4), null, {})),
        'FORBIDDEN',
      );
      await f.db.transaction((tx) =>
        tx.execute(
          insert('admin_events', {
            actor_id: 1,
            action: 'legacy_test',
            resource_type: 'user',
            resource_id: 4,
            redacted_changes: JSON.stringify({
              nested: { temp_password: 'never-expose', accessToken: 'never-expose' },
              password_reset: true,
            }),
            request_id: request,
          }),
        ),
      );
      const a = await f.db.transaction((tx) => h.page(tx, proof(1), null, {}));
      assert(!JSON.stringify(a).includes('never-expose'));
      assert(JSON.stringify(a).includes('password_reset'));
      assert.deepEqual(
        redactAudit({
          password_reset: true,
          nested: { token: 'secret' },
          field: 'password',
          before: 'secret',
          after: 'secret',
        }),
        {
          password_reset: true,
          nested: { token: '[REDACTED]' },
          field: 'password',
          before: '[REDACTED]',
          after: '[REDACTED]',
        },
      );
    },
  );
  check(
    'T041 streamed fingerprint/name/UUID storage/exact bytes and private download DTO',
    async (f, s, root) => {
      const bytes = Buffer.from('ไทย UTF8 file');
      const a = await upload(f, s, 4, bytes, 'docs/งาน.txt');
      assert.equal(a.item.original_name, 'งาน.txt');
      assert.equal(a.item.sha256, createHash('sha256').update(bytes).digest('hex'));
      assert(!JSON.stringify(a).includes(root));
      const keys = await readdir(join(root, 'attachments'));
      assert.equal(keys.length, 1);
      assert.match(keys[0]!, /^[a-f0-9-]{36}$/);
      assert.deepEqual(await readFile(join(root, 'attachments', keys[0]!)), bytes);
      const d = await f.db.transaction((tx) => s.download(tx, proof(5), a.item.id, randomUUID()));
      const parts = [];
      for await (const chunk of await d.open()) parts.push(chunk as Buffer);
      assert.deepEqual(Buffer.concat(parts), bytes);
      assert.deepEqual(await s.usage(), { stored_bytes: bytes.length, reserved_bytes: 0 });
      assert.equal((await rows(f, 'SELECT * FROM dbo.task_events')).length, 1);
    },
  );
  check('T041 allowlist magic bounded ZIP/Office directory and fatal UTF8', async (f, s) => {
    for (const [name, b] of [
      ['plain.csv', Buffer.from('a,b\nไทย,1')],
      ['file.pdf', Buffer.from('%PDF-1.7\nfixture\n%%EOF')],
      ['file.jpg', Buffer.from([255, 216, 255, 224, 255, 217])],
      [
        'file.png',
        (() => {
          const b = Buffer.alloc(45);
          Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(b);
          b.write('IHDR', 12);
          b.writeUInt32BE(1, 16);
          b.writeUInt32BE(1, 20);
          b.write('IEND', 37);
          return b;
        })(),
      ],
      [
        'file.webp',
        (() => {
          const b = Buffer.alloc(20);
          b.write('RIFF');
          b.writeUInt32LE(12, 4);
          b.write('WEBP', 8);
          b.write('VP8 ', 12);
          return b;
        })(),
      ],
      ['file.zip', archive([])],
      ['file.docx', archive(['[Content_Types].xml', 'word/document.xml'])],
      ['file.xlsx', archive(['[Content_Types].xml', 'xl/workbook.xml'])],
      ['file.pptx', archive(['[Content_Types].xml', 'ppt/presentation.xml'])],
    ] as const)
      await upload(f, s, 4, b, name);
    for (const [name, b] of [
      ['script.html', Buffer.from('<html>')],
      ['../file.txt', Buffer.from('text')],
      ['image.png', Buffer.from('plain')],
      ['image.jpg', Buffer.from('plain')],
      ['file.txt', Buffer.from([0xff])],
      ['file.csv', Buffer.from([0])],
      ['file.pdf', Buffer.from('%PDF-withoutEOF')],
      ['file.docx', archive(['[Content_Types].xml', 'xl/workbook.xml'])],
      ['file.zip', Buffer.from('PKfake')],
    ] as const)
      await reject(receive(s, proof(4), b, name), 'INVALID_FILE_TYPE');
    assert.equal((await s.usage()).reserved_bytes, 0);
    assert.equal((await rows(f, 'SELECT * FROM dbo.attachments')).length, 9);
  });
  check(
    'T041 actual 1byte/10MiB/max+1/empty and multipart single-file/unknown-field rejection releases temps',
    async (f, s, root) => {
      await upload(f, s, 4, Buffer.from('x'));
      await upload(f, s, 4, Buffer.alloc(10485760, 97), 'maximum.txt');
      await reject(receive(s, proof(4), Buffer.alloc(10485761, 97)), 'FILE_TOO_LARGE');
      await reject(receive(s, proof(4), Buffer.alloc(0)), 'VALIDATION_FAILED');
      const extra =
        '--friday-file-fixture\r\nContent-Disposition: form-data; name="extra"\r\n\r\nbad\r\n';
      await reject(
        s.receive(multipart('file.txt', Buffer.from('a'), extra), proof(4), 1),
        'VALIDATION_FAILED',
      );
      assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
      assert.equal((await s.usage()).reserved_bytes, 0);
      assert.equal((await rows(f, 'SELECT * FROM dbo.upload_reservations')).length, 0);
    },
  );
  check(
    'T042 concurrent quota reservation cannot exceed remaining space; failure releases bytes',
    async (f, s) => {
      await upload(f, s, 4, Buffer.alloc(15, 97));
      const results = await Promise.allSettled([
        receive(s, proof(4), Buffer.alloc(4, 98)),
        receive(s, proof(4), Buffer.alloc(4, 99)),
      ]);
      const ok = results.filter((r) => r.status === 'fulfilled');
      assert.equal(ok.length, 1);
      assert.equal(
        results.filter(
          (r) =>
            r.status === 'rejected' &&
            r.reason instanceof ApiFault &&
            r.reason.code === 'QUOTA_EXCEEDED',
        ).length,
        1,
      );
      for (const r of ok)
        if (r.status === 'fulfilled') {
          await f.db.transaction((tx) => s.finalize(tx, proof(4), r.value, randomUUID()));
          await s.release(r.value.id);
        }
      assert.deepEqual(await s.usage(), { stored_bytes: 19, reserved_bytes: 0 });
    },
    20,
  );
  check(
    'T041 finalize rechecks demotion/revocation/archived/deleted parent and failed metadata transaction leaves no effects',
    async (f, s, root) => {
      let p = await receive(s, proof(4));
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='viewer' WHERE user_id=4")),
      );
      await reject(
        f.db.transaction((tx) => s.finalize(tx, proof(4), p, randomUUID())),
        'FORBIDDEN',
      );
      await s.release(p.id);
      await f.db.transaction((tx) =>
        tx.execute(sql("UPDATE dbo.project_members SET access='editor' WHERE user_id=4")),
      );
      p = await receive(s, proof(4));
      await assert.rejects(
        f.db.transaction(async (tx) => {
          await s.finalize(tx, proof(4), p, randomUUID());
          throw new Error('Injected rollback after metadata/audit');
        }),
      );
      await s.release(p.id);
      for (const [query, reset, code] of [
        [
          "UPDATE dbo.projects SET archived_at='2026-10-01T00:00:00.000Z' WHERE id=1",
          'UPDATE dbo.projects SET archived_at=NULL WHERE id=1',
          'PROJECT_ARCHIVED',
        ],
        [
          "UPDATE dbo.teams SET archived_at='2026-10-01T00:00:00.000Z' WHERE id=1",
          'UPDATE dbo.teams SET archived_at=NULL WHERE id=1',
          'TEAM_ARCHIVED',
        ],
        [
          "UPDATE dbo.tasks SET deleted_at='2026-10-01T00:00:00.000Z',deleted_by=1 WHERE id=1",
          'UPDATE dbo.tasks SET deleted_at=NULL,deleted_by=NULL WHERE id=1',
          'NOT_FOUND',
        ],
      ] as const) {
        p = await receive(s, proof(4));
        await f.db.transaction((tx) => tx.execute(sql(query)));
        await reject(
          f.db.transaction((tx) => s.finalize(tx, proof(4), p, randomUUID())),
          code,
        );
        await s.release(p.id);
        await f.db.transaction((tx) => tx.execute(sql(reset)));
      }
      assert.deepEqual(await s.usage(), { stored_bytes: 0, reserved_bytes: 0 });
      assert.equal((await rows(f, 'SELECT * FROM dbo.attachments')).length, 0);
      assert.equal((await rows(f, 'SELECT * FROM dbo.task_events')).length, 0);
      assert.deepEqual(await readdir(join(root, 'attachments')), []);
    },
  );
  check(
    'T043 uploader/owner Lead/Admin vs other Editor/Viewer; deleted metadata scope; active restore and repeated delete no-op',
    async (f, s) => {
      const a = await upload(f, s);
      await reject(
        f.db.transaction((tx) => s.change(tx, proof(9), a.item.id, false, randomUUID())),
        'FORBIDDEN',
      );
      await reject(
        f.db.transaction((tx) => s.change(tx, proof(5), a.item.id, false, randomUUID())),
        'FORBIDDEN',
      );
      const d = await f.db.transaction((tx) =>
        s.change(tx, proof(4), a.item.id, false, randomUUID()),
      );
      const repeat = await f.db.transaction((tx) =>
        s.change(tx, proof(3), a.item.id, false, randomUUID()),
      );
      assert.equal(repeat.item.deleted_at, d.item.deleted_at);
      assert.equal((await rows(f, 'SELECT * FROM dbo.task_events')).length, 2);
      assert.equal(
        (await f.db.transaction((tx) => s.list(tx, proof(9), 1, { includeDeleted: true }))).total,
        0,
      );
      await reject(
        f.db.transaction((tx) => s.list(tx, proof(5), 1, { includeDeleted: true })),
        'FORBIDDEN',
      );
      assert.equal(
        (await f.db.transaction((tx) => s.list(tx, proof(4), 1, { includeDeleted: true }))).total,
        1,
      );
      await reject(
        f.db.transaction((tx) => s.download(tx, proof(4), a.item.id, randomUUID())),
        'NOT_FOUND',
      );
      await f.db.transaction((tx) => s.change(tx, proof(1), a.item.id, true, randomUUID()));
      await f.db.transaction((tx) => s.change(tx, proof(4), a.item.id, true, randomUUID()));
      assert.equal((await rows(f, 'SELECT * FROM dbo.task_events')).length, 3);
      assert.equal((await s.usage()).stored_bytes, a.item.bytes);
    },
  );
  check(
    'T043 exact UTC30day cutoff/current archived/deleted parent/private download/missing disk safely logged',
    async (f, s, root) => {
      const a = await upload(f, s);
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.attachments SET deleted_at='2026-09-06T00:30:00.000Z' WHERE id=@id", {
            id: a.item.id,
          }),
        ),
      );
      await reject(
        f.db.transaction((tx) => s.change(tx, proof(4), a.item.id, true, randomUUID())),
        'RETENTION_EXPIRED',
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.attachments SET deleted_at='2026-09-07T00:30:00.000Z' WHERE id=@id", {
            id: a.item.id,
          }),
        ),
      );
      await f.db.transaction((tx) => s.change(tx, proof(4), a.item.id, true, randomUUID()));
      await reject(
        f.db.transaction((tx) => s.download(tx, proof(7), a.item.id, randomUUID())),
        'NOT_FOUND',
      );
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.projects SET archived_at='2026-10-01T00:00:00.000Z' WHERE id=1"),
        ),
      );
      await reject(
        f.db.transaction((tx) => s.change(tx, proof(4), a.item.id, false, randomUUID())),
        'PROJECT_ARCHIVED',
      );
      const logs: unknown[] = [];
      const logged = await fileService(
        f.db,
        {
          directory: root,
          maxFileBytes: 10485760,
          totalUploadBytes: 1024,
          log: (e) => logs.push(e),
        },
        { clock: () => new Date(now) },
      );
      for (const key of await readdir(join(root, 'attachments')))
        await rm(join(root, 'attachments', key));
      const req = randomUUID();
      const d = await f.db.transaction((tx) => logged.download(tx, proof(5), a.item.id, req));
      await reject(d.open(), 'NOT_FOUND');
      assert.deepEqual(logs, [{ requestId: req, code: 'NOT_FOUND' }]);
    },
  );
  check(
    'T042 restart recovery receiving/finalizing/orphan preserves referenced file and accounts reservation release',
    async (f, s, root) => {
      const a = await upload(f, s);
      const p = await receive(s, proof(4), Buffer.from('abandoned'));
      const orphan = randomUUID();
      await writeFile(join(root, 'attachments', orphan), 'orphan');
      const temp = randomUUID(),
        id = randomUUID();
      await f.db.transaction(async (tx) => {
        await tx.execute(
          insert('upload_reservations', {
            id,
            user_id: 4,
            task_id: 1,
            temp_key: temp,
            reserved_bytes: 4,
            created_at: now,
            expires_at: '2026-10-06T01:30:00.000Z',
          }),
        );
        await tx.execute(
          sql('UPDATE dbo.storage_quota SET reserved_bytes=reserved_bytes+4 WHERE id=1'),
        );
      });
      await writeFile(join(root, 'upload-temp', temp), 'temp');
      f.db = await f.reopen();
      const restarted = await fileService(
        f.db,
        { directory: root, maxFileBytes: 10485760, totalUploadBytes: 1024 },
        { clock: () => new Date(now) },
      );
      await restarted.recover();
      assert.deepEqual(await restarted.usage(), { stored_bytes: a.item.bytes, reserved_bytes: 0 });
      assert.equal((await readdir(join(root, 'attachments'))).length, 1);
      assert(!(await readdir(join(root, 'attachments'))).includes(p.key));
      assert.deepEqual(await readdir(join(root, 'upload-temp')), []);
    },
  );

  check(
    'T041 file move failure remains tracked until repair/recovery, without metadata or audit',
    async (f, s, root) => {
      await rm(join(root, 'attachments'), { recursive: true });
      await writeFile(join(root, 'attachments'), 'injected directory fault');
      await assert.rejects(receive(s, proof(4)));
      assert.equal((await rows(f, 'SELECT * FROM dbo.attachments')).length, 0);
      assert.equal((await rows(f, 'SELECT * FROM dbo.task_events')).length, 0);
      assert.equal((await rows(f, 'SELECT * FROM dbo.upload_reservations')).length, 1);
      assert.equal((await s.usage()).reserved_bytes, 12);
      await rm(join(root, 'attachments'));
      await mkdir(join(root, 'attachments'));
      await s.recover();
      assert.deepEqual(await s.usage(), { stored_bytes: 0, reserved_bytes: 0 });
    },
  );
  check(
    'T043 purge queues before disk removal; cleanup retries retain bytes and metadata-only loss never double releases',
    async (f, s, root) => {
      const a = await upload(f, s);
      const key = String(
        (await rows(f, 'SELECT storage_key FROM dbo.attachments'))[0]!.storage_key,
      );
      await rm(join(root, 'attachments', key));
      await mkdir(join(root, 'attachments', key));
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.attachments SET deleted_at='2026-09-01T00:00:00.000Z' WHERE id=@id", {
            id: a.item.id,
          }),
        ),
      );
      await s.purgeExpired();
      assert.equal((await rows(f, 'SELECT * FROM dbo.attachments')).length, 0);
      assert.equal((await rows(f, 'SELECT * FROM dbo.file_cleanup_queue'))[0]!.attempts, 1);
      assert.equal((await s.usage()).stored_bytes, a.item.bytes);
      await rm(join(root, 'attachments', key), { recursive: true });
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.file_cleanup_queue SET next_attempt_at=@now', { now })),
      );
      await s.cleanup();
      await s.cleanup();
      assert.deepEqual(await s.usage(), { stored_bytes: 0, reserved_bytes: 0 });
      assert.equal((await rows(f, 'SELECT * FROM dbo.file_cleanup_queue')).length, 0);
    },
  );
}
