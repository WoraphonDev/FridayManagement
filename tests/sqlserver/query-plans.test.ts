// Q-T-007-1 (owner chose A, 2026-10-10): SQL Server 2022 plans for the six main read paths on
// the SRS §13.3 dataset may scan a large table only where reviewed below; reads meet the p95 budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import sql from 'mssql';
import { mkdirSync, writeFileSync } from 'node:fs';
import { sqlFixture, insert } from '../schema/fixtures.js';
import { accessFixture, proof, now } from '../authorization/fixtures.js';
import { taskService } from '../../src/services/tasks.js';
import { reportService } from '../../src/services/reports.js';
import { notificationCenter } from '../../src/services/notification-center.js';
import { workspaceService } from '../../src/services/workspaces.js';
import type { Database, Statement, Transaction } from '../../src/domain/database.js';

const skip =
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL Server integration not configured; SQLite cannot close SQL acceptance';
const raw = (sql: string): Statement => ({ sqlite: '', sqlserver: sql });
// Tables that hold §13.3 volume; a full scan of these is what the plan check rejects.
const large = ['tasks', 'board_positions', 'comments', 'notifications', 'task_assignees'];
// Reviewed scans (2026-10-10, 10,000 tasks): any scan of a large table not listed here fails.
const accepted: Record<string, Record<string, string>> = {
  'project task list + filter': {
    'Clustered Index Scan tasks.pk_tasks':
      'ORDER BY id + 20-row page: row-goal ordered PK read, stops early',
  },
  'My work': {
    'Clustered Index Scan tasks.pk_tasks':
      'assignee spans every visible project; row-goal page and count',
  },
  notifications: {
    'Clustered Index Scan notifications.pk_notifications':
      'scope join to visible projects; 5,000 rows',
    'Index Scan tasks.ix_tasks_project_id_status_deleted_at':
      'narrow covering index for the scope join',
  },
  'Kanban board': {
    'Clustered Index Scan tasks.pk_tasks':
      'one bulk load of the whole project (≤500 rows): a single scan is cheaper than 500 lookups',
    'Clustered Index Scan task_assignees.pk_task_assignees':
      'one IN-list lookup for ≤500 cards; optimizer prefers a scan while the table is small',
  },
  'report summary': {
    'Clustered Index Scan tasks.pk_tasks': 'aggregates every visible task by design',
  },
};
// SRS §13.3 read budget (p95 ≤ 2 s) for every path.
const readBudgetMs = 2000;

