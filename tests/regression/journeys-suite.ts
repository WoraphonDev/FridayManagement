import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { insert, type Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { retentionService } from '../../src/services/retention.js';
import { retainNotifications } from '../../src/services/notification-center.js';
import { regressionFixture, epoch, type RegressionFixture } from './fixture.js';
async function result(response: Response, expected: number) {
  assert.equal(response.status, expected);
  return response.json();
}
async function bulk(f: RegressionFixture, project: number, count: number, special = false) {
  await f.db.transaction(async (tx) => {
    for (let i = 0; i < count; i++) {
      const title =
        special && i === 0
          ? '=SUM(1,2)'
          : special && i === 1
            ? 'ไทย,"quoted"\nบรรทัดใหม่'
            : `Synthetic bulk ${i}`;
      await tx.execute(
        insert('tasks', {
          project_id: project,
          title,
          creator_id: f.users.A,
          created_at: epoch,
          updated_at: epoch,
        }),
      );
      const id = Number(
        (
          await tx.query(
            sql('SELECT id FROM dbo.tasks WHERE project_id=@project AND title=@title', {
              project,
              title,
            }),
          )
        )[0]!.id,
      );
      await tx.execute(
        insert('board_positions', {
          task_id: id,
          project_id: project,
          status: 'todo',
          rank: i + 2,
        }),
      );
    }
  });
}
/** Parse exported RFC4180 cells including embedded quotes/newlines; no formula evaluation. */
function csvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false;
  const value = input.replace(/^\uFEFF/, '');
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]!;
    if (ch === '"') {
      if (quoted && value[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && value[i + 1] === '\n' && !quoted) {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else cell += ch;
  }
  assert.equal(quoted, false);
  assert.equal(cell, '');
  assert.equal(row.length, 0);
  return rows;
}
export function journeyAcceptance(
  label: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: false | string = false,
) {
  const scenario = (name: string, work: (f: RegressionFixture) => Promise<void>) =>
    test(`${label} ${name}`, { skip }, async () => {
      const f = await regressionFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  scenario(
    'T070 HTTP validation/checklist/leap monthly/concurrent same-key retry/reopen one successor',
    async (f) => {
      f.setTime('2028-03-01T00:00:00.000Z');
      await f.login('M1');
      for (const fields of [
        { assignee_id: f.users.V },
        { start_date: '2028-02-02', due_date: '2028-02-01' },
      ])
        assert.equal(
          (
            await f.request('M1', '/api/tasks', 'POST', {
              project_id: f.projects.Pshared,
              title: 'Invalid',
              ...fields,
            })
          ).status,
          422,
        );
      const made = await result(
          await f.request('M1', '/api/tasks', 'POST', {
            project_id: f.projects.Pshared,
            title: 'Leap monthly',
            due_date: '2028-01-31',
            recurrence: 'monthly',
            assignee_id: null,
          }),
          201,
        ),
        id = made.item.id;
      assert.equal(made.item.assignee_id, null);
      const sub = await result(
        await f.request('M1', `/api/tasks/${id}/subtasks`, 'POST', {
          task_version: 1,
          title: 'Checklist',
        }),
        201,
      );
      const denied = await result(
        await f.request('M1', `/api/tasks/${id}`, 'PATCH', { version: 2, status: 'done' }),
        422,
      );
      assert.equal(denied.error.code, 'SUBTASKS_INCOMPLETE');
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT source_task_id FROM dbo.recurrence_events')),
          )
        ).length,
        0,
      );
      await result(
        await f.request('M1', `/api/subtasks/${sub.item.id}`, 'PATCH', {
          version: 1,
          task_version: 2,
          done: true,
        }),
        200,
      );
      const key = randomUUID(),
        command = { version: 3, status: 'done' },
        headers = { 'Idempotency-Key': key };
      const [a, b] = await Promise.all([
        f.request('M1', `/api/tasks/${id}`, 'PATCH', command, headers),
        f.request('M1', `/api/tasks/${id}`, 'PATCH', command, headers),
      ]);
      const done = await result(a, 200);
      assert.deepEqual(await result(b, 200), done);
      assert.equal(done.successor.due_date, '2028-02-29');
      assert.equal(done.successor.recurrence_anchor_day, 31);
      const successor = done.successor.id;
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.attachments WHERE task_id=@id', { id: successor })),
          )
        ).length,
        0,
      );
      const copied = (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT id,done FROM dbo.subtasks WHERE task_id=@id', { id: successor })),
        )
      )[0]!;
      assert.equal(copied.done, 0);
      assert.equal(
        (
          await f.request('M1', `/api/subtasks/${sub.item.id}`, 'PATCH', {
            version: 2,
            task_version: 4,
            done: false,
          })
        ).status,
        422,
      );
      await result(
        await f.request('M1', `/api/tasks/${id}`, 'PATCH', { version: 4, status: 'todo' }),
        200,
      );
      const repeat = await result(
        await f.request('M1', `/api/tasks/${id}`, 'PATCH', { version: 5, status: 'done' }),
        200,
      );
      assert.equal(repeat.successor, null);
      assert.equal(repeat.item.successor_task_id, successor);
      await result(
        await f.request('M1', `/api/subtasks/${copied.id}`, 'PATCH', {
          version: 1,
          task_version: 1,
          done: true,
        }),
        200,
      );
      const next = await result(
        await f.request('M1', `/api/tasks/${successor}`, 'PATCH', { version: 2, status: 'done' }),
        200,
      );
      assert.equal(next.successor.due_date, '2028-03-31');
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT source_task_id FROM dbo.recurrence_events')),
          )
        ).length,
        2,
      );
    },
  );
  scenario(
    'T070 real HTTP trash/restore/cutoff/purge removes referenced bytes and keeps purge audit',
    async (f) => {
      await f.login('A');
      const id = f.tasks.Pshared;
      const key = String(
        (
          await f.db.transaction((tx) =>
            tx.query(
              sql('SELECT storage_key FROM dbo.attachments WHERE id=@id', { id: f.files.Pshared }),
            ),
          )
        )[0]!.storage_key,
      );
      await result(await f.request('A', `/api/tasks/${id}`, 'DELETE', { version: 1 }), 200);
      assert.equal(
        (await f.request('A', `/api/attachments/${f.files.Pshared}/download`)).status,
        404,
      );
      await result(await f.request('A', `/api/tasks/${id}/restore`, 'POST', { version: 2 }), 200);
      assert.deepEqual(
        Buffer.from(
          await (
            await f.request('A', `/api/attachments/${f.files.Pshared}/download`)
          ).arrayBuffer(),
        ),
        f.bytes,
      );
      await result(await f.request('A', `/api/tasks/${id}`, 'DELETE', { version: 3 }), 200);
      f.setTime(new Date(Date.parse(epoch) + 30 * 86400000).toISOString());
      await f.login('A');
      const expired = await result(
        await f.request('A', `/api/tasks/${id}/restore`, 'POST', { version: 4 }),
        422,
      );
      assert.equal(expired.error.code, 'RETENTION_EXPIRED');
      const service = await retentionService(
        f.db,
        { directory: f.root, maxFileBytes: 10485760, totalUploadBytes: 5368709120 },
        { clock: f.clock },
      );
      await service.run();
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.tasks WHERE id=@id', { id })),
          )
        ).length,
        0,
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.attachments WHERE task_id=@id', { id })),
          )
        ).length,
        0,
      );
      await assert.rejects(access(join(f.root, 'attachments', key)));
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(
              sql(
                "SELECT id FROM dbo.admin_events WHERE action='retention_purge' AND resource_id=@id",
                { id },
              ),
            ),
          )
        ).length,
        1,
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota')),
          )
        )[0]!.stored_bytes,
        f.bytes.length * 3,
      );
    },
  );
  scenario(
    'T071 HTTP >500 board fallback, complete paginated rows and Bangkok midnight/null dates',
    async (f) => {
      await bulk(f, f.projects.P1, 500);
      await f.login('M1');
      const board = await result(
        await f.request('M1', `/api/projects/${f.projects.P1}/board`),
        200,
      );
      assert.equal(board.mode, 'list_required');
      assert.equal(board.total, 501);
      assert.equal(board.tasks.length, 0);
      assert(
        board.columns.every(
          (c: { complete: boolean; task_ids: number[] }) => !c.complete && c.task_ids.length === 0,
        ),
      );
      const ids = new Set<number>();
      for (let page = 1; page <= 6; page++) {
        const list = await result(
          await f.request('M1', `/api/tasks?project=${f.projects.P1}&pageSize=100&page=${page}`),
          200,
        );
        assert.equal(list.total, 501);
        for (const task of list.items) {
          assert(!ids.has(task.id));
          ids.add(task.id);
        }
      }
      assert.equal(ids.size, 501);
      const noDates = await result(
        await f.request('M1', `/api/tasks?project=${f.projects.P1}&has_due=false`),
        200,
      );
      assert.equal(noDates.total, 500);
      assert(noDates.items.every((t: { due_date: null }) => t.due_date === null));
      f.setTime('2026-10-06T16:59:59.999Z');
      await f.login('M1');
      assert.equal(
        (await result(await f.request('M1', '/api/me'), 200)).bangkok_today,
        '2026-10-06',
      );
      f.setTime('2026-10-06T17:00:00.000Z');
      assert.equal(
        (await result(await f.request('M1', '/api/me'), 200)).bangkok_today,
        '2026-10-07',
      );
    },
  );
  scenario(
    'T072 comment same-key concurrency immutable history, recipients/no-self/read scope and90day cutoff',
    async (f) => {
      await f.login('M1');
      await f.login('M2');
      const id = f.tasks.Pshared,
        key = randomUUID(),
        body = { body: '<script>ไทย</script>' },
        headers = { 'Idempotency-Key': key };
      const [a, b] = await Promise.all([
        f.request('M1', `/api/tasks/${id}/comments`, 'POST', body, headers),
        f.request('M1', `/api/tasks/${id}/comments`, 'POST', body, headers),
      ]);
      const made = await result(a, 201);
      assert.deepEqual(await result(b, 201), made);
      const events = await result(await f.request('M1', `/api/tasks/${id}/events`), 200);
      assert.equal(events.total, 1);
      assert.equal(
        (await f.request('M1', `/api/tasks/${id}/events`, 'PATCH', { body: 'tamper' })).status,
        404,
      );
      const notifications = await f.db.transaction((tx) =>
        tx.query(
          sql(
            "SELECT id,recipient_id FROM dbo.notifications WHERE task_id=@id AND message<>'Shared notification'",
            { id },
          ),
        ),
      );
      assert.deepEqual(
        notifications.map((n) => n.recipient_id).sort(),
        [f.users.A, f.users.M2].sort(),
      );
      assert.equal(
        (
          await f.request(
            'M1',
            `/api/notifications/${notifications.find((n) => n.recipient_id === f.users.A)!.id}/read`,
            'POST',
          )
        ).status,
        404,
      );
      const readall = await result(
        await f.request('M2', '/api/notifications/read-all', 'POST'),
        200,
      );
      assert.equal(readall.marked_count, 2);
      const stale = (
        await f.db.transaction((tx) =>
          tx.query(
            sql('SELECT read_at FROM dbo.notifications WHERE task_id=@id', {
              id: f.tasks.Pprivate,
            }),
          ),
        )
      )[0]!;
      assert.equal(stale.read_at, null);
      const cutoff = new Date(Date.parse(epoch) - 90 * 86400000).toISOString(),
        after = new Date(Date.parse(cutoff) + 1).toISOString();
      await f.db.transaction(async (tx) => {
        for (const created_at of [cutoff, after])
          await tx.execute(
            insert('notifications', {
              recipient_id: f.users.M1,
              task_id: id,
              type: 'comment',
              message: created_at,
              dedupe_key: randomUUID(),
              created_at,
            }),
          );
      });
      await retainNotifications(f.db, f.clock);
      const remaining = await f.db.transaction((tx) =>
        tx.query(
          sql('SELECT message FROM dbo.notifications WHERE recipient_id=@id', { id: f.users.M1 }),
        ),
      );
      assert.deepEqual(
        remaining.map((r) => r.message),
        [after],
      );
    },
  );
  scenario(
    'T072 real multipart10MiB/+1/invalid magic preserves quota and cleans reservations/temp',
    async (f) => {
      await f.login('M1');
      const id = f.tasks.Pshared,
        max = 10485760;
      async function upload(bytes: Uint8Array, name = 'synthetic.txt') {
        const form = new FormData();
        form.append('file', new Blob([new Uint8Array(bytes)]), name);
        return f.request('M1', `/api/tasks/${id}/attachments`, 'POST', form);
      }
      const bytes = new Uint8Array(max).fill(120),
        made = await result(await upload(bytes), 201);
      const download = await f.request('M1', `/api/attachments/${made.item.id}/download`);
      assert.equal(download.status, 200);
      const hash = (b: Uint8Array) => createHash('sha256').update(b).digest('hex');
      assert.equal(hash(new Uint8Array(await download.arrayBuffer())), hash(bytes));
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota')),
      );
      assert.equal((await upload(new Uint8Array(max + 1).fill(120))).status, 413);
      assert.equal((await upload(new Uint8Array([77, 90, 0, 1]), 'fake.pdf')).status, 422);
      assert.equal((await upload(new Uint8Array())).status, 422);
      assert.deepEqual(
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota')),
        ),
        before,
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.upload_reservations'))))
          .length,
        0,
      );
      assert.deepEqual(await readdir(join(f.root, 'upload-temp')), []);
    },
  );
  scenario(
    'T073 HTTP report owner-team/date/reopen and parsed Thai/formula/newline CSV all121rows',
    async (f) => {
      await bulk(f, f.projects.Pshared, 120, true);
      await f.login('M2');
      const shared = f.projects.Pshared,
        id = f.tasks.Pshared,
        query = `?project=${shared}`;
      const summary = await result(await f.request('M2', '/api/reports/summary' + query), 200);
      assert.equal(summary.total, 121);
      assert.equal(summary.by_status.todo, 121);
      const team = Number(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT owner_team_id FROM dbo.projects WHERE id=@id', { id: shared })),
          )
        )[0]!.owner_team_id,
      );
      assert.equal(
        (
          await result(
            await f.request(
              'M2',
              `/api/reports/summary${query}&team=${team}&assignee=${f.users.M2}`,
            ),
            200,
          )
        ).total,
        1,
      );
      const csv = await f.request('M2', '/api/export/tasks.csv' + query);
      assert.equal(csv.status, 200);
      const value = await csv.text();
      // Fetch decodes/removes UTF-8 BOM; inspect raw bytes separately in the browser download suite.
      const rows = csvRows(value);
      assert.equal(rows.length, 122);
      assert.equal(new Set(rows.slice(1).map((r) => r[0])).size, 121);
      assert(rows.some((r) => r[1] === "'=SUM(1,2)"));
      assert(rows.some((r) => r[1] === 'ไทย,"quoted"\nบรรทัดใหม่'));
      assert(!value.includes('PRIVATE_ONLY'));
      const sub = Number(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT id FROM dbo.subtasks WHERE task_id=@id', { id })),
          )
        )[0]!.id,
      );
      await result(
        await f.request('M2', `/api/subtasks/${sub}`, 'PATCH', {
          version: 1,
          task_version: 1,
          done: true,
        }),
        200,
      );
      await result(
        await f.request('M2', `/api/tasks/${id}`, 'PATCH', { version: 2, status: 'done' }),
        200,
      );
      const completed = `${query}&date_basis=completed&date_from=2026-10-06&date_to=2026-10-06`;
      assert.equal(
        (await result(await f.request('M2', '/api/reports/summary' + completed), 200)).total,
        1,
      );
      await result(
        await f.request('M2', `/api/tasks/${id}`, 'PATCH', { version: 3, status: 'todo' }),
        200,
      );
      const reopened = await result(await f.request('M2', '/api/reports/summary' + completed), 200);
      assert.equal(reopened.total, 0);
      assert.equal(reopened.completion_percentage, 0);
      assert.equal(reopened.done_in_period, 0);
    },
  );
}
