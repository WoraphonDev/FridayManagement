import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Database, Transaction, Statement, Row, Value } from '../../src/domain/database.js';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { openDatabase } from '../../src/repository/open.js';
import { migrate } from '../../src/repository/migrate.js';

export const tables = [
  'organizations',
  'users',
  'sessions',
  'teams',
  'team_members',
  'projects',
  'project_members',
  'tasks',
  'task_assignees',
  'project_groups',
  'subtasks',
  'board_columns',
  'board_positions',
  'comments',
  'attachments',
  'task_events',
  'admin_events',
  'notifications',
  'recurrence_events',
  'idempotency_keys',
  'user_view_revisions',
  'storage_quota',
  'upload_reservations',
  'file_cleanup_queue',
  'maintenance_state',
  'rate_limit_buckets',
  'job_titles',
  'user_permissions',
  'project_docs',
  'project_doc_versions',
  'project_files',
  'user_favorites',
  'user_preferences',
];
export const hash = 'a'.repeat(64);
export const time = '2026-10-06T00:00:00.000Z';
export const later = '2026-10-06T01:00:00.000Z';
export function statement(query: string, parameters: Record<string, Value> = {}): Statement {
  return {
    sqlite: query.replaceAll('dbo.', '').replace(/@([A-Za-z][A-Za-z0-9_]*)/g, '$$$1'),
    sqlserver: query,
    parameters,
  };
}
export function insert(table: string, values: Record<string, Value>): Statement {
  if (!tables.includes(table)) throw new Error('FIXTURE_TABLE_NOT_ALLOWED');
  const columns = Object.keys(values);
  if (columns.some((c) => !/^\w+$/.test(c))) throw new Error('FIXTURE_COLUMN_NOT_ALLOWED');
  return statement(
    `INSERT INTO dbo.[${table}] (${columns.map((c) => `[${c}]`).join(',')}) VALUES (${columns.map((_, i) => `@p${i}`).join(',')})`,
    Object.fromEntries(Object.values(values).map((v, i) => [`p${i}`, v])),
  );
}
export async function seed(tx: Transaction, reviewStatus = 'review') {
  await tx.execute(insert('organizations', { id: 1, name: 'องค์กรทดสอบ' }));
  for (const username of ['Admin', 'Member'])
    await tx.execute(
      insert('users', {
        username,
        display_name: 'ผู้ทดสอบ',
        password_hash: 'fixture-only-not-authenticatable',
        org_role: username === 'Admin' ? 'admin' : 'member',
      }),
    );
  for (const name of ['ทีม A', 'ทีม B']) await tx.execute(insert('teams', { name }));
  for (const team of [1, 2]) {
    await tx.execute(
      insert('projects', { owner_team_id: team, name: `โครงการ ${team}`, created_by: 1 }),
    );
    for (const status of ['todo', 'doing', reviewStatus, 'done'])
      await tx.execute(insert('board_columns', { project_id: team, status }));
  }
  for (const title of ['ต้นทาง', 'ปลายทาง'])
    await tx.execute(insert('tasks', { project_id: 1, title, creator_id: 1 }));
  for (const task of [1, 2])
    await tx.execute(
      insert('board_positions', { task_id: task, project_id: 1, status: 'todo', rank: task }),
    );
}
export interface Fixture {
  db: Database;
  reopen: () => Promise<Database>;
  close: () => Promise<void>;
}
export async function sqliteFixture(initial = true): Promise<Fixture> {
  const dir = mkdtempSync(join(tmpdir(), 'friday-schema-'));
  const path = join(dir, 'fixture.sqlite');
  let db: Database = new SqliteDatabase(path);
  try {
    if (initial) {
      await migrate(db);
      await db.transaction(seed);
    }
  } catch (error) {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
  return {
    db,
    reopen: async () => {
      await db.close();
      db = new SqliteDatabase(path);
      return db;
    },
    close: async () => {
      await db.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
export async function sqlFixture(initial = true): Promise<Fixture> {
  if (
    process.env.RUN_SQLSERVER_TESTS !== '1' ||
    process.env.NODE_ENV !== 'test' ||
    process.env.DB_PROVIDER !== 'sqlserver' ||
    !/_test$/.test(process.env.DB_NAME ?? '')
  )
    throw new Error('ISOLATED_SQL_TEST_REQUIRED');
  const schema = `friday_t007_${randomUUID().replaceAll('-', '')}`;
  let base = await openDatabase('sqlserver');
  const adapt = (connection: Database): Database => ({
    provider: 'sqlserver',
    transaction: (work) =>
      connection.transaction((tx) =>
        work({
          execute: (s) =>
            tx.execute({ ...s, sqlserver: s.sqlserver.replaceAll('dbo.', `${schema}.`) }),
          query: async <R extends Row>(s: Statement) =>
            tx.query<R>({ ...s, sqlserver: s.sqlserver.replaceAll('dbo.', `${schema}.`) }),
        }),
      ),
    close: () => connection.close(),
  });
  const db = adapt(base);
  let created = false;
  const close = async () => {
    try {
      if (!created) return;
      await base.transaction(async (tx) => {
        // Drop only our randomized schema's foreign keys/tables, never caller's dbo data.
        await tx.execute(
          statement(
            `DECLARE @sql NVARCHAR(MAX)=N''; SELECT @sql+=N'ALTER TABLE '+QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id))+N'.'+QUOTENAME(OBJECT_NAME(parent_object_id))+N' DROP CONSTRAINT '+QUOTENAME(name)+N';' FROM sys.foreign_keys WHERE SCHEMA_NAME(schema_id)=N'${schema}'; EXEC sys.sp_executesql @sql;`,
          ),
        );
        await tx.execute(
          statement(
            `DECLARE @sql NVARCHAR(MAX)=N''; SELECT @sql+=N'DROP TABLE '+QUOTENAME(SCHEMA_NAME(schema_id))+N'.'+QUOTENAME(name)+N';' FROM sys.tables WHERE SCHEMA_NAME(schema_id)=N'${schema}'; EXEC sys.sp_executesql @sql; DROP SCHEMA [${schema}];`,
          ),
        );
      });
    } finally {
      await base.close();
    }
  };
  try {
    await base.transaction(async (tx) => {
      const rows = await tx.query<{ version: string }>(
        statement("SELECT CONVERT(NVARCHAR(128),SERVERPROPERTY('ProductVersion')) AS version"),
      );
      if (!rows[0]?.version.startsWith('16.')) throw new Error('SQL2022_REQUIRED');
      await tx.execute(statement(`CREATE SCHEMA [${schema}]`));
    });
    created = true;
    if (initial) {
      await migrate(db);
      await db.transaction(seed);
    }
  } catch (error) {
    await close();
    throw error;
  }
  return {
    db,
    reopen: async () => {
      await base.close();
      base = await openDatabase('sqlserver');
      return adapt(base);
    },
    close,
  };
}
