// Maps a tcat-postgres run onto the T-004 manifest: for every TC/AT, which executed automated
// tests are candidates (by task IDs in test titles, explicit TC/AT IDs, or provider-suite
// domain), on which layers, and whether they passed. This is a coverage aid only: it never
// writes tests/execution-records.json and a candidate is not a PASS until each case's steps
// and expected results are reviewed against the mapped tests (T-004 result policy).
//
// Usage: node scripts/tcat-map.mjs reports/tcat-postgres/<build>
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, 'summary.json')))
  throw new Error('usage: tcat-map.mjs reports/tcat-postgres/<build>');
const manifest = JSON.parse(readFileSync('tests/test-manifest.json', 'utf8'));
const summary = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));

// Provider suites carry no task IDs in their titles; map them by domain (SRS/Task Register owners).
const providerTasks = {
  schema: ['T-007'],
  helpers: ['T-008'],
  setup: ['T-013'],
  sessions: ['T-014', 'T-015'],
  accounts: ['T-015', 'T-016', 'T-019', 'T-022'],
  registrations: ['T-014', 'T-016'],
  authorization: ['T-011'],
  idempotency: ['T-010'],
  workspaces: ['T-020', 'T-021', 'T-022'],
  tasks: ['T-026', 'T-027', 'T-028', 'T-029', 'T-030', 'T-039', 'T-040'],
  'task-views': ['T-031', 'T-045', 'T-046'],
  boards: ['T-034', 'T-035'],
  files: ['T-041', 'T-042', 'T-043'],
  notifications: ['T-048', 'T-049', 'T-050'],
  'center-reports': ['T-052', 'T-053', 'T-083', 'T-088'],
  'permissions-matrix': ['T-081', 'T-082'],
  retention: ['T-060'],
  regression: ['T-067'],
};
// Browser specs whose titles carry no task IDs: owner by spec file (Task Register owners).
const browserTasks = {
  'setup.spec.ts': ['T-013'],
  'project-docs.spec.ts': ['T-084'],
  'project-files.spec.ts': ['T-085'],
  'workload-overview.spec.ts': ['T-088'],
  'main-table.spec.ts': ['T-086'],
  'side-panel.spec.ts': ['T-087'],
  'motion.spec.ts': ['T-089'],
  'favorites.spec.ts': ['T-090'],
  'my-overview.spec.ts': ['T-083'],
  'permission-matrix.spec.ts': ['T-082'],
};
const pad = (n) => `T-${String(n).padStart(3, '0')}`;
function taskIds(title) {
  const ids = new Set();
  for (const m of title.matchAll(/\bT-?(\d{3})((?:\/\d{3})*)(?:[-–](\d{3}))?/g)) {
    const first = Number(m[1]);
    ids.add(pad(first));
    for (const extra of (m[2] ?? '').split('/').filter(Boolean)) ids.add(pad(Number(extra)));
    if (m[3]) for (let n = first + 1; n <= Number(m[3]); n++) ids.add(pad(n));
  }
  return ids;
}
const explicit = (title) => new Set(title.match(/\b(?:TC|AT)-\d{2,3}\b/g) ?? []);

const tests = [];
for (const layer of ['provider', 'http']) {
  const folder = join(dir, layer);
  if (!existsSync(folder)) continue;
  for (const name of readdirSync(folder).filter((f) => f.endsWith('.xml'))) {
    const file = name.replace(/\.xml$/, '').replaceAll('__', '/') + '.ts';
    const xml = readFileSync(join(folder, name), 'utf8');
    for (const m of xml.matchAll(/<testcase name="([^"]*)"[^>]*?(\/>|>([\s\S]*?)<\/testcase>)/g)) {
      const title = m[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#39;/g, "'");
      const body = m[3] ?? '';
      const status = /<failure/.test(body)
        ? 'failed'
        : /<skipped/.test(body)
          ? 'skipped'
          : 'passed';
      const domain = file.match(/^tests\/postgres\/(.+)\.test\.ts$/)?.[1];
      const ids = taskIds(title);
      if (layer === 'provider' && domain) for (const t of providerTasks[domain] ?? []) ids.add(t);
      tests.push({ layer, file, title, status, tasks: [...ids], explicit: [...explicit(title)] });
    }
  }
}
if (existsSync(join(dir, 'browser.json'))) {
  const report = JSON.parse(readFileSync(join(dir, 'browser.json'), 'utf8'));
  const walk = (suite, file) => {
    for (const spec of suite.specs ?? [])
      for (const t of spec.tests ?? []) {
        const last = t.results?.at(-1);
        const status =
          last?.status === 'passed' ? 'passed' : last?.status === 'skipped' ? 'skipped' : 'failed';
        const specFile = spec.file ?? file;
        const ids = taskIds(spec.title);
        for (const t of browserTasks[specFile] ?? []) ids.add(t);
        tests.push({
          layer: 'browser',
          file: `tests/browser/${specFile}`,
          title: spec.title,
          status,
          tasks: [...ids],
          explicit: [...explicit(spec.title)],
        });
      }
    for (const child of suite.suites ?? []) walk(child, child.file ?? file);
  };
  for (const s of report.suites ?? []) walk(s, s.file);
}

