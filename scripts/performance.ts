/** Isolated local SQLite rehearsal. No caller DB/path/credentials accepted or emitted. */
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir, cpus, totalmem, platform, release, arch } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { performance } from 'node:perf_hooks';
import { chromium, expect } from '@playwright/test';
import { SqliteDatabase } from '../src/repository/sqlite/database.js';
import { migrate } from '../src/repository/migrate.js';
import { sql } from '../src/repository/access-scope.js';
import { hashPassword } from '../src/security/passwords.js';
import { startApplication } from '../src/api/start.js';
import { insert } from '../tests/schema/fixtures.js';
import { startMemoryServer, type Memory } from './performance-child.js';
import { isWrite, gate } from '../tests/performance/policy.js';
if (
  process.argv[2] !== '--confirm-isolated-load' ||
  !['full', 'smoke', 'memory', 'memory-smoke'].includes(process.argv[3] ?? 'full') ||
  (process.argv[4] !== undefined && process.argv[4] !== '--followup')
)
  throw new Error('EXPLICIT_ISOLATED_LOAD_REQUIRED');
const mode = process.argv[3] ?? 'full',
  full = mode === 'full',
  memoryMode = mode.startsWith('memory'),
  rounds = full ? 600 : mode === 'memory' ? 300 : 10,
  warmup = full || mode === 'memory' ? 30 : 2;
if (memoryMode && !global.gc) throw new Error('MEMORY_DIAGNOSTIC_REQUIRES_EXPOSE_GC');
let memoryServer: Awaited<ReturnType<typeof startMemoryServer>> | undefined;
const memorySamples: {
  phase: string;
  seconds: number;
  api: Memory;
  harness: Memory;
  forcedGC: boolean;
}[] = [];
const sampleMemory = async (phase: string, seconds: number, forceGC = false) => {
  if (forceGC) {
    global.gc?.();
    await new Promise<void>((r) => setImmediate(r));
    global.gc?.();
  }
  memorySamples.push({
    phase,
    seconds,
    api: await memoryServer!.sample(forceGC),
    harness: process.memoryUsage(),
    forcedGC: forceGC,
  });
};
const root = await mkdtemp(join(tmpdir(), 'friday-performance-')),
  data = join(root, 'data'),
  path = join(data, 'fixture.sqlite');
const password = `Perf-${randomUUID()}`;
let db: SqliteDatabase | undefined,
  app: Awaited<ReturnType<typeof startApplication>> | undefined,
  browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const report: Record<string, unknown> = {
  scope: memoryMode
    ? 'Isolated compiled API vs tsx client harness memory diagnostic; not acceptance'
    : full
      ? '10minute local SQLite rehearsal, not SQL/Windows acceptance'
      : 'SMOKE ONLY; not performance acceptance',
  status: 'NOT_RUN',
  date: new Date().toISOString(),
  environment: {
    node: process.versions.node,
    sqlite: process.versions.sqlite,
    npm: '10.9.9',
    platform: platform(),
    release: release(),
    arch: arch(),
    logicalCPU: cpus().length,
    cpu: cpus()[0]?.model,
    RAM: totalmem(),
    disk: 'SSD_NOT_VERIFIED',
    provider: 'temporary SQLite',
    driver: 'node:sqlite',
  },
  thresholds: {
    readP95Ms: 2000,
    writeP95Ms: 3000,
    unexpectedErrorRate: 0.01,
    visibleUpdateMs: 10000,
  },
  nativeSqlWindows: 'NOT_RUN',
};
const reportPath = `reports/T-075-performance-${mode}${process.argv[4] === '--followup' ? '-followup' : ''}.json`;
let timer: ReturnType<typeof setInterval> | undefined,
  peakRSS = 0,
  peakHeap = 0;
