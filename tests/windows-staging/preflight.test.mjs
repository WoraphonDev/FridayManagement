import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
for (const entry of ['preflight.mjs', 'staging-entry.mjs']) test(`${entry} fails safely without an external environment file`, () => {
  const result = spawnSync(process.execPath, [`scripts/windows/${entry}`], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /STAGING_PREFLIGHT_FAILED/);
  assert.doesNotMatch(result.stderr, /Error:|at file:/);
});