const rows = [];
for (const tc of manifest.cases) {
  const candidates = tests.filter(
    (t) =>
      t.explicit.includes(tc.id) ||
      t.explicit.some((id) => tc.acceptance.includes(id)) ||
      t.tasks.some((id) => tc.tasks.includes(id)),
  );
  const layers = new Set(candidates.map((t) => t.layer));
  const integration = layers.has('http') || layers.has('provider');
  const needsBrowser = tc.requiresBrowser;
  const infrastructure = /Operations|Performance/.test(tc.levels);
  const allPassed = candidates.length > 0 && candidates.every((t) => t.status === 'passed');
  const coverage = infrastructure
    ? 'infrastructure'
    : candidates.some((t) => t.explicit.includes(tc.id))
      ? 'explicit'
      : integration && (!needsBrowser || layers.has('browser'))
        ? 'candidate'
        : candidates.length
          ? 'partial-layer'
          : 'gap';
  rows.push({
    id: tc.id,
    title: tc.title,
    levels: tc.levels,
    requiredProfile: tc.requiredProfile,
    tasks: tc.tasks,
    coverage,
    layers: [...layers].sort(),
    allPassed,
    candidates: candidates.map((t) => `${t.layer}:${t.file} :: ${t.title}`),
  });
}
const totals = Object.fromEntries(
  ['explicit', 'candidate', 'partial-layer', 'gap', 'infrastructure'].map((k) => [
    k,
    rows.filter((r) => r.coverage === k).length,
  ]),
);
const run = {
  passed: tests.filter((t) => t.status === 'passed').length,
  failed: tests.filter((t) => t.status === 'failed').length,
  skipped: tests.filter((t) => t.status === 'skipped').length,
  byLayer: Object.fromEntries(
    ['provider', 'http', 'browser'].map((l) => [l, tests.filter((t) => t.layer === l).length]),
  ),
};
writeFileSync(
  join(dir, 'coverage.json'),
  JSON.stringify(
    { build: summary.build, sourceSha256: summary.sourceSha256, run, totals, cases: rows, tests },
    null,
    2,
  ) + '\n',
);
const md = [
  `# TC coverage — ${summary.build}`,
  '',
  `PostgreSQL ${summary.environment.db.version} · Node ${summary.environment.node} · ${summary.environment.os} ${summary.environment.osVersion} · source ${summary.sourceSha256.slice(0, 12)}${summary.dirty ? ' (dirty tree)' : ''}`,
  '',
  `Executed tests: ${run.passed} passed, ${run.failed} failed, ${run.skipped} skipped (provider ${run.byLayer.provider}, HTTP ${run.byLayer.http}, Chromium ${run.byLayer.browser}).`,
  '',
  `Coverage: explicit ${totals.explicit} · candidate ${totals.candidate} · partial-layer ${totals['partial-layer']} · gap ${totals.gap} · infrastructure ${totals.infrastructure}. None of these is a PASS record; each case still needs step/expected review.`,
  '',
  '| TC | Levels | Coverage | Layers | Candidates | All passed |',
  '|---|---|---|---|---|---|',
  ...rows.map(
    (r) =>
      `| ${r.id} | ${r.levels} | ${r.coverage} | ${r.layers.join(', ') || '—'} | ${r.candidates.length} | ${r.candidates.length ? (r.allPassed ? 'yes' : 'NO') : '—'} |`,
  ),
  '',
].join('\n');
writeFileSync(join(dir, 'coverage.md'), md);
console.log(JSON.stringify({ build: summary.build, run, totals }));
