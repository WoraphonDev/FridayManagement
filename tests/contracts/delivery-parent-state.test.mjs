import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const contract = JSON.parse(readFileSync('contracts/openapi.json', 'utf8'));
test('parent capabilities are required booleans in API 1.17, without new routes or raw parent state', () => {
  assert.equal(contract.info.version, '1.17.0');
  assert.equal(
    Object.values(contract.paths).flatMap((p) =>
      Object.keys(p).filter((k) => ['get', 'post', 'put', 'patch', 'delete'].includes(k)),
    ).length,
    89,
  );
  for (const [schema, field] of [
    [contract.components.schemas.Project, 'can_unarchive'],
    [contract.components.schemas.TrashPage.properties.items.items, 'can_restore'],
  ]) {
    assert.deepEqual(schema.properties[field], { type: 'boolean' });
    assert(schema.required.includes(field));
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.owner_team_archived_at, undefined);
    assert.equal(schema.properties.team_archived_at, undefined);
  }
  assert.equal(contract.components.schemas.Task.properties.can_restore, undefined);
});
