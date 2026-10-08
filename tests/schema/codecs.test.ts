import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validDate,
  validUtcTimestamp,
  normalizeSqlRow,
} from '../../src/repository/value-codecs.js';
test('Date codecs reject impossible days, year zero, timezone offsets and non-millisecond timestamps', () => {
  for (const value of ['0001-01-01', '9999-12-31', '2000-02-29']) assert(validDate(value));
  for (const value of ['0000-01-01', '2023-02-29', '2024-02-30', '2024-2-01', '2024-13-01'])
    assert(!validDate(value));
  assert(validUtcTimestamp('0001-01-01T00:00:00.000Z'));
  assert(validUtcTimestamp('9999-12-31T23:59:59.999Z'));
  for (const value of [
    '2026-10-06T00:00:00Z',
    '2026-10-06T07:00:00.000+07:00',
    '2026-02-30T00:00:00.000Z',
  ])
    assert(!validUtcTimestamp(value));
});
test('SQL row boundary converts DATE/DATETIME2/BIT and fails closed on unsafe or unsupported driver values', () => {
  assert.deepEqual(
    normalizeSqlRow(
      {
        due: new Date('2024-02-29T00:00:00Z'),
        updated: new Date('2026-10-06T00:00:00.001Z'),
        active: true,
        missing: null,
        bytes: 5368709120,
      },
      new Set(['due']),
    ),
    {
      due: '2024-02-29',
      updated: '2026-10-06T00:00:00.001Z',
      active: 1,
      missing: null,
      bytes: 5368709120,
    },
  );
  for (const value of [
    Number.MAX_SAFE_INTEGER + 1,
    Infinity,
    1.1,
    Buffer.from('bytes'),
    {},
    new Date(NaN),
  ])
    assert.throws(() => normalizeSqlRow({ value }, new Set()));
});