const now = () => new Date().toISOString();
try {
  await mkdir(data, { mode: 0o700 });
  await mkdir(join(data, 'attachments'), { mode: 0o700 });
  db = new SqliteDatabase(path);
  await migrate(db);
  const hash = await hashPassword(password),
    stamp = now(),
    today = stamp.slice(0, 10),
    tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const eligible = Array.from({ length: 30 }, (_, i) => i + 1).filter(
    (i) => ![15, 29, 30].includes(i),
  );
  const seedStarted = performance.now();
  await db.transaction(async (tx) => {
    await tx.execute(
      insert('organizations', { id: 1, name: 'Synthetic performance organization' }),
    );
    for (let id = 1; id <= 30; id++) {
      await tx.execute(
        insert('users', {
          username: `PerfUser${id}`,
          display_name: `Synthetic user${id}`,
          password_hash: hash,
          org_role: id === 1 ? 'admin' : 'member',
          must_change_password: 0,
          created_at: stamp,
          updated_at: stamp,
        }),
      );
      await tx.execute(
        insert('user_view_revisions', { user_id: id, revision: randomUUID(), updated_at: stamp }),
      );
    }
    for (let id = 1; id <= 6; id++)
      await tx.execute(insert('teams', { name: `Synthetic team${id}` }));
    for (let id = 2; id <= 30; id++)
      await tx.execute(
        insert('team_members', {
          team_id: ((id - 2) % 6) + 1,
          user_id: id,
          team_role: id <= 7 ? 'lead' : 'member',
        }),
      );
    for (let p = 1; p <= 20; p++) {
      await tx.execute(
        insert('projects', {
          owner_team_id: ((p - 1) % 6) + 1,
          name: `Synthetic project${p}`,
          created_by: 1,
        }),
      );
      for (const status of ['todo', 'doing', 'review', 'done'])
        await tx.execute(insert('board_columns', { project_id: p, status }));
      for (let user = 2; user <= 30; user++)
        await tx.execute(
          insert('project_members', {
            project_id: p,
            user_id: user,
            access: [15, 29, 30].includes(user) ? 'viewer' : 'editor',
            added_by: 1,
          }),
        );
      for (let n = 0; n < 500; n++) {
        const id = (p - 1) * 500 + n + 1,
          status = ['todo', 'doing', 'review', 'done'][n % 4]!;
        await tx.execute(
          insert('tasks', {
            project_id: p,
            title: id === 1 ? 'Synthetic observer marker' : `Synthetic task${id}`,
            creator_id: 1,
            assignee_id: eligible[n % eligible.length]!,
            status,
            due_date: id === 1 ? today : tomorrow,
            created_at: stamp,
            updated_at: stamp,
            completed_at: status === 'done' ? stamp : null,
          }),
        );
        await tx.execute(
          insert('board_positions', {
            project_id: p,
            task_id: id,
            status,
            rank: Math.floor(n / 4) + 1,
          }),
        );
        for (let c = 0; c < 2; c++)
          await tx.execute(
            insert('comments', {
              task_id: id,
              author_id: eligible[(n + c) % eligible.length]!,
              body: 'Synthetic performance comment',
              created_at: stamp,
            }),
          );
      }
    }
    let total = 0;
    for (const task of [1, 501, 1001]) {
      const key = randomUUID(),
        bytes = Buffer.from('synthetic performance attachment');
      total += bytes.length;
      await writeFile(join(data, 'attachments', key), bytes, { mode: 0o600 });
      await tx.execute(
        insert('attachments', {
          task_id: task,
          uploader_id: 1,
          original_name: 'synthetic.txt',
          storage_key: key,
          bytes: bytes.length,
          validated_type: 'text/plain',
          sha256: createHash('sha256').update(bytes).digest('hex'),
        }),
      );
    }
    await tx.execute(
      sql('UPDATE dbo.storage_quota SET stored_bytes=@bytes WHERE id=1', { bytes: total }),
    );
  });
  const counts = await db.transaction(async (tx) => {
    const out: Record<string, number> = {};
    for (const table of ['users', 'teams', 'projects', 'tasks', 'comments', 'attachments'])
      out[table] = Number((await tx.query(sql(`SELECT COUNT(*) AS n FROM dbo.${table}`)))[0]!.n);
    return out;
  });
  assert.deepEqual(counts, {
    users: 30,
    teams: 6,
    projects: 20,
    tasks: 10000,
    comments: 20000,
    attachments: 3,
  });
  report.seed = { counts, elapsedMs: performance.now() - seedStarted };
  await db.close();
  db = undefined;
  const probe = createServer();
  await new Promise<void>((r) => probe.listen(0, '127.0.0.1', r));
  const address = probe.address();
  assert(address && typeof address === 'object');
  const port = address.port;
  await new Promise<void>((r) => probe.close(() => r()));
  const origin = `http://127.0.0.1:${port}`,
    env = {
      NODE_ENV: 'test',
      DB_PROVIDER: 'sqlite',
      DATA_DIR: data,
      LOG_DIR: join(root, 'logs'),
      SQLITE_DB_PATH: path,
      HOST: '127.0.0.1',
      PORT: String(port),
      APP_ORIGIN: origin,
    };
  const cold = performance.now();
  if (memoryMode) memoryServer = await startMemoryServer(env);
  else app = await startApplication(env);
  assert.equal((await fetch(origin + '/health/ready')).status, 200);
  report.coldStartupMs = performance.now() - cold;
  const clients: { cookie: string; csrf: string; version: number; task: number }[] = [];
  for (let i = 0; i < 15; i++) {
    const response = await fetch(origin + '/api/login', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: `PerfUser${i + 1}`, password }),
    });
    assert.equal(response.status, 200);
    const self = await response.json();
    clients.push({
      cookie: response.headers.get('set-cookie')!.split(';')[0]!,
      csrf: self.csrf,
      version: 1,
      task: 121 + i * 4,
    });
  }
  const request = (actor: number, path: string, method = 'GET', body?: unknown) => {
    const c = clients[actor]!;
    return fetch(origin + path, {
      method,
      signal: AbortSignal.timeout(15000),
      headers: {
        Cookie: c.cookie,
        ...(method === 'GET'
          ? {}
          : {
              Origin: origin,
              'Content-Type': 'application/json',
              'X-CSRF-Token': c.csrf,
              'Idempotency-Key': randomUUID(),
            }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  timer = setInterval(() => {
    const m = process.memoryUsage();
    peakRSS = Math.max(peakRSS, m.rss);
    peakHeap = Math.max(peakHeap, m.heapUsed);
  }, 100);
  // Separate CSV transfer/memory phase; not mixed into primary70/30 request samples.
  peakRSS = process.memoryUsage().rss;
  peakHeap = process.memoryUsage().heapUsed;
  const csvStart = performance.now(),
    csv = await request(0, '/api/export/tasks.csv');
  assert.equal(csv.status, 200);
  let csvBytes = 0;
  for await (const chunk of csv.body!) csvBytes += chunk.byteLength;
  report.csv = {
    elapsedMs: performance.now() - csvStart,
    bytes: csvBytes,
    rows: 10000,
    peakProcessRSS: peakRSS,
  };
  const board = await (await request(0, '/api/projects/1/board')).json(),
    column = board.columns.find((c: { status: string }) => c.status === 'todo');
  const moves = await Promise.all(
    [1, 2].map((actor) =>
      request(actor, '/api/projects/1/board/move', 'POST', {
        task_id: actor === 1 ? 5 : 9,
        task_version: 1,
        from_status: 'todo',
        to_status: 'todo',
        source_column_version: column.version,
        target_column_version: column.version,
        before_task_id: 1,
      }),
    ),
  );
  const moveStatuses = moves.map((r) => r.status).sort();
  await Promise.all(moves.map((r) => r.arrayBuffer()));
  assert.deepEqual(moveStatuses, [200, 409]);
  const after = await (await request(0, '/api/projects/1/board')).json();
  assert.equal(after.total, 500);
  assert.equal(new Set(after.tasks.map((t: { id: number }) => t.id)).size, 500);
  report.boardConcurrency = {
    statuses: moveStatuses,
    expectedConflict: 1,
    totalTasks: 500,
    noDuplicateTaskIDs: true,
  };
  const read: number[] = [],
    write: number[] = [],
    statuses: Record<string, number> = {},
    errors: Record<string, number> = {};
  let unexpected = 0;
  const pause = (ms: number) => new Promise<void>((r) => setTimeout(r, Math.max(0, ms)));
  const runRound = async (round: number, measured: boolean) =>
    Promise.all(
      clients.map(async (c, actor) => {
        const writable = isWrite(round, actor),
          started = performance.now();
        let status = 0;
        try {
          const paths = [
            `/api/tasks?project=1&pageSize=50&page=${(round % 10) + 1}`,
            `/api/tasks/${c.task}`,
            '/api/notifications',
            '/api/projects/1/board',
            '/api/reports/summary?project=1',
            '/api/me',
            '/api/tasks?project=1&q=Synthetic',
          ];
          const comment = round % 2 === 0;
          const response = await request(
            actor,
            writable
              ? comment
                ? `/api/tasks/${c.task}/comments`
                : `/api/tasks/${c.task}`
              : paths[(round + actor) % paths.length]!,
            writable ? (comment ? 'POST' : 'PATCH') : 'GET',
            writable
              ? comment
                ? { body: 'Synthetic measured load comment' }
                : { version: c.version, priority: round % 4 === 1 ? 'high' : 'medium' }
              : undefined,
          );
          status = response.status;
          const value = await response.json();
          if (writable && !comment && status === 200) c.version = value.item.version;
        } catch {
          status = 0;
        }
        if (measured) {
          (writable ? write : read).push(performance.now() - started);
          statuses[String(status)] = (statuses[String(status)] ?? 0) + 1;
          if (status !== (writable ? (round % 2 === 0 ? 201 : 200) : 200)) {
            unexpected++;
            errors[String(status)] = (errors[String(status)] ?? 0) + 1;
          }
        }
      }),
    );
  const warmStart = performance.now();
  for (let r = 0; r < warmup; r++) {
    await runRound(r, false);
    await pause(warmStart + (r + 1) * 1000 - performance.now());
  }
  report.warmupSeconds = warmup;
  if (memoryMode) await sampleMemory('post-warmup-baseline', 0, true);
  let page: import('@playwright/test').Page | undefined;
  let editor: import('@playwright/test').Locator | undefined;
  if (!memoryMode) {
    // Visible Viewer uses its existing cookie/session. Browser polling is ancillary and separately reported.
    browser = await chromium.launch();
    report.browser = browser.version();
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: 'friday_session',
        value: clients[14]!.cookie.split('=')[1]!,
        url: origin,
        httpOnly: true,
        sameSite: 'Strict',
      },
    ]);
    page = await context.newPage();
    await page.goto(origin + '/projects');
    await page
      .getByRole('row')
      .filter({ has: page.getByText('Synthetic project1', { exact: true }) })
      .getByRole('button', { name: 'งาน', exact: true })
      .click();
    const jobs = page.getByRole('dialog', { name: /งานในโปรเจกต์/ });
    await jobs.getByLabel('ค้นหางาน', { exact: true }).fill('Synthetic observer marker');
    await jobs.getByRole('button', { name: 'ค้นหา', exact: true }).click();
    await jobs.getByRole('button', { name: 'เปิดงาน #1', exact: true }).click();
    editor = page.getByRole('dialog', { name: /รายละเอียดงาน #1/ });
    await expect(editor.getByLabel('ชื่องาน', { exact: true })).toHaveValue(
      'Synthetic observer marker',
    );
  }
  const start = performance.now();
  const measurement = (async () => {
    for (let r = 0; r < rounds; r++) {
      await runRound(r, true);
      if (memoryMode && r % 30 === 29) await sampleMemory('load', r + 1);
      if (r % 30 === 29)
        console.log(
          JSON.stringify({
            event: 'performance_progress',
            seconds: r + 1,
            requests: read.length + write.length,
            unexpected,
            ...(memoryMode
              ? {
                  apiMemory: memorySamples.at(-1)!.api,
                  harnessMemory: memorySamples.at(-1)!.harness,
                }
              : {}),
          }),
        );
      await pause(start + (r + 1) * 1000 - performance.now());
    }
  })();
  let visibleUpdateMs: number | undefined;
  if (!memoryMode) {
    const observerName = `Synthetic observer ${randomUUID()}`,
      observeStart = performance.now();
    const update = await request(0, '/api/tasks/1', 'PATCH', { version: 1, title: observerName });
    assert.equal(update.status, 200);
    await update.arrayBuffer();
    await expect(editor!.getByLabel('ชื่องาน', { exact: true })).toHaveValue(observerName, {
      timeout: 10000,
    });
    visibleUpdateMs = performance.now() - observeStart;
    assert.equal(await page!.evaluate(() => document.visibilityState), 'visible');
  }
  await measurement;
  const elapsedMs = performance.now() - start;
  if (memoryMode) {
    await sampleMemory('post-load-gc', rounds, true);
    await pause(mode === 'memory' ? 30000 : 1000);
    await sampleMemory('idle-gc', rounds + (mode === 'memory' ? 30 : 1), true);
    report.isolatedMemory = {
      samples: memorySamples,
      scope:
        'API is compiled JS in separate process; harness is tsx + clients + seed; no browser; GC only baseline/post-load/idle outside measured requests; no universal memory acceptance threshold',
      durationSeconds: rounds,
    };
  }
  const metrics = gate(read, write, unexpected, read.length + write.length);
  report.measurement = {
    rounds,
    elapsedMs,
    requests: read.length + write.length,
    readRequests: read.length,
    writeRequests: write.length,
    ratio: [
      read.length / (read.length + write.length),
      write.length / (read.length + write.length),
    ],
    ...metrics,
    statuses,
    errors,
    excludedDeliberateErrors: 0,
    fileTransferRequests: 0,
    visibleUpdateMs,
    visibleSamples: memoryMode ? 0 : 1,
    ancillary: 'CSV/board conflict/login/browser polling/observer PATCH separate from main sample',
    activeSessions: 15,
    roles: { admin: 1, lead: 6, editor: 7, viewer: 1 },
  };
  report.memory = {
    peakRSS,
    peakHeap,
    scope: memoryMode
      ? 'Client harness/tsx/seed process only; API separately sampled in isolatedMemory; no browser'
      : 'whole harness+API+SQLite process; includes clients/runtime; seed transient peak and browser process excluded; not production process-only',
  };
  report.status =
    metrics.pass && (memoryMode || visibleUpdateMs! <= 10000)
      ? memoryMode
        ? 'MEASURED_DIAGNOSTIC'
        : full
          ? 'PASS_LOCAL_SUBSET'
          : 'PASS_SMOKE'
      : 'FAIL';
  if (report.status === 'FAIL') process.exitCode = 1;
  console.log(
    JSON.stringify({
      event: 'performance_complete',
      status: report.status,
      requests: read.length + write.length,
      ...metrics,
      visibleUpdateMs,
    }),
  );
} catch {
  report.status = 'FAIL';
  report.failure = 'ISOLATED_PERFORMANCE_CHECK_FAILED';
  process.exitCode = 1;
  console.error('ISOLATED_PERFORMANCE_CHECK_FAILED');
} finally {
  clearInterval(timer);
  try {
    await browser?.close();
  } finally {
    try {
      await memoryServer?.stop();
      await app?.stop();
    } finally {
      try {
        await db?.close();
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  }
  await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
}
