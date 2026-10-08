import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validator, decodeQuery, validateRequest } from '../../contracts/validate.mjs';

test('Repeated equivalent transient schemas reuse compilation without relaxing validation', () => {
  const first = validator({ type: 'string', format: 'uuid' });
  for (let i = 0; i < 1000; i++) {
    const next = validator({ type: 'string', format: 'uuid' });
    assert.equal(next, first);
    assert.equal(next(randomUUID()), true);
    assert.equal(next('not-a-uuid'), false);
  }
});

test('Validator cache evicts old schemas and preserves distinct constraints and bundle references', () => {
  const first = validator({ type: 'integer', maximum: -1 });
  for (let i = 0; i < 256; i++) {
    const check = validator({ type: 'integer', maximum: i });
    assert.equal(check(i), true);
    assert.equal(check(i + 1), false);
  }
  const again = validator({ type: 'integer', maximum: -1 });
  assert.notEqual(again, first);
  assert.equal(first(0), false);
  assert.equal(again(-1), true);
  assert.equal(validateRequest('POST', '/api/tasks', { project_id: 1, title: 'งาน' }).valid, true);
  assert.equal(
    validateRequest('POST', '/api/tasks', { project_id: '1', title: 'งาน' }).valid,
    false,
  );
  assert.deepEqual(decodeQuery('GET', '/api/tasks', new URLSearchParams('page=1&pageSize=50')), {
    page: 1,
    pageSize: 50,
  });
  assert.throws(() => decodeQuery('GET', '/api/tasks', new URLSearchParams('page=01')));
});

test('Cached validation keeps each failure diagnostic and input independent', () => {
  const input = { project_id: '1', title: 'งาน' };
  const original = structuredClone(input);
  const failed = validateRequest('POST', '/api/tasks', input);
  assert.equal(failed.valid, false);
  const evidence = structuredClone(failed.errors);
  assert.equal(validateRequest('POST', '/api/tasks', { project_id: 1, title: 'งาน' }).valid, true);
  assert.equal(validateRequest('POST', '/api/tasks', { project_id: 1 }).valid, false);
  assert.deepEqual(failed.errors, evidence);
  assert.deepEqual(input, original);
});
