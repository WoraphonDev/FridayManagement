import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalJson, requestHash } from '../../src/repository/idempotency.js';
test('canonical JSON sorts recursively, preserves array order and null/omitted distinctions', () => {
  assert.equal(
    canonicalJson({ z: [{ b: 2, a: 1 }], a: 'fixture' }),
    '{"a":"fixture","z":[{"a":1,"b":2}]}',
  );
  assert.equal(requestHash({ b: 2, a: 1 }), requestHash({ a: 1, b: 2 }));
  assert.notEqual(requestHash([1, 2]), requestHash([2, 1]));
  assert.notEqual(requestHash({ a: null }), requestHash({}));
  for (const value of [
    undefined,
    NaN,
    Infinity,
    Buffer.from('fixture'),
    new Date(),
    { a: undefined },
  ])
    assert.throws(() => requestHash(value));
});