/** Set-based §13.3 volume on top of the access fixture (20 projects, 10,000 tasks, 20,000 comments). */
async function seed(db: Database) {
  await db.transaction(async (tx) => {
    for (let p = 3; p <= 20; p++)
      await tx.execute(
        insert('projects', { owner_team_id: (p % 2) + 1, name: `Plan project${p}`, created_by: 1 }),
      );
    await tx.execute(
      raw(`INSERT INTO dbo.board_columns(project_id,status)
        SELECT p.id,s.status FROM dbo.projects p CROSS JOIN (VALUES(N'todo'),(N'doing'),(N'review'),(N'done')) s(status)
        WHERE NOT EXISTS (SELECT 1 FROM dbo.board_columns c WHERE c.project_id=p.id AND c.status=s.status)`),
    );
    await tx.execute(
      raw(`INSERT INTO dbo.project_members(project_id,user_id,access,added_by)
        SELECT p.id,u.id,CASE WHEN u.id IN (5,8) THEN N'viewer' ELSE N'editor' END,1
        FROM dbo.projects p CROSS JOIN dbo.users u
        WHERE u.id BETWEEN 4 AND 9 AND NOT EXISTS (SELECT 1 FROM dbo.project_members m WHERE m.project_id=p.id AND m.user_id=u.id)`),
    );
    const existing = Number((await tx.query(raw('SELECT COUNT(*) AS n FROM dbo.tasks')))[0]!.n);
    await tx.execute(
      raw(`WITH n AS (SELECT TOP (${10000 - existing}) ROW_NUMBER() OVER (ORDER BY (SELECT NULL)) AS i
            FROM sys.all_objects a CROSS JOIN sys.all_objects b)
        INSERT INTO dbo.tasks(project_id,title,creator_id,assignee_id,status,due_date,completed_at)
        SELECT (i % 20) + 1, CONCAT(N'Plan task ', i), 1, (i % 6) + 4,
          CASE i % 4 WHEN 0 THEN N'todo' WHEN 1 THEN N'doing' WHEN 2 THEN N'review' ELSE N'done' END,
          DATEADD(day, i % 60, CAST('2026-10-01' AS date)),
          CASE WHEN i % 4 = 3 THEN SYSUTCDATETIME() END
        FROM n`),
    );
    await tx.execute(
      // Board ranks must be contiguous from 1 per column, so rebuild every position.
      raw(`DELETE FROM dbo.board_positions;
        INSERT INTO dbo.board_positions(task_id,project_id,status,rank)
        SELECT t.id,t.project_id,t.status,
          ROW_NUMBER() OVER (PARTITION BY t.project_id,t.status ORDER BY t.id)
        FROM dbo.tasks t WHERE t.deleted_at IS NULL`),
    );
    await tx.execute(
      raw(`INSERT INTO dbo.task_assignees(task_id,user_id)
        SELECT t.id,t.assignee_id FROM dbo.tasks t
        WHERE t.assignee_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM dbo.task_assignees a WHERE a.task_id=t.id AND a.user_id=t.assignee_id)`),
    );
    await tx.execute(
      raw(`INSERT INTO dbo.comments(task_id,author_id,body)
        SELECT t.id,(c.k % 6) + 4,N'Plan comment' FROM dbo.tasks t CROSS JOIN (VALUES(0),(1)) c(k)`),
    );
    await tx.execute(
      raw(`INSERT INTO dbo.notifications(recipient_id,task_id,type,message,dedupe_key)
        SELECT (t.id % 6) + 4,t.id,N'comment',N'Plan notification',CONCAT(N'plan-',t.id)
        FROM dbo.tasks t WHERE t.id % 2 = 0`),
    );
  });
}

/** Records every statement a service issues, then asks SQL Server for its estimated plan. */
function recording(db: Database) {
  const statements: Statement[] = [];
  const wrap = (tx: Transaction): Transaction => ({
    execute: (s) => tx.execute(s),
    query: (s) => {
      statements.push(s);
      return tx.query(s);
    },
  });
  return {
    statements,
    db: { ...db, transaction: (work) => db.transaction((tx) => work(wrap(tx))) } as Database,
  };
}
/** Inline parameters as literals so the plan reflects the actual values (as sniffing would). */
function literalBatch(s: Statement, schema: string) {
  let text = s.sqlserver.replaceAll('dbo.', `${schema}.`);
  const names = Object.keys(s.parameters ?? {}).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const v = s.parameters![name];
    const literal =
      v === null || v === undefined
        ? 'NULL'
        : typeof v === 'number'
          ? String(v)
          : `N'${String(v).replaceAll("'", "''")}'`;
    text = text.replace(new RegExp(`@${name}(?![A-Za-z0-9_])`, 'g'), literal);
  }
  return text;
}
/** SHOWPLAN_XML returns plans only for plain batches (not sp_executesql), so use a raw connection. */
async function plans(schema: string, statements: Statement[]) {
  const pool = await new sql.ConnectionPool({
    server: process.env.DB_SERVER!,
    port: Number(process.env.DB_PORT ?? 1433),
    database: process.env.DB_NAME!,
    user: process.env.DB_USER!,
    password: process.env.DB_PASSWORD!,
    options: {
      encrypt: process.env.DB_ENCRYPT !== 'false',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    },
  }).connect();
  const out: { sql: string; scans: string[] }[] = [];
  try {
    for (const s of statements) {
      const tx = new sql.Transaction(pool);
      await tx.begin();
      let xml = '';
      try {
        await new sql.Request(tx).batch('SET SHOWPLAN_XML ON');
        const result = await new sql.Request(tx).batch(literalBatch(s, schema));
        xml = (result.recordsets as unknown as Record<string, unknown>[][])
          .flat()
          .map((r) => String(Object.values(r)[0]))
          .join('');
        await new sql.Request(tx).batch('SET SHOWPLAN_XML OFF');
      } finally {
        await tx.rollback();
      }
      assert.match(xml, /<ShowPlanXML/, 'SHOWPLAN_XML returned no plan');
      const scans = [
        ...xml.matchAll(
          /<RelOp [^>]*PhysicalOp="(Table Scan|Clustered Index Scan|Index Scan)"[\s\S]*?<Object [^>]*Table="\[([^\]]+)\]"(?: [^>]*Index="\[([^\]]+)\]")?/g,
        ),
      ]
        .filter((m) => large.includes(m[2]!))
        .map((m) => `${m[1]} ${m[2]}${m[3] ? '.' + m[3] : ''}`);
      out.push({ sql: s.sqlserver.slice(0, 160), scans });
    }
  } finally {
    await pool.close();
  }
  return out;
}

