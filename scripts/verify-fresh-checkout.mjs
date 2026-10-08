import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createServer } from 'node:net';
import assert from 'node:assert/strict';
import './check-runtime.mjs';

const npmCli = process.env.npm_execpath;
assert(npmCli, 'Run through npm run verify:checkout');
const root = process.cwd(),
  workspace = mkdtempSync(join(tmpdir(), 'friday-checkout-'));
const source = join(workspace, 'source'),
  data = join(workspace, 'data');
mkdirSync(source);
mkdirSync(data);
let archiveEvidence;
const archivePath = process.env.FRIDAY_SOURCE_ARCHIVE;
if (archivePath) {
  try {
    archiveEvidence = JSON.parse(
      execFileSync(
        'python3',
        [join(root, 'scripts/source-archive.py'), 'extract', archivePath, source],
        { encoding: 'utf8', timeout: 30000 },
      ),
    );
  } catch (error) {
    rmSync(workspace, { recursive: true, force: true });
    throw error;
  }
} else {
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean);
  for (const file of files) {
    if (/(^|\/)\.env(?:$|\.)/.test(file) && file !== '.env.example') continue;
    if (/^(node_modules|dist|uploads|logs|\.git)\//.test(file)) continue;
    const destination = join(source, file);
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(file, destination);
  }
}
const environment = {
  ...process.env,
  NODE_ENV: 'test',
  DB_PROVIDER: 'sqlite',
  DATA_DIR: data,
  LOG_DIR: join(workspace, 'logs'),
  SQLITE_DB_PATH: join(data, 'fixture.sqlite'),
};
const run = (args, env = environment) =>
  execFileSync(process.execPath, [npmCli, ...args], {
    cwd: source,
    env,
    encoding: 'utf8',
    timeout: 180000,
  });
const result = {
  scope: archivePath
    ? 'Verified candidate ZIP fresh extraction runtime/config/schema checks; readiness remains503'
    : 'Fresh source copy runtime/config/schema checks; readiness remains503',
  archive: archiveEvidence ?? null,
  ci: 'NOT_RUN',
  typecheck: 'NOT_RUN',
  build: 'NOT_RUN',
  tests: 'NOT_RUN',
  migrate: 'NOT_RUN',
  seed: 'NOT_RUN',
  start: 'NOT_RUN',
  windowsSqlServer: 'NOT_RUN',
  production: 'NOT_READY',
};
let server;
try {
  const cache = process.env.FRIDAY_NPM_CACHE ?? process.env.npm_config_cache;
  run([
    'ci',
    '--ignore-scripts',
    '--offline',
    '--no-audit',
    '--no-fund',
    ...(cache ? ['--cache', cache] : []),
  ]);
  result.ci = 'PASS';
  run(['run', 'typecheck']);
  result.typecheck = 'PASS';
  run(['run', 'build']);
  result.build = 'PASS';
  const output = run(['test']);
  const totals = [...output.matchAll(/# tests (\d+)[\s\S]*?# pass (\d+)[\s\S]*?# fail (\d+)/g)];
  const expectedNodeSuites =
    JSON.parse(readFileSync(join(source, 'package.json'), 'utf8')).scripts.test.split('&&').length -
    1;
  const frontend = output.match(/Tests\s+(\d+)\s+passed/);
  assert.equal(totals.length, expectedNodeSuites);
  assert(totals.every((m) => m[1] === m[2] && m[3] === '0'));
  assert(frontend);
  result.tests = `PASS: ${totals.reduce((sum, m) => sum + Number(m[1]), Number(frontend[1]))} tests (all npm test suites)`;
  const first = run(['run', 'migrate:sqlite']);
  assert(first.includes('0000_foundation.sql'));
  assert(first.includes('0001_business_schema.sql'));
  assert(first.includes('0002_review_status.sql'));
  const second = run(['run', 'migrate:sqlite']);
  assert(second.includes('"applied":[]'));
  result.migrate = 'PASS: foundation + business + review correction apply once, repeat no-op';
  run(['run', 'sample-data:sqlite', '--', '--confirm-local-fixture']);
  result.seed = 'PASS: explicit synthetic fixture only';
  run([
    'ci',
    '--omit=dev',
    '--ignore-scripts',
    '--offline',
    '--no-audit',
    '--no-fund',
    ...(cache ? ['--cache', cache] : []),
  ]);
  result.runtimeInstall = 'PASS: omit-dev dependencies for built server';
  const cliHelp = execFileSync(process.execPath, ['dist/server/cli/main.js', '--help'], {
    cwd: source,
    env: environment,
    encoding: 'utf8',
    timeout: 5000,
  });
  assert(cliHelp.includes('recover-admin') && cliHelp.includes('force-logout'));
  result.installerCli =
    'PASS: compiled help loads with omit-dev runtime dependencies; mutation/hidden terminal checks in test:admin-cli';
  const probe = createServer();
  await new Promise((resolve) => probe.listen(0, '127.0.0.1', resolve));
  const address = probe.address();
  assert(address && typeof address === 'object');
  const port = address.port;
  await new Promise((resolve) => probe.close(resolve));
  server = spawn(process.execPath, ['dist/server/api/main.js'], {
    cwd: source,
    env: { ...environment, PORT: String(port), APP_ORIGIN: `http://127.0.0.1:${port}` },
    stdio: 'ignore',
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/live`, {
        signal: AbortSignal.timeout(500),
      });
      if (response.status === 200) {
        ready = true;
        break;
      }
    } catch {
      /* bounded startup polling */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert(ready, 'Fresh built server did not start');
  const html = await (await fetch(`http://127.0.0.1:${port}/`)).text();
  assert(html.includes('id="root"'));
  assert.equal((await fetch(`http://127.0.0.1:${port}/health/ready`)).status, 503);
  const meta = await fetch(`http://127.0.0.1:${port}/api/meta`);
  assert.equal(meta.status, 200);
  const metadata = await meta.json();
  assert.equal(metadata.setupRequired, true);
  assert.deepEqual(Object.keys(metadata).sort(), ['setupRequired', 'version']);
  assert.equal((await fetch(`http://127.0.0.1:${port}/api/me`)).status, 401);
  const rejectedLogin = await fetch(`http://127.0.0.1:${port}/api/login`, {
    method: 'POST',
    headers: { Origin: `http://127.0.0.1:${port}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'NonexistentFixture',
      password: 'synthetic-fixture-password',
    }),
  });
  assert.equal(rejectedLogin.status, 401);
  assert.equal((await rejectedLogin.json()).error.code, 'INVALID_CREDENTIALS');
  assert.equal(rejectedLogin.headers.get('set-cookie'), null);
  result.start =
    'PASS: built HTML/live200/ready503/meta200 setupRequired true/me401/generic login401 (omit-dev runtime)';
  const report = process.env.FRIDAY_CHECKOUT_REPORT ?? 'reports/fresh-checkout-latest.json';
  assert(
    report === 'reports/fresh-checkout-latest.json' ||
      /^reports\/T-\d{3}-[a-z-]+\.json$/.test(report),
  );
  writeFileSync(join(root, report), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
  rmSync(workspace, { recursive: true, force: true });
}
