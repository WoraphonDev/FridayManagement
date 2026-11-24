import test from 'node:test';
import assert from 'node:assert/strict';
import { contract, schemaValidator, validator } from '../../contracts/validate.mjs';

// DEL-VALIDATION reads, never widens, the locked limits. Every client-limited text
// field keeps maxLength === x-utf16MaxLength, so UTF-16 code units are binding.
const s = contract.components.schemas;
const body = (method, path) => {
  const schema = contract.paths[path][method].requestBody.content['application/json'].schema;
  return schema.$ref ? s[schema.$ref.split('/').at(-1)] : schema;
};
const fields = [
  ['CreateTask', 'title', 200],
  ['CreateTask', 'description', 10000],
  ['CreateTask', 'category', 80],
  ['PatchTask', 'title', 200],
  ['PatchTask', 'description', 10000],
  ['PatchTask', 'category', 80],
  ['CreateProject', 'name', 100],
  ['CreateProject', 'description', 2000],
  ['PatchProject', 'name', 100],
  ['PatchProject', 'description', 2000],
  ['CreateTeam', 'name', 100],
  ['CreateTeam', 'description', 1000],
  ['PatchTeam', 'name', 100],
  ['PatchTeam', 'description', 1000],
  ['CreateDoc', 'title', 200],
  ['PatchDoc', 'title', 200],
  ['CreateSubtask', 'title', 200],
  ['CreateSubtask', 'remark', 2000],
  ['PatchSubtask', 'title', 200],
  ['PatchSubtask', 'remark', 2000],
  ['PatchUser', 'display_name', 100],
  ['CreateUser', 'display_name', 100],
];
test('client-limited text fields keep their locked UTF-16 limits', () => {
  for (const [name, field, max] of fields) {
    const p = s[name].properties[field];
    assert.equal(p.maxLength, max, `${name}.${field}`);
    assert.equal(p['x-utf16MaxLength'], max, `${name}.${field}`);
  }
  for (const method of ['post', 'patch']) {
    const p = body(method, method === 'post' ? '/api/job-titles' : '/api/job-titles/{id}')
      .properties.name;
    assert.deepEqual([p.maxLength, p['x-utf16MaxLength']], [50, 50]);
  }
  for (const name of ['ContactEmail', 'ContactTelephone'])
    assert.equal(s[name].maxLength, s[name]['x-utf16MaxLength']);
});
test('server counts Thai marks, surrogate pairs and ZWJ emoji as UTF-16 units', () => {
  const title = validator({ $ref: '#/components/schemas/CreateTask' });
  const ok = (t) => title({ project_id: 1, title: t });
  assert.equal(ok('ที่'.repeat(66) + 'ab'), true); // 200 units
  assert.equal(ok('ที่'.repeat(67)), false); // 201 units, 67 graphemes
  assert.equal(ok('😀'.repeat(100)), true); // 200 units, 100 scalars
  assert.equal(ok('😀'.repeat(100) + 'a'), false);
  assert.equal(ok('👨‍👩‍👧'.repeat(25)), true); // 200 units, 25 graphemes
  assert.equal(ok('👨‍👩‍👧'.repeat(25) + 'a'), false);
  assert.equal(ok(' '), false); // nonblank pattern; padding is trimmed at the boundary
});
test('password stays a scalar policy without a UTF-16 bound', () => {
  const password = schemaValidator('Password');
  assert.equal(s.Password['x-utf16MaxLength'], undefined);
  assert.equal(password('😀'.repeat(128)), true); // 256 UTF-16 units
  assert.equal(password('😀'.repeat(129)), false);
  assert.equal(password('  abcd'), true); // spaces count; no trim
  assert.equal(password('😀'.repeat(5)), false);
});
