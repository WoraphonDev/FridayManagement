import test from 'node:test';
import assert from 'node:assert/strict';
import { mondayOf, weekIndexes } from '../../src/domain/workload.js';
// T-088 UT-23: Monday-start Bangkok weeks; start-only/due-only/no date/cross-week ranges.
test('mondayOf handles week edges, month/year and leap boundaries', () => {
  assert.equal(mondayOf('2026-10-05'), '2026-10-05');
  assert.equal(mondayOf('2026-10-11'), '2026-10-05');
  assert.equal(mondayOf('2026-10-12'), '2026-10-12');
  assert.equal(mondayOf('2027-01-01'), '2026-12-28');
  assert.equal(mondayOf('2028-03-01'), '2028-02-28');
  assert.equal(mondayOf('2020-01-01'), '2019-12-30');
});
test('weekIndexes counts every overlapped week and single-date tasks once', () => {
  const weeks = ['2026-10-05', '2026-10-12', '2026-10-19'];
  const at = (start: string | null, due: string | null) =>
    weekIndexes({ start_date: start, due_date: due }, weeks);
  assert.deepEqual(at(null, '2026-10-11'), [0]);
  assert.deepEqual(at('2026-10-12', null), [1]);
  assert.deepEqual(at('2026-10-11', '2026-10-12'), [0, 1]);
  assert.deepEqual(at('2026-10-01', '2026-10-30'), [0, 1, 2]);
  assert.deepEqual(at('2026-09-01', '2026-10-04'), []);
  assert.deepEqual(at('2026-10-26', '2026-10-27'), []);
  assert.equal(at(null, null), null);
});
