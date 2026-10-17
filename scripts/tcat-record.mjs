// Writes T-004 execution records for reviewed TC cases from one clean tcat-postgres run.
// A case is recorded PASS only when tests/tcat-review.json marks it "covered" AND every test
// of that run passed (any failure in the run blocks all records, so nothing is masked).
// AT/RV/UAT/REL items are never written here: AT needs an explicit owner sign-off.
//
// Usage: node scripts/tcat-record.mjs reports/tcat-postgres/<build>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { chromium } from '@playwright/test';

const dir = process.argv[2];
if (!dir) throw new Error('usage: tcat-record.mjs reports/tcat-postgres/<build>');
const summary = JSON.parse(readFileSync(join(dir, 'summary.json'), 'utf8'));
const coverage = JSON.parse(readFileSync(join(dir, 'coverage.json'), 'utf8'));
const review = JSON.parse(readFileSync('tests/tcat-review.json', 'utf8'));
const manifest = JSON.parse(readFileSync('tests/test-manifest.json', 'utf8'));
if (summary.dirty)
  throw new Error('Run was made from a dirty tree; records need a committed source identity');
if (coverage.run.failed > 0)
  throw new Error(`Run has ${coverage.run.failed} failed test(s); no records written`);

const sha = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');
const evidence = ['summary.json', 'coverage.json'].map((f) => ({
  path: join(dir, f),
  sha256: sha(join(dir, f)),
}));
evidence.push({ path: 'tests/tcat-review.json', sha256: sha('tests/tcat-review.json') });
const browser = await chromium.launch();
const browserVersion = browser.version();
await browser.close();
const schemaVersion = readdirSync('migrations/postgres')
  .sort()
  .at(-1)
  .replace(/\.sql$/, '');

const records = [];
for (const tc of manifest.cases) {
  const r = review.cases[tc.id];
  if (r?.verdict !== 'covered') continue;
  records.push({
    id: tc.id,
    profile: tc.requiredProfile === 'pure-node22' ? 'pure-node22' : 'postgres17',
    status: 'PASS',
    build: summary.build,
    sourceSha256: summary.sourceSha256,
    schemaVersion,
    tester: review.reviewer,
    role: 'developer (automated suite + per-case step review)',
    date: summary.date,
    environment: {
      node: summary.environment.node,
      os: summary.environment.os,
      osVersion: summary.environment.osVersion,
      db: tc.requiredProfile === 'pure-node22' ? { provider: 'none' } : summary.environment.db,
      browser: { name: 'Chromium (Playwright headless)', version: browserVersion },
    },
    actual: `All steps/expected results asserted by passing automated tests on this build: ${r.evidence.join(' | ')}${r.notes ? ` | Note: ${r.notes}` : ''}`,
    evidence,
  });
}
for (const v of manifest.variants) {
  const r = review.variants?.[v.id];
  if (r?.verdict !== 'covered') continue;
  records.push({
    id: v.id,
    profile: 'postgres17',
    status: 'PASS',
    build: summary.build,
    sourceSha256: summary.sourceSha256,
    schemaVersion,
    tester: review.reviewer,
    role: 'developer (automated fault harness + variant step review)',
    date: summary.date,
    environment: {
      node: summary.environment.node,
      os: summary.environment.os,
      osVersion: summary.environment.osVersion,
      db: summary.environment.db,
    },
    actual: `Variant setup/steps/expected executed by passing tests on this build: ${r.evidence.join(' | ')}${r.notes ? ` | Note: ${r.notes}` : ''}`,
    evidence,
  });
}
const store = JSON.parse(readFileSync('tests/execution-records.json', 'utf8'));
// Replace earlier records for this build; keep records of other builds untouched.
store.records = [...store.records.filter((x) => x.build !== summary.build), ...records];
store.note = `TC and RV records from PostgreSQL run ${summary.build} after per-item review (tests/tcat-review.json). Remaining items are NOT_RUN: AT needs owner sign-off; unreviewed variants, operations, performance, browser matrix, UAT and release reviews were not executed.`;
writeFileSync('tests/execution-records.json', JSON.stringify(store, null, 2) + '\n');
console.log(JSON.stringify({ build: summary.build, records: records.length }));
