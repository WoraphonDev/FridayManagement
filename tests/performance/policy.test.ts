import test from 'node:test';
import assert from 'node:assert/strict';
import { percentile, isWrite, gate } from './policy.js';
test('nearest-rank p95 and strict1percent errors/performance cutoffs', () => {
  assert.equal(
    percentile(
      Array.from({ length: 100 }, (_, i) => i + 1),
      0.95,
    ),
    95,
  );
  assert.equal(gate([2000], [3000], 0, 100).pass, true);
  assert.equal(gate([2000], [3000], 1, 100).pass, false);
  assert.equal(gate([2001], [1], 0, 100).pass, false);
  assert.throws(() => percentile([], 0.95));
  assert.throws(() => percentile([NaN], 0.95));
});
test('150 request cycle is70/30 with15 mixed-role actors and read-only Viewer', () => {
  let writes = 0;
  for (let round = 0; round < 10; round++)
    for (let actor = 0; actor < 15; actor++) {
      writes += Number(isWrite(round, actor));
      if (actor === 14) assert.equal(isWrite(round, actor), false);
    }
  assert.equal(writes, 45);
  assert.throws(() => isWrite(0, 15));
});
