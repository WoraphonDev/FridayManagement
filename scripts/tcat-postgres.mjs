// ADR-0001 TC/AT evidence run on PostgreSQL 17: provider suites, HTTP integration and the full
// Chromium suite, all against isolated *_test databases. Writes machine results and an
// environment/identity summary under reports/tcat-postgres/<build>/. It never writes
// tests/execution-records.json; scripts/tcat-record.mjs does that from these results + the map.
//
// Usage (fresh, disposable PostgreSQL 17; credentials only via env, never stored):
//   RUN_POSTGRES_TESTS=1 NODE_ENV=test FRIDAY_FIXTURE_PROVIDER=postgres DB_PROVIDER=postgres \
//   DB_SERVER=127.0.0.1 DB_PORT=55432 DB_NAME=friday_test DB_USER=... DB_PASSWORD=... \
//   node scripts/tcat-postgres.mjs [--layers provider,http,browser]
import { spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { platform, release } from 'node:os';

const env = process.env;
if (
  env.RUN_POSTGRES_TESTS !== '1' ||
  env.NODE_ENV !== 'test' ||
  env.DB_PROVIDER !== 'postgres' ||
  env.FRIDAY_FIXTURE_PROVIDER !== 'postgres' ||
  !/_test$/.test(env.DB_NAME ?? '')
)
  throw new Error('ISOLATED_POSTGRES_TEST_REQUIRED');
const require = createRequire(import.meta.url);
const layers = (
  process.argv.find((a) => a.startsWith('--layers='))?.slice(9) ?? 'provider,http,browser'
).split(',');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain', '--untracked-files=no').length > 0;
// Source identity: tracked paths + blob ids of the working tree (stable for a clean checkout).
const sourceSha256 = createHash('sha256').update(git('ls-files', '-s')).digest('hex');
const build = `pg17-${head.slice(0, 10)}${dirty ? '-dirty' : ''}`;
const out = join('reports', 'tcat-postgres', build);
mkdirSync(out, { recursive: true });

const pg = require('pg');
const admin = new pg.Pool({
  host: env.DB_SERVER,
  port: Number(env.DB_PORT ?? 5432),
  database: env.DB_NAME,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  max: 1,
});
const version = (await admin.query('SHOW server_version')).rows[0].server_version;
if (!/^17\./.test(version)) throw new Error(`PostgreSQL 17 required, got ${version}`);

const run = (name, command, args, extraEnv = {}) => {
  const started = new Date().toISOString();
  const r = spawnSync(command, args, {
    env: { ...env, ...extraEnv },
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  writeFileSync(join(out, `${name}.log`), (r.stdout ?? '') + (r.stderr ?? ''));
  return { name, started, finished: new Date().toISOString(), exitCode: r.status };
};
const results = [];
const files = (pattern) =>
  execFileSync('sh', ['-c', `ls ${pattern}`], { encoding: 'utf8' })
    .trim()
    .split('\n');
// One junit file per test file so every result keeps its source file (the junit reporter omits it).
const nodeLayer = (layer, list) => {
  mkdirSync(join(out, layer), { recursive: true });
  for (const file of list) {
    const base = file.replaceAll('/', '__').replace(/\.ts$/, '');
    results.push(
      run(`${layer}/${base}`, 'node', [
        '--import',
        'tsx',
        '--test',
        '--test-concurrency=1',
        '--test-reporter=junit',
        `--test-reporter-destination=${join(out, layer, base + '.xml')}`,
        file,
      ]),
    );
  }
};
if (layers.includes('provider')) nodeLayer('provider', files('tests/postgres/*.test.ts'));
if (layers.includes('http'))
  nodeLayer(
    'http',
    files(
      'tests/*/http.test.ts tests/accounts/registration-http.test.ts tests/notifications/center-http.test.ts',
    ),
  );
if (layers.includes('browser')) {
  results.push(run('build', 'npm', ['run', '-s', 'build']));
  results.push(
    run('browser', 'npx', ['playwright', 'test', '--reporter=json'], {
      PLAYWRIGHT_JSON_OUTPUT_NAME: join(out, 'browser.json'),
    }),
  );
}

// Disposable per-fixture databases created by tests/setup/fixtures.ts.
const fixtures = (
  await admin.query(
    "SELECT datname FROM pg_database WHERE datname LIKE 'friday\\_fx\\_%\\_test' OR datname LIKE 'friday\\_tpl\\_%\\_test'",
  )
).rows;
for (const { datname } of fixtures)
  await admin.query(`DROP DATABASE IF EXISTS "${datname}" WITH (FORCE)`);
await admin.end();

const browserVersion = (() => {
  try {
    const { chromium } = require('@playwright/test');
    return (
      chromium.name() + ' (Playwright ' + require('@playwright/test/package.json').version + ')'
    );
  } catch {
    return 'unknown';
  }
})();
const summary = {
  build,
  head,
  dirty,
  sourceSha256,
  date: new Date().toISOString(),
  environment: {
    node: process.versions.node,
    os: platform() === 'darwin' ? 'macos' : platform(),
    osVersion: release(),
    db: {
      provider: 'postgres17',
      product: 'PostgreSQL',
      version,
      driver: `pg ${require('pg/package.json').version}`,
    },
    browser: { name: 'Chromium', version: browserVersion },
  },
  layers: results,
  droppedFixtureDatabases: fixtures.length,
  browserJson: existsSync(join(out, 'browser.json')),
};
writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify({ build, out, layers: results.map((r) => `${r.name}:${r.exitCode}`) }));
if (dirty)
  console.warn(
    'WARNING: working tree has uncommitted tracked changes; records from this build are not release evidence.',
  );
