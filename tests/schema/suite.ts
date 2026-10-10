import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database, Transaction, Row } from '../../src/domain/database.js';
import { migrate } from '../../src/repository/migrate.js';
import { mutateWithEffects } from '../../src/domain/atomic-effects.js';
import {
  tables,
  insert,
  statement as s,
  hash,
  time,
  later,
  seed,
  type Fixture,
} from './fixtures.js';

export function schemaAcceptance(
  profile: string,
  create: (initial?: boolean) => Promise<Fixture>,
  skip: string | false = false,
) {
  const run = (
    name: string,
    work: (db: Database, fixture: Fixture) => Promise<void>,
    initial = true,
  ) =>
    test(`${profile}: ${name}`, { skip }, async () => {
      const fixture = await create(initial);
      try {
        await work(fixture.db, fixture);
      } finally {
        await fixture.close();
      }
    });
  const reject = (db: Database, query: ReturnType<typeof s>) =>
    assert.rejects(
      db.transaction((tx) => tx.execute(query)),
      (error) => {
        // SQL Server wraps driver errors in TransactionFailure; inspect the driver cause.
        const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error;
        return (
          cause instanceof Error &&
          /constraint|duplicate key|datatype|cannot store|malformed JSON|truncated|overflow|conversion failed|converting data type|out-of-range|out of range/i.test(
            cause.message,
          )
        );
      },
    );
  const rows = <R extends Row = Row>(db: Database, query: ReturnType<typeof s>) =>
    db.transaction((tx) => tx.query<R>(query));
  run(
    'All dictionary tables, enabled/trusted NO ACTION FKs and required indexes exist',
    async (db) => {
      const sql = db.provider === 'sqlite';
      const pg = db.provider === 'postgres';
      const actual = await rows<{ name: string }>(db, {
        sqlite: pg
          ? 'SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema()'
          : "SELECT name FROM sqlite_master WHERE type='table'",
        sqlserver:
          "SELECT t.name FROM sys.tables t JOIN sys.schemas s ON s.schema_id=t.schema_id WHERE s.name=OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks'))",
      });
      const dictionary = readFileSync('TeamFlow_SRS_v1.0.md', 'utf8')
        .split('## 5. Data Dictionary')[1]!
        .split('### 5.1')[0]!;
      for (const match of dictionary.matchAll(/^\| ([a-z_]+) \|/gm))
        assert(
          actual.some((row) => row.name === match[1]),
          `SRS entity ${match[1]}`,
        );
      for (const table of [...tables, 'schema_migrations'])
        assert(
          actual.some((t) => t.name === table),
          table,
        );
      if (sql) {
        assert.deepEqual(await rows(db, s('PRAGMA foreign_key_check')), []);
        const details = await rows(db, s('PRAGMA table_list'));
        for (const table of tables) assert.equal(details.find((r) => r.name === table)?.strict, 1);
        let count = 0;
        for (const table of tables) {
          const keys = await rows(db, s(`PRAGMA foreign_key_list([${table}])`));
          count += new Set(keys.map((r) => r.id)).size;
          for (const key of keys) {
            assert.equal(key.on_delete, 'NO ACTION');
            assert.equal(key.on_update, 'NO ACTION');
          }
        }
        assert.equal(count, 51);
        const indexes = await rows<{ name: string }>(
          db,
          s("SELECT name FROM sqlite_master WHERE type='index'"),
        );
        for (const name of [
          'ix_team_members_user_id',
          'ix_project_members_user_id',
          'ix_tasks_project_id_status_deleted_at',
          'ix_tasks_assignee_id_due_date',
          'ix_tasks_completed_at',
          'ix_comments_task_id_id',
          'ix_task_events_task_id_id',
          'ix_notifications_recipient_id_read_at',
          'ix_sessions_absolute_expires_at',
          'ix_sessions_last_seen_at',
          'uq_board_positions_project_id_status_rank',
        ])
          assert(
            indexes.some((i) => i.name === name),
            name,
          );
      } else if (pg) {
        // PostgreSQL: every FK is NO ACTION and validated; CHECKs are validated; indexes exist.
        const keys = await rows<{ delete_rule: string; update_rule: string; validated: number }>(
          db,
          s(
            'SELECT rc.delete_rule,rc.update_rule,CASE WHEN c.convalidated THEN 1 ELSE 0 END AS validated FROM information_schema.referential_constraints rc JOIN pg_constraint c ON c.conname=rc.constraint_name AND c.connamespace=current_schema()::regnamespace WHERE rc.constraint_schema=current_schema()',
          ),
        );
        assert.equal(keys.length, 51);
        for (const key of keys)
          assert.deepEqual(key, {
            delete_rule: 'NO ACTION',
            update_rule: 'NO ACTION',
            validated: 1,
          });
        const checks = await rows<{ validated: number }>(
          db,
          s(
            "SELECT CASE WHEN convalidated THEN 1 ELSE 0 END AS validated FROM pg_constraint WHERE contype='c' AND connamespace=current_schema()::regnamespace",
          ),
        );
        assert(checks.length > 100);
        assert(checks.every((c) => c.validated === 1));
        const indexes = await rows<{ name: string; definition: string }>(
          db,
          s(
            'SELECT indexname AS name,indexdef AS definition FROM pg_indexes WHERE schemaname=current_schema()',
          ),
        );
        for (const name of ['uq_tasks_predecessor_task_id', 'uq_tasks_successor_task_id'])
          assert.match(
            String(indexes.find((i) => i.name === name)?.definition),
            /UNIQUE INDEX .* WHERE .*IS NOT NULL/,
          );
        for (const name of [
          'ix_team_members_user_id',
          'ix_project_members_user_id',
          'ix_tasks_project_id_status_deleted_at',
          'ix_tasks_assignee_id_due_date',
          'ix_tasks_completed_at',
          'ix_comments_task_id_id',
          'ix_task_events_task_id_id',
          'ix_notifications_recipient_id_read_at',
          'ix_sessions_absolute_expires_at',
          'ix_sessions_last_seen_at',
          'uq_board_positions_project_id_status_rank',
        ])
          assert(
            indexes.some((i) => i.name === name),
            name,
          );
      } else {
        const keys = await rows(
          db,
          s(
            "SELECT is_disabled,is_not_trusted,delete_referential_action,update_referential_action FROM sys.foreign_keys WHERE schema_id=SCHEMA_ID(OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks')))",
          ),
        );
        assert.equal(keys.length, 51);
        for (const key of keys)
          assert.deepEqual(key, {
            is_disabled: 0,
            is_not_trusted: 0,
            delete_referential_action: 0,
            update_referential_action: 0,
          });
        const checks = await rows(
          db,
          s(
            "SELECT is_disabled,is_not_trusted FROM sys.check_constraints WHERE schema_id=SCHEMA_ID(OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks')))",
          ),
        );
        assert(checks.length > 100);
        for (const check of checks) assert.deepEqual(check, { is_disabled: 0, is_not_trusted: 0 });
        const indexes = await rows(
          db,
          s(
            "SELECT name,is_unique,has_filter,filter_definition FROM sys.indexes WHERE object_id=OBJECT_ID(N'dbo.tasks')",
          ),
        );
        for (const name of ['uq_tasks_predecessor_task_id', 'uq_tasks_successor_task_id']) {
          const index = indexes.find((i) => i.name === name);
          assert.equal(index?.is_unique, 1);
          assert.equal(index?.has_filter, 1);
          assert.match(String(index?.filter_definition), /IS NOT NULL/);
        }
        const requiredIndexes = [
          'ix_team_members_user_id',
          'ix_project_members_user_id',
          'ix_tasks_project_id_status_deleted_at',
          'ix_tasks_assignee_id_due_date',
          'ix_tasks_completed_at',
          'ix_comments_task_id_id',
          'ix_task_events_task_id_id',
          'ix_notifications_recipient_id_read_at',
          'ix_sessions_absolute_expires_at',
          'ix_sessions_last_seen_at',
          'uq_board_positions_project_id_status_rank',
        ];
        const allIndexes = await rows(
          db,
          s(
            "SELECT i.name,i.is_disabled FROM sys.indexes i JOIN sys.tables t ON t.object_id=i.object_id WHERE t.schema_id=SCHEMA_ID(OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks')))",
          ),
        );
        for (const name of requiredIndexes)
          assert.equal(allIndexes.find((i) => i.name === name)?.is_disabled, 0, name);
        const physical = await rows(
          db,
          s(
            "SELECT t.name AS table_name,c.name AS column_name,TYPE_NAME(c.user_type_id) AS type_name,c.scale,c.collation_name FROM sys.columns c JOIN sys.tables t ON t.object_id=c.object_id WHERE t.schema_id=SCHEMA_ID(OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks')))",
          ),
        );
        for (const [table, column, type] of [
          ['tasks', 'start_date', 'date'],
          ['tasks', 'updated_at', 'datetime2'],
          ['tasks', 'version', 'int'],
          ['users', 'active', 'bit'],
          ['attachments', 'bytes', 'bigint'],
          ['tasks', 'description', 'nvarchar'],
        ])
          assert.equal(
            physical.find((c) => c.table_name === table && c.column_name === column)?.type_name,
            type,
          );
        assert.equal(
          physical.find((c) => c.table_name === 'tasks' && c.column_name === 'updated_at')?.scale,
          3,
        );
        for (const [table, column] of [
          ['users', 'username'],
          ['teams', 'name'],
        ])
          assert.equal(
            physical.find((c) => c.table_name === table && c.column_name === column)
              ?.collation_name,
            'Latin1_General_100_CI_AS_SC',
          );
        const identity = await rows(
          db,
          s("SELECT last_value FROM sys.identity_columns WHERE object_id=OBJECT_ID(N'dbo.tasks')"),
        );
        assert.equal(identity.length, 1);
      }
      assert.deepEqual(
        await rows(db, s('SELECT id,stored_bytes,reserved_bytes FROM dbo.storage_quota')),
        [{ id: 1, stored_bytes: 0, reserved_bytes: 0 }],
      );
    },
  );
  run(
    'Case-insensitive username/team uniqueness, Thai/Unicode and memberships enforce boundaries',
    async (db) => {
      const user = (username: string) =>
        insert('users', {
          username,
          display_name: 'ทดสอบ',
          password_hash: 'fixture-only-not-authenticatable',
        });
      for (const name of ['admin', 'ADMIN', 'bad name', 'badไทย', 'bad/name'])
        await reject(db, user(name));
      await db.transaction((tx) => tx.execute(user('User._-01')));
      await reject(db, user('a'.repeat(61)));
      await db.transaction((tx) => tx.execute(insert('teams', { name: 'Équipe' })));
      for (const name of ['équipe', 'E\u0301QUIPE']) await reject(db, insert('teams', { name }));
      await reject(db, insert('teams', { name: 'ทีม A ' }));
      await reject(db, s('UPDATE dbo.users SET auth_version=0 WHERE id=1'));
      await reject(db, s('UPDATE dbo.users SET version=0 WHERE id=1'));
      await reject(db, insert('organizations', { id: 2, name: 'อื่น' }));
      await db.transaction((tx) =>
        tx.execute(insert('team_members', { team_id: 1, user_id: 1, team_role: 'lead' })),
      );
      await reject(db, insert('team_members', { team_id: 1, user_id: 1, team_role: 'member' }));
      await reject(
        db,
        insert('project_members', { project_id: 1, user_id: 999, access: 'viewer', added_by: 1 }),
      );
      await db.transaction((tx) =>
        tx.execute(
          insert('project_members', { project_id: 1, user_id: 2, access: 'editor', added_by: 1 }),
        ),
      );
    },
  );
  run(
    'UTF16 text storage matches DTO limits including emoji and Thai trailing spaces',
    async (db) => {
      await db.transaction((tx) =>
        tx.execute(
          s('UPDATE dbo.tasks SET title=@title,description=@description WHERE id=1', {
            title: '😀'.repeat(100),
            description: 'ก'.repeat(10000),
          }),
        ),
      );
      for (const title of ['😀'.repeat(101), 'ก'.repeat(201), 'ก'.repeat(200) + ' '])
        await reject(db, s('UPDATE dbo.tasks SET title=@title WHERE id=1', { title }));
      await reject(
        db,
        s('UPDATE dbo.tasks SET description=@text WHERE id=1', { text: '😀'.repeat(5001) }),
      );
      await reject(db, insert('comments', { task_id: 1, author_id: 1, body: 'ก'.repeat(5001) }));
      const row = (await rows(db, s('SELECT title,description FROM dbo.tasks WHERE id=1')))[0]!;
      assert.equal(String(row.title).length, 200);
      assert.equal(String(row.description).length, 10000);
    },
  );
  run(
    'Subtask/comment/attachment/admin records enforce FK, JSON, UUID, byte and version boundaries',
    async (db) => {
      const storage = randomUUID();
      await db.transaction(async (tx) => {
        await tx.execute(insert('subtasks', { task_id: 1, title: 'รายการย่อย', done: 0 }));
        await tx.execute(insert('comments', { task_id: 1, author_id: 1, body: 'ข้อความทดสอบ' }));
        await tx.execute(
          insert('attachments', {
            task_id: 1,
            uploader_id: 1,
            original_name: 'ขนาดสูงสุด.txt',
            storage_key: storage,
            bytes: 10485760,
            validated_type: 'text/plain',
            sha256: hash,
          }),
        );
        await tx.execute(
          insert('admin_events', {
            actor_id: 1,
            action: 'fixture_review',
            resource_type: 'organization',
            resource_id: 1,
            redacted_changes: '{}',
            request_id: randomUUID(),
          }),
        );
      });
      await reject(db, s('UPDATE dbo.subtasks SET version=0'));
      await reject(db, s('UPDATE dbo.comments SET author_id=999'));
      await reject(db, s('UPDATE dbo.attachments SET bytes=0'));
      await reject(db, s('UPDATE dbo.attachments SET bytes=10485761'));
      await reject(db, s("UPDATE dbo.attachments SET sha256='not-a-hash'"));
      await reject(db, s("UPDATE dbo.attachments SET storage_key='not-a-uuid'"));
      await reject(db, s("UPDATE dbo.admin_events SET redacted_changes='invalid'"));
      await reject(
        db,
        insert('attachments', {
          task_id: 1,
          uploader_id: 1,
          original_name: 'ซ้ำ.txt',
          storage_key: storage,
          bytes: 1,
          validated_type: 'text/plain',
          sha256: hash,
        }),
      );
      for (const table of ['subtasks', 'comments', 'attachments', 'admin_events'])
        assert.equal((await rows(db, s(`SELECT id FROM dbo.${table}`))).length, 1);
    },
  );
  run(
    'Date-only leap boundaries and UTC millisecond timestamps serialize as provider-independent primitives',
    async (db) => {
      await db.transaction((tx) =>
        tx.execute(
          s('UPDATE dbo.tasks SET start_date=@start,due_date=@due,updated_at=@time WHERE id=1', {
            start: '2024-02-29',
            due: '2024-03-01',
            time,
          }),
        ),
      );
      assert.deepEqual(
        await rows(db, s('SELECT start_date,due_date,updated_at FROM dbo.tasks WHERE id=1')),
        [{ start_date: '2024-02-29', due_date: '2024-03-01', updated_at: time }],
      );
      for (const due of ['2023-02-29', '2024-02-30', '2024-13-01', '0000-01-01'])
        await reject(db, s('UPDATE dbo.tasks SET due_date=@due WHERE id=1', { due }));
      await reject(
        db,
        s('UPDATE dbo.tasks SET start_date=@start WHERE id=1', { start: '2025-01-01' }),
      );
      await db.transaction((tx) =>
        tx.execute(
          s('UPDATE dbo.tasks SET start_date=@start,due_date=@due WHERE id=2', {
            start: '0001-01-01',
            due: '9999-12-31',
          }),
        ),
      );
      assert.deepEqual(await rows(db, s('SELECT start_date,due_date FROM dbo.tasks WHERE id=2')), [
        { start_date: '0001-01-01', due_date: '9999-12-31' },
      ]);
      await db.transaction((tx) => tx.execute(s('UPDATE dbo.users SET active=0 WHERE id=2')));
      assert.deepEqual(await rows(db, s('SELECT active FROM dbo.users WHERE id=2')), [
        { active: 0 },
      ]);
      if (db.provider === 'sqlite')
        for (const date of [
          '2026-10-06T00:00:00Z',
          '2026-10-06T07:00:00.000+07:00',
          '2026-02-30T00:00:00.000Z',
        ])
          await reject(db, s('UPDATE dbo.tasks SET updated_at=@date WHERE id=1', { date }));
    },
  );
  run(
    'Task enums, recurrence links/anchor, optional UNIQUE, completion and trash pairs enforce consistency',
    async (db) => {
      await db.transaction((tx) =>
        tx.execute(
          insert('tasks', { project_id: 1, title: 'ไม่มี board position', creator_id: 1 }),
        ),
      );
      for (const status of ['TODO', 'todo ', 'invalid'])
        await reject(db, s('UPDATE dbo.tasks SET status=@status WHERE id=3', { status }));
      await reject(db, s("UPDATE dbo.tasks SET recurrence='daily' WHERE id=1"));
      await reject(
        db,
        s("UPDATE dbo.tasks SET recurrence='monthly',due_date='2026-10-31' WHERE id=1"),
      );
      await db.transaction((tx) =>
        tx.execute(
          s(
            "UPDATE dbo.tasks SET recurrence='monthly',due_date='2026-10-31',recurrence_anchor_day=31 WHERE id=1",
          ),
        ),
      );
      await reject(db, s('UPDATE dbo.tasks SET recurrence_anchor_day=32 WHERE id=1'));
      await reject(db, s("UPDATE dbo.tasks SET recurrence='none' WHERE id=1"));
      await reject(db, s('UPDATE dbo.tasks SET predecessor_task_id=id WHERE id=1'));
      await reject(db, s('UPDATE dbo.tasks SET successor_task_id=id WHERE id=1'));
      await reject(db, s("UPDATE dbo.tasks SET status='done' WHERE id=3"));
      await reject(db, s('UPDATE dbo.tasks SET deleted_at=@time WHERE id=1', { time }));
      await db.transaction((tx) =>
        tx.execute(s('UPDATE dbo.tasks SET deleted_at=@time,deleted_by=1 WHERE id=1', { time })),
      );
      await db.transaction(async (tx) => {
        await tx.execute(
          insert('tasks', { project_id: 1, title: 'รอบ3', creator_id: 1, predecessor_task_id: 1 }),
        );
        await tx.execute(insert('tasks', { project_id: 1, title: 'อิสระ', creator_id: 1 }));
      });
      await reject(
        db,
        insert('tasks', { project_id: 1, title: 'ซ้ำ', creator_id: 1, predecessor_task_id: 1 }),
      );
    },
  );
  run(
    'Board uniqueness is immediate; negative ranks support two-phase swaps and status/project FKs',
    async (db) => {
      await reject(db, s('UPDATE dbo.board_positions SET rank=2 WHERE task_id=1'));
      await reject(db, s('UPDATE dbo.board_positions SET rank=0 WHERE task_id=1'));
      await reject(db, s('UPDATE dbo.board_positions SET project_id=2 WHERE task_id=1'));
      await reject(db, s("UPDATE dbo.tasks SET status='doing' WHERE id=1"));
      await db.transaction(async (tx) => {
        await tx.execute(s('UPDATE dbo.board_positions SET rank=-rank WHERE project_id=1'));
        await tx.execute(s('UPDATE dbo.board_positions SET rank=2 WHERE task_id=1'));
        await tx.execute(s('UPDATE dbo.board_positions SET rank=1 WHERE task_id=2'));
        await tx.execute(s('DELETE FROM dbo.board_positions WHERE task_id=1'));
        await tx.execute(s("UPDATE dbo.tasks SET status='doing',version=version+1 WHERE id=1"));
        await tx.execute(
          insert('board_positions', { task_id: 1, project_id: 1, status: 'doing', rank: 1 }),
        );
      });
      assert.deepEqual(
        await rows(db, s('SELECT task_id,status,rank FROM dbo.board_positions ORDER BY task_id')),
        [
          { task_id: 1, status: 'doing', rank: 1 },
          { task_id: 2, status: 'todo', rank: 1 },
        ],
      );
    },
  );
  run(
    'Explicit purge retains recurrence tombstones and cleanup snapshots, with no identity reuse',
    async (db) => {
      await db.transaction(async (tx) => {
        await tx.execute(s('UPDATE dbo.tasks SET successor_task_id=2 WHERE id=1'));
        await tx.execute(s('UPDATE dbo.tasks SET predecessor_task_id=1 WHERE id=2'));
        await tx.execute(insert('recurrence_events', { source_task_id: 1, generated_task_id: 2 }));
        await tx.execute(
          insert('attachments', {
            task_id: 1,
            uploader_id: 1,
            original_name: 'เอกสาร.txt',
            storage_key: randomUUID(),
            bytes: 10,
            validated_type: 'text/plain',
            sha256: hash,
          }),
        );
      });
      await reject(db, s('DELETE FROM dbo.users WHERE id=1'));
      await reject(db, s('DELETE FROM dbo.tasks WHERE id=1'));
      const attachment = (
        await rows(db, s('SELECT storage_key,bytes FROM dbo.attachments WHERE task_id=1'))
      )[0]!;
      await db.transaction(async (tx) => {
        await tx.execute(
          insert('file_cleanup_queue', {
            storage_key: attachment.storage_key!,
            bytes: attachment.bytes!,
            reason: 'purge',
          }),
        );
        await tx.execute(s('UPDATE dbo.storage_quota SET stored_bytes=10 WHERE id=1'));
        await tx.execute(s('DELETE FROM dbo.attachments WHERE task_id=1'));
        await tx.execute(s('DELETE FROM dbo.board_positions WHERE task_id IN (1,2)'));
        await tx.execute(
          s(
            'UPDATE dbo.tasks SET predecessor_task_id=NULL,successor_task_id=NULL WHERE id IN (1,2)',
          ),
        );
        await tx.execute(s('DELETE FROM dbo.tasks WHERE id IN (1,2)'));
        await tx.execute(insert('tasks', { project_id: 1, title: 'งานใหม่', creator_id: 1 }));
      });
      assert.deepEqual(
        await rows(db, s('SELECT source_task_id,generated_task_id FROM dbo.recurrence_events')),
        [{ source_task_id: 1, generated_task_id: 2 }],
      );
      assert((await rows(db, s('SELECT id FROM dbo.tasks'))).every((r) => Number(r.id) > 2));
      assert.equal((await rows(db, s('SELECT bytes FROM dbo.file_cleanup_queue')))[0]?.bytes, 10);
      assert.equal(
        (await rows(db, s('SELECT stored_bytes FROM dbo.storage_quota')))[0]?.stored_bytes,
        10,
      );
      await reject(db, insert('recurrence_events', { source_task_id: 1, generated_task_id: 99 }));
      await reject(db, insert('recurrence_events', { source_task_id: 99, generated_task_id: 2 }));
    },
  );
  run(
    'Quota, reservations, cleanup, idempotency, sessions and maintenance survive reopen',
    async (db, fixture) => {
      const reservation = randomUUID(),
        storage = randomUUID();
      await db.transaction(async (tx) => {
        await tx.execute(
          s('UPDATE dbo.storage_quota SET stored_bytes=50,reserved_bytes=100 WHERE id=1'),
        );
        await tx.execute(
          insert('upload_reservations', {
            id: reservation,
            user_id: 1,
            task_id: 1,
            reserved_bytes: 100,
            temp_key: randomUUID(),
            created_at: time,
            expires_at: later,
          }),
        );
        await tx.execute(
          insert('file_cleanup_queue', {
            storage_key: storage,
            bytes: 50,
            reason: 'retry',
            attempts: 2,
            next_attempt_at: later,
          }),
        );
        await tx.execute(
          insert('idempotency_keys', {
            user_id: 1,
            route: 'POST /api/tasks',
            key: randomUUID(),
            request_hash: hash,
            response_status: 201,
            response_body: '{"item":{"id":1}}',
            created_at: time,
            expires_at: later,
          }),
        );
        await tx.execute(insert('user_view_revisions', { user_id: 1, revision: randomUUID() }));
        await tx.execute(
          insert('sessions', {
            token_hash: hash,
            user_id: 1,
            csrf_token: 'synthetic-csrf-not-a-live-token',
            auth_version: 1,
            created_at: time,
            last_seen_at: time,
            absolute_expires_at: later,
          }),
        );
        await tx.execute(
          insert('maintenance_state', {
            id: 1,
            owner_id: randomUUID(),
            state: 'frozen',
            created_at: time,
            updated_at: time,
            lease_expires_at: later,
          }),
        );
        await tx.execute(
          insert('rate_limit_buckets', {
            kind: 'login_ip',
            bucket_hash: hash,
            window_started_at: time,
            window_expires_at: later,
            attempts: 3,
          }),
        );
      });
      db = await fixture.reopen();
      assert.deepEqual(
        await rows(db, s('SELECT stored_bytes,reserved_bytes FROM dbo.storage_quota')),
        [{ stored_bytes: 50, reserved_bytes: 100 }],
      );
      for (const table of [
        'upload_reservations',
        'file_cleanup_queue',
        'idempotency_keys',
        'user_view_revisions',
        'sessions',
        'maintenance_state',
        'rate_limit_buckets',
      ])
        assert.equal((await rows(db, s(`SELECT * FROM dbo.${table}`))).length, 1, table);
      await reject(db, s('UPDATE dbo.storage_quota SET stored_bytes=-1 WHERE id=1'));
      await reject(db, s('UPDATE dbo.storage_quota SET stored_bytes=9007199254740991 WHERE id=1'));
      await reject(db, s("UPDATE dbo.upload_reservations SET phase='validated'"));
      await reject(db, s('UPDATE dbo.upload_reservations SET actual_bytes=101'));
      await db.transaction((tx) =>
        tx.execute(s("UPDATE dbo.upload_reservations SET phase='validated',actual_bytes=90")),
      );
      await reject(db, s("UPDATE dbo.upload_reservations SET phase='finalizing'"));
      await db.transaction((tx) =>
        tx.execute(
          s("UPDATE dbo.upload_reservations SET phase='finalizing',storage_key=@key", {
            key: randomUUID(),
          }),
        ),
      );
      await reject(db, s('DELETE FROM dbo.tasks WHERE id=1'));
      await reject(db, s("UPDATE dbo.idempotency_keys SET response_body='invalid json'"));
      await reject(db, s("UPDATE dbo.idempotency_keys SET response_body='42'"));
      await reject(db, s('UPDATE dbo.file_cleanup_queue SET attempts=-1'));
    },
  );
  run(
    'Actual task/audit/notification writes commit atomically and roll back when an effect fails',
    async (db) => {
      const effects = (recipient: number) => [
        insert('task_events', {
          task_id: 1,
          actor_id: 1,
          action: 'updated',
          field_changes: '[{"field":"title","before":"ต้นทาง","after":"แก้แล้ว"}]',
          request_id: randomUUID(),
        }),
        insert('notifications', {
          recipient_id: recipient,
          task_id: 1,
          type: 'status',
          message: 'แจ้งทดสอบ',
          dedupe_key: randomUUID(),
        }),
      ];
      const mutation = async (tx: Transaction) => {
        await tx.execute(
          s('UPDATE dbo.tasks SET title=@title,version=version+1 WHERE id=1', { title: 'แก้แล้ว' }),
        );
        return 1;
      };
      await mutateWithEffects(db, mutation, () => effects(2));
      await assert.rejects(
        mutateWithEffects(
          db,
          async (tx) => {
            await tx.execute(
              s("UPDATE dbo.tasks SET title='ไม่ควรบันทึก',version=version+1 WHERE id=1"),
            );
            return 2;
          },
          () => effects(999),
        ),
      );
      assert.deepEqual(await rows(db, s('SELECT title,version FROM dbo.tasks WHERE id=1')), [
        { title: 'แก้แล้ว', version: 2 },
      ]);
      for (const table of ['task_events', 'notifications'])
        assert.equal((await rows(db, s(`SELECT id FROM dbo.${table}`))).length, 1);
      await reject(
        db,
        insert('task_events', {
          task_id: 1,
          actor_id: 1,
          action: 'updated',
          field_changes: '{}',
          request_id: randomUUID(),
        }),
      );
    },
  );
  run(
    'Fresh/repeat/legacy upgrade preserve data; changed, missing and partial-failure migrations are rejected atomically',
    async (db) => {
      const root = mkdtempSync(join(tmpdir(), 'friday-schema-upgrade-'));
      const dir = join(root, db.provider);
      mkdirSync(dir);
      const baseline = readFileSync(`migrations/${db.provider}/0000_foundation.sql`, 'utf8');
      const business = readFileSync(`migrations/${db.provider}/0001_business_schema.sql`, 'utf8');
      try {
        writeFileSync(join(dir, '0000_foundation.sql'), baseline);
        assert.deepEqual(await migrate(db, root), ['0000_foundation.sql']);
        await db.transaction(async (tx) => {
          await tx.execute(
            s(
              `CREATE TABLE dbo.legacy_fixture (id INT NOT NULL PRIMARY KEY, label ${db.provider === 'postgres' ? 'TEXT' : 'NVARCHAR(100)'} NOT NULL)`,
            ),
          );
          await tx.execute(
            s('INSERT INTO dbo.legacy_fixture (id,label) VALUES (1,@label)', {
              label: 'ข้อมูลไทยก่อนอัปเกรด',
            }),
          );
        });
        writeFileSync(join(dir, '0001_business_schema.sql'), business);
        assert.deepEqual(await migrate(db, root), ['0001_business_schema.sql']);
        writeFileSync(
          join(dir, '0002_review_status.sql'),
          readFileSync(`migrations/${db.provider}/0002_review_status.sql`, 'utf8'),
        );
        assert.deepEqual(await migrate(db, root), ['0002_review_status.sql']);
        await db.transaction(seed);
        assert.deepEqual(await migrate(db, root), []);
        assert.deepEqual(await rows(db, s('SELECT id,label FROM dbo.legacy_fixture')), [
          { id: 1, label: 'ข้อมูลไทยก่อนอัปเกรด' },
        ]);
        writeFileSync(join(dir, '0001_business_schema.sql'), business + '\n-- changed');
        await assert.rejects(migrate(db, root), /CHECKSUM/);
        writeFileSync(join(dir, '0001_business_schema.sql'), business);
        rmSync(join(dir, '0002_review_status.sql'));
        await assert.rejects(migrate(db, root), /SOURCE_MISSING/);
        writeFileSync(
          join(dir, '0002_review_status.sql'),
          readFileSync(`migrations/${db.provider}/0002_review_status.sql`, 'utf8'),
        );
        writeFileSync(
          join(dir, '0003_partial.sql'),
          'CREATE TABLE dbo.fixture_partial (id INT NOT NULL); INSERT INTO dbo.missing_fixture VALUES(1);'.replaceAll(
            db.provider === 'sqlserver' ? '__unused__' : 'dbo.',
            '',
          ),
        );
        await assert.rejects(migrate(db, root));
        const actual = await rows(db, {
          sqlite:
            db.provider === 'postgres'
              ? "SELECT table_name AS name FROM information_schema.tables WHERE table_schema=current_schema() AND table_name='fixture_partial'"
              : "SELECT name FROM sqlite_master WHERE name='fixture_partial'",
          sqlserver:
            "SELECT name FROM sys.tables WHERE object_id=OBJECT_ID(N'dbo.fixture_partial')",
        });
        assert.deepEqual(actual, []);
        assert.equal((await rows(db, s('SELECT id FROM dbo.schema_migrations'))).length, 3);
        writeFileSync(join(dir, '0003_duplicate.sql'), 'SELECT 1;');
        await assert.rejects(migrate(db, root), /SEQUENCE_INVALID/);
      } finally {
        rmSync(root, { recursive: true, force: true });
      }
    },
    false,
  );
}
