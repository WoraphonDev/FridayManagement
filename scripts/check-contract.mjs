import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildContract } from './build-contract.mjs';
import { contract, schemaValidator, validator } from '../contracts/validate.mjs';

export function checkContract() {
  assert.deepEqual(contract, buildContract(), 'Generated contract is stale; run npm run build:contract');
  const inventory = (text) => new Set([...text.matchAll(/^\| ((?:GET|POST|PATCH|PUT|DELETE) \/[^|]+?) \|/gm)].map((m) => m[1]));
  const srs = inventory(readFileSync('TeamFlow_SRS_v1.0.md', 'utf8'));
  const tasksText = readFileSync('TeamFlow_Task_v1.0.md', 'utf8');
  const taskInventory = inventory(tasksText);
  const taskIds = new Set([...tasksText.matchAll(/^\| (T-\d{3}) \|/gm)].map((m) => m[1]));
  const operations = new Set();
  const operationIds = new Set();
  for (const [path, methods] of Object.entries(contract.paths)) for (const [method, op] of Object.entries(methods)) {
    operations.add(`${method.toUpperCase()} ${path}`);
    assert(!operationIds.has(op.operationId), `Duplicate operationId: ${op.operationId}`);
    operationIds.add(op.operationId);
    assert(op['x-owner-tasks']?.length, `Missing owner: ${method} ${path}`);
    assert(op['x-owner-tasks'].every((id) => taskIds.has(id)), `Unknown owner: ${method} ${path}`);
    assert(op['x-permission'] && op['x-idempotency'] && op['x-business-rules'], `Missing policy: ${method} ${path}`);
    validator(op['x-query-schema']);
    const names = new Set();
    for (const param of op.parameters) {
      assert(!names.has(`${param.in}:${param.name}`), 'Duplicate parameter');
      names.add(`${param.in}:${param.name}`);
      validator(param.schema);
    }
    for (const match of path.matchAll(/\{([^}]+)\}/g)) assert(op.parameters.some((p) => p.in === 'path' && p.name === match[1] && p.required), 'Missing path parameter');
    if (method !== 'get') {
      assert(op.parameters.some((p) => p.in === 'header' && p.name === 'Origin' && p.required), 'Missing Origin');
      if (op.security.length) assert(op.parameters.some((p) => p.name === 'X-CSRF-Token' && p.required), 'Missing CSRF');
      if (op['x-idempotency'] === 'required') assert(op.parameters.some((p) => p.name === 'Idempotency-Key' && p.required), 'Missing key');
    }
    for (const media of Object.values(op.requestBody?.content ?? {})) validator(media.schema);
    assert(op.responses.default.content['application/json'].schema.$ref.endsWith('/Error'), 'Missing error response');
    assert(Object.keys(op.responses).some((status) => /^2\d\d$/.test(status)), 'Missing success status');
    for (const [status, response] of Object.entries(op.responses)) {
      if (status === '204') assert(!response.content, '204 must not include a body');
      assert(response.headers['Cache-Control'].schema.const === 'no-store', 'Missing no-store policy');
      assert(response.headers['X-Request-Id'].required, 'Missing requestId response header');
      for (const header of Object.values(response.headers ?? {})) validator(header.schema);
      for (const media of Object.values(response.content ?? {})) validator(media.schema);
    }
  }
  assert.deepEqual(operations, srs, 'SRS route coverage mismatch');
  assert.deepEqual(operations, taskInventory, 'Task route coverage mismatch');
  assert.equal(operations.size, 85);
  for (const name of Object.keys(contract.components.schemas)) assert(schemaValidator(name), `Uncompiled schema: ${name}`);
  return { routes: operations.size, schemas: Object.keys(contract.components.schemas).length, result: 'PASS' };
}

if (process.argv[1]?.endsWith('/check-contract.mjs')) console.log(JSON.stringify(checkContract()));
