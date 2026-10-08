import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDays,
  bangkokToday,
  bangkokInterval,
  daysBetween,
  nextOccurrence,
  monthlyAnchor,
  retentionWindow,
  utcNow,
} from '../../src/domain/dates.js';
test('Server Bangkok midnight and inclusive date ranges produce UTC half-open intervals', () => {
  assert.equal(bangkokToday('2026-10-05T16:59:59.999Z'), '2026-10-05');
  assert.equal(bangkokToday('2026-10-05T17:00:00.000Z'), '2026-10-06');
  assert.deepEqual(bangkokInterval('2024-02-29', '2024-03-01'), {
    start: '2024-02-28T17:00:00.000Z',
    endExclusive: '2024-03-01T17:00:00.000Z',
  });
  assert.equal(
    utcNow(() => new Date('2026-10-06T00:00:00.000Z')),
    '2026-10-06T00:00:00.000Z',
  );
  assert.throws(() => bangkokInterval('2024-03-01', '2024-02-29'));
  assert.throws(() => bangkokToday('2026-10-06T07:00:00.000+07:00'));
});
test('Calendar math handles leap centuries, year bounds and rejects invalid dates', () => {
  assert.equal(addDays('2000-02-28', 1), '2000-02-29');
  assert.equal(addDays('1900-02-28', 1), '1900-03-01');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2);
  for (const value of ['2023-02-29', '2024-02-30', '0000-01-01', '2024-2-01'])
    assert.throws(() => addDays(value, 1));
  assert.throws(() => addDays('9999-12-31', 1));
  assert.throws(() => addDays('0001-01-01', -1));
});
for (const [year, feb] of [
  [2027, 28],
  [2028, 29],
  [1900, 28],
  [2000, 29],
])
  test(`Monthly anchor31 remains31 after February ${year}`, () => {
    const next = nextOccurrence(`${year}-01-31`, `${year}-01-28`, 'monthly', 31);
    assert.equal(next.due_date, `${year}-02-${feb}`);
    assert.equal(daysBetween(next.start_date!, next.due_date), 3);
    assert.equal(
      nextOccurrence(next.due_date, next.start_date, 'monthly', 31).due_date,
      `${year}-03-31`,
    );
  });
test('Recurrence anchor edits/null start/daily/weekly follow baseline without catch-up', () => {
  assert.equal(monthlyAnchor('monthly', 'monthly', '2027-02-28', '2027-02-28', 31), 31);
  assert.equal(monthlyAnchor('monthly', 'monthly', '2027-02-27', '2027-02-28', 31), 27);
  assert.equal(monthlyAnchor('daily', 'monthly', '2027-02-28', '2027-02-28', null), 28);
  assert.equal(monthlyAnchor('monthly', 'none', null, '2027-02-28', 31), null);
  assert.equal(monthlyAnchor('monthly', 'weekly', '2027-02-28', '2027-02-28', 31), null);
  assert.deepEqual(nextOccurrence('2020-01-01', null, 'daily', null), {
    due_date: '2020-01-02',
    start_date: null,
    recurrence_anchor_day: null,
  });
  assert.equal(nextOccurrence('2024-02-25', null, 'weekly', null).due_date, '2024-03-03');
  assert.throws(() => monthlyAnchor('none', 'monthly', null, null, null));
  assert.throws(() => nextOccurrence('2024-01-01', '2024-01-02', 'monthly', 31));
  assert.throws(() => nextOccurrence('2024-01-01', null, 'monthly', 0));
});
test('Restore/purge comparator is shared: cutoff-1ms, cutoff and cutoff+1ms', () => {
  const deleted = '2026-01-31T17:00:00.000Z';
  assert.deepEqual(retentionWindow(deleted, '2026-03-02T16:59:59.999Z'), {
    cutoff: '2026-03-02T17:00:00.000Z',
    restorable: true,
    purgeable: false,
  });
  for (const now of ['2026-03-02T17:00:00.000Z', '2026-03-02T17:00:00.001Z'])
    assert.deepEqual(retentionWindow(deleted, now), {
      cutoff: '2026-03-02T17:00:00.000Z',
      restorable: false,
      purgeable: true,
    });
});