test(
  'SQL2022 Q-T-007-1: main read path plans match reviewed scans and reads meet the §13.3 budget',
  { skip, timeout: 600000 },
  async () => {
    const f = await accessFixture(sqlFixture);
    try {
      await seed(f.db);
      const clock = () => new Date(now);
      const tasks = taskService({ clock }),
        reports = reportService(f.db, { clock }),
        center = notificationCenter({ clock }),
        workspaces = workspaceService({ clock });
      const paths: [string, (tx: Transaction) => Promise<unknown>][] = [
        [
          'project task list + filter',
          (tx) =>
            tasks.list(tx, proof(4), { project: 7, status: ['doing'], page: 1, pageSize: 20 }),
        ],
        ['My work', (tx) => tasks.list(tx, proof(4), { assignee: 4, page: 1, pageSize: 20 })],
        ['Kanban board', (tx) => tasks.board(tx, proof(4), 7)],
        ['notifications', (tx) => center.page(tx, proof(4), { page: 1 })],
        ['report summary', (tx) => reports.summary(tx, proof(4), {})],
        ['directory search', (tx) => workspaces.directory(tx, proof(3), { q: 'fixture' })],
      ];
      const schema = String(
        (
          await f.db.transaction((tx) =>
            tx.query(raw("SELECT OBJECT_SCHEMA_NAME(OBJECT_ID(N'dbo.tasks')) AS s")),
          )
        )[0]!.s,
      );
      // Control: a predicate no index can serve must be reported, proving the detector works.
      const control = await plans(schema, [
        raw("SELECT id FROM dbo.comments WHERE body LIKE N'%control%'"),
      ]);
      assert.equal(control[0]!.scans.length, 1, 'control scan not detected');
      const report: Record<string, { ms: number[]; scans: string[]; statements: number }> = {};
      for (const [name, run] of paths) {
        const r = recording(f.db);
        await r.db.transaction(run);
        const ms: number[] = [];
        for (let i = 0; i < 10; i++) {
          const started = performance.now();
          await f.db.transaction(run);
          ms.push(performance.now() - started);
        }
        const found = await plans(schema, r.statements);
        assert(found.length > 0, `${name} issued no statements`);
        report[name] = {
          ms,
          statements: found.length,
          scans: found.flatMap((p) => p.scans.map((s) => `${s} :: ${p.sql}`)),
        };
      }
      const evidence: Record<string, unknown> = {};
      for (const [name, r] of Object.entries(report)) {
        const kinds = [...new Set(r.scans.map((x) => x.split(' :: ')[0]!))];
        const unexpected = kinds.filter((k) => !accepted[name]?.[k]);
        const p95 = [...r.ms].sort((a, b) => a - b)[Math.ceil(r.ms.length * 0.95) - 1]!;
        evidence[name] = { statements: r.statements, p95Ms: Math.round(p95), scans: kinds };
        assert.deepEqual(unexpected, [], `${name}: unreviewed scan of a large table`);
        assert(p95 <= readBudgetMs, `${name}: p95 ${p95.toFixed(0)} ms over budget`);
      }
      mkdirSync('reports/T-007', { recursive: true });
      writeFileSync(
        'reports/T-007/query-plans.json',
        JSON.stringify(
          {
            date: new Date().toISOString().slice(0, 10),
            provider: 'SQL Server 2022 (test DB)',
            dataset: '20 projects, 10,000 tasks, 20,000 comments, 5,000 notifications',
            runsPerPath: 10,
            accepted,
            note: 'Kanban N+1 removed 2026-10-10: batched task DTOs (was 3,011 statements, p95 ~1.96 s)',
            paths: evidence,
          },
          null,
          1,
        ) + '\n',
      );
    } finally {
      await f.close();
    }
  },
);
