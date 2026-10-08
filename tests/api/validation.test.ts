import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseSchema, requestBody, operations, type Schema } from '../../src/api/contract.js';
import { sqliteFixture, statement } from '../schema/fixtures.js';
const schemas = (
  JSON.parse(readFileSync('contracts/openapi.json', 'utf8')) as {
    components: { schemas: Record<string, Schema> };
  }
).components.schemas;
test('Runtime Zod boundary retains locked scalar-password/UTF16/date/DTO rules without defaults or stripping', () => {
  parseSchema(schemas.Password!, '😀'.repeat(128));
  assert.throws(() => parseSchema(schemas.Password!, '😀'.repeat(129)));
  const op = operations.find((o) => o.method === 'POST' && o.path === '/api/tasks')!.operation;
  const input = { project_id: 1, title: '😀'.repeat(100) };
  assert.deepEqual(requestBody(op, input), input);
  assert.throws(() => requestBody(op, { ...input, title: '😀'.repeat(101) }));
  assert.throws(() => requestBody(op, { ...input, auth_version: 2 }));
  parseSchema(schemas.Date!, '2028-02-29');
  assert.throws(() => parseSchema(schemas.Date!, '2027-02-29'));
  parseSchema(schemas.Timestamp!, '2026-10-06T00:00:00.000Z');
  assert.throws(() => parseSchema(schemas.Timestamp!, '2026-10-06T07:00:00.000+07:00'));
  const person = { id: 1, display_name: 'fixture', active: true };
  parseSchema(schemas.Person!, person);
  for (const secret of [
    'password',
    'password_hash',
    'auth_version',
    'token_hash',
    'storage_key',
    'file_path',
  ])
    assert.throws(() => parseSchema(schemas.Person!, { ...person, [secret]: 'fixture' }));
});
test('Provider query parameters treat SQL-shaped text as data and cannot expand row scope', async () => {
  const f = await sqliteFixture();
  try {
    const literal = "' OR 1=1; DROP TABLE users; --";
    await f.db.transaction(async (tx) => {
      await tx.execute(
        statement('UPDATE dbo.tasks SET title=@title WHERE id=@id', { title: literal, id: 1 }),
      );
      const rows = await tx.query(
        statement('SELECT id,title FROM dbo.tasks WHERE title=@title', { title: literal }),
      );
      assert.deepEqual(rows, [{ id: 1, title: literal }]);
      assert.equal((await tx.query(statement('SELECT id FROM dbo.users'))).length, 2);
      assert.equal((await tx.query(statement('SELECT id FROM dbo.tasks'))).length, 2);
    });
  } finally {
    await f.close();
  }
});
