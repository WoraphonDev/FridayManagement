import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { checkContract } from '../../scripts/check-contract.mjs';
import { contract, validator, schemaValidator, validateRequest, decodeQuery, operation } from '../../contracts/validate.mjs';

const task = { project_id: 12, title: 'เตรียมรายงาน', recurrence: 'weekly', start_date: '2026-10-05', due_date: '2026-10-09' };
const move = { task_id: 101, task_version: 3, from_status: 'todo', to_status: 'doing', source_column_version: 5, target_column_version: 8, before_task_id: 203 };
const validTask = (body) => validateRequest('POST', '/api/tasks', body).valid;

test('T-003 route/owner/schema/policy inventory matches SRS and Task Register', () => assert.equal(checkContract().result, 'PASS'));
test('TC-052 group-order EventChange accepts persisted anchors while rejecting unknown fields', () => {
  const validate = schemaValidator('EventChange');
  for (const after of [12, null]) assert(validate({ field: 'group_before_task_id', before: null, after }));
  assert.equal(validate({ field: 'unknown_history_field', before: null, after: 12 }), false);
});
test('SRS create-task JSON example validates without altering it', () => {
  const srs = readFileSync('TeamFlow_SRS_v1.0.md', 'utf8');
  const example = JSON.parse(srs.split('### 12.3 Example create task')[1].match(/```json\n([\s\S]+?)\n```/)[1]);
  const original = structuredClone(example);
  assert(validTask(example)); assert.deepEqual(example, original);
});
test('unassigned/no-date task accepts omission or explicit null', () => {
  assert(validTask({ project_id: 1, title: 'งานใหม่' }));
  assert(validTask({ project_id: 1, title: 'งานใหม่', assignee_id: null, due_date: null, start_date: null }));
});
for (const [label, body] of Object.entries({
  'blank title': { ...task, title: ' \t\n' }, 'too-long title': { ...task, title: 'ก'.repeat(201) },
  'protected creator': { ...task, creator_id: 9 }, 'protected status': { ...task, status: 'done' },
  'protected version': { ...task, version: 1 }, 'protected anchor': { ...task, recurrence_anchor_day: 31 },
  'SQL-shaped id': { ...task, project_id: '1 OR 1=1' }, 'negative id': { ...task, project_id: -1 },
  'string id': { ...task, project_id: '12' }, 'overflow id': { ...task, project_id: 2147483648 },
  'non-leap date': { ...task, due_date: '2027-02-29' }, 'impossible date': { ...task, due_date: '2026-02-30' },
  'year zero': { ...task, due_date: '0000-01-01' },
  'date timestamp': { ...task, due_date: '2026-10-09T00:00:00Z' }, 'start after due': { ...task, start_date: '2026-10-10' },
  'recurrence without due': { ...task, due_date: null }, 'invalid enum': { ...task, priority: 'critical' },
  'unrecognized field': { ...task, surprise: true }, 'UTF16 overflow': { ...task, title: '😀'.repeat(101) },
})) test(`UT-01 create task rejects ${label}`, () => assert.equal(validTask(body), false));
test('UTF16 boundary and leap-date inputs are accepted', () => {
  assert(validTask({ ...task, title: '😀'.repeat(100), due_date: '2028-02-29', start_date: null }));
});
test('PATCH validates merged dates rather than just submitted fields', () => {
  const current = { due_date: '2026-10-09', start_date: '2026-10-05', recurrence: 'weekly' };
  assert.equal(validateRequest('PATCH', '/api/tasks/{id}', { version: 1, start_date: '2026-10-10' }, current).valid, false);
  assert.equal(validateRequest('PATCH', '/api/tasks/{id}', { version: 1, due_date: null }, current).valid, false);
  assert(validateRequest('PATCH', '/api/tasks/{id}', { version: 1, due_date: null, recurrence: 'none' }, current).valid);
  assert.equal(validateRequest('PATCH', '/api/tasks/{id}', { version: 1, title: 'ใหม่' }).valid, false);
});
test('PATCH requires a version and at least one editable field; project is immutable', () => {
  const v = schemaValidator('PatchTask');
  assert.equal(v({ title: 'ใหม่' }), false); assert.equal(v({ version: 1 }), false);
  assert.equal(v({ version: 1, project_id: 2 }), false); assert(v({ version: 1, title: 'ใหม่' }));
});
test('DELETE task has a JSON version body; missing/string versions are rejected', () => {
  assert(validateRequest('DELETE', '/api/tasks/{id}', { version: 1 }).valid);
  for (const body of [undefined, {}, { version: '1' }, { version: 0 }, { version: 1, force: true }]) assert.equal(validateRequest('DELETE', '/api/tasks/{id}', body).valid, false);
});
test('membership changes use the parent version, not arbitrary role escalation fields', () => {
  assert(validateRequest('PUT', '/api/projects/{id}/members/{userId}', { access: 'viewer', version: 2 }).valid);
  assert.equal(validateRequest('PUT', '/api/projects/{id}/members/{userId}', { access: 'editor' }).valid, false);
  assert.equal(validateRequest('PUT', '/api/teams/{id}/members/{userId}', { team_role: 'admin', version: 2 }).valid, false);
  assert(validateRequest('DELETE', '/api/teams/{id}/members/{userId}', { version: 2 }).valid);
});
test('subtask writes require parent and subtask versions to support completion races', () => {
  assert(validateRequest('POST', '/api/tasks/{id}/subtasks', { title: 'ตรวจยอด', task_version: 2 }).valid);
  assert.equal(validateRequest('POST', '/api/tasks/{id}/subtasks', { title: 'ตรวจยอด' }).valid, false);
  assert(validateRequest('PATCH', '/api/subtasks/{id}', { done: true, version: 1, task_version: 2 }).valid);
  assert.equal(validateRequest('PATCH', '/api/subtasks/{id}', { done: true, version: 1 }).valid, false);
});
test('board move checks same-column versions and self-anchor before database work', () => {
  assert(validateRequest('POST', '/api/projects/{id}/board/move', move).valid);
  assert.equal(validateRequest('POST', '/api/projects/{id}/board/move', { ...move, before_task_id: 101 }).valid, false);
  assert.equal(validateRequest('POST', '/api/projects/{id}/board/move', { ...move, to_status: 'todo' }).valid, false);
  assert(validateRequest('POST', '/api/projects/{id}/board/move', { ...move, to_status: 'todo', target_column_version: 5, before_task_id: null }).valid);
});
test('query decoding handles OR arrays, explicit null and false without truthy-string bugs', () => {
  const q = decodeQuery('GET', '/api/tasks', new URLSearchParams('status=todo&status=doing&assignee=null&has_due=false&page=2&pageSize=100&creator=7'));
  assert.deepEqual(q, { status: ['todo', 'doing'], assignee: null, has_due: false, page: 2, pageSize: 100, creator: 7 });
});
for (const raw of ['page=0', 'pageSize=101', 'page=-1', 'page=01', 'page=1e2', 'page=1&page=2', 'status=todo,doing', 'status=todo&status=todo', 'status[]=todo', 'includeArchived=true', 'has_due=0', 'has_due=FALSE', 'assignee=', 'assignee=0', 'sort=password_hash', 'due_from=2026-02-30', 'due_from=2026-10-10&due_to=2026-10-09', 'has_due=false&due_from=2026-10-09', '__proto__=x', 'constructor=x', 'toString=x']) {
  test(`UT-01 query rejects ${raw}`, () => assert.throws(() => decodeQuery('GET', '/api/tasks', new URLSearchParams(raw))));
}
test('CSV/report query cannot silently paginate exported rows', () => {
  assert.throws(() => decodeQuery('GET', '/api/export/tasks.csv', new URLSearchParams('page=2')));
  assert.throws(() => decodeQuery('GET', '/api/reports/summary', new URLSearchParams('pageSize=50')));
});
test('password schemas enforce bounds without trimming or mutating input', () => {
  const v = schemaValidator('Password');
  assert.equal(v('a'.repeat(5)), false); assert(v('a'.repeat(6))); assert(v('a'.repeat(128))); assert.equal(v('a'.repeat(129)), false);
  const body = { current_password: ' a ', new_password: ` ${'a'.repeat(10)} ` };
  const before = structuredClone(body); assert(validateRequest('POST', '/api/password', body).valid); assert.deepEqual(body, before);
});
test('timestamp schema accepts UTC millisecond format and rejects offsets/date-only', () => {
  const v = schemaValidator('Timestamp');
  assert(v('2026-10-05T00:00:00.000Z')); assert.equal(v('2026-10-05T07:00:00+07:00'), false); assert.equal(v('2026-10-05'), false); assert.equal(v('0000-10-05T00:00:00.000Z'), false); assert.equal(v('2026-10-05T23:59:60.000Z'), false);
});
test('error DTO accepts conflict version and rejects SQL stack/token fields', () => {
  const v = schemaValidator('Error');
  const error = { error: { code: 'VERSION_CONFLICT', message: 'ข้อมูลถูกแก้ไขแล้ว', fieldErrors: {}, requestId: randomUUID(), currentVersion: 2 } };
  assert(v(error)); assert.equal(v({ error: { ...error.error, stack: 'private' } }), false);
  assert.equal(v({ error: { ...error.error, requestId: 'untrusted input' } }), false);
  assert.equal(v({ error: { ...error.error, code: 'UNDEFINED' } }), false);
  const { currentVersion, ...withoutVersion } = error.error;
  assert.equal(v({ error: withoutVersion }), false);
});
test('public metadata cannot expand into organization/path/database details', () => {
  const v = schemaValidator('Meta'); assert(v({ setupRequired: false, version: '0.0.0' }));
  assert.equal(v({ setupRequired: false, version: '0.0.0', organization_name: 'Private' }), false);
});
test('every named response object rejects secret/internal fields', () => {
  const forbidden = new Set(['password_hash', 'password', 'temp_password', 'token_hash', 'auth_version', 'storage_key', 'storage_path', 'db_path']);
  const responseNames = new Set(['Person', 'AdminUser', 'Organization', 'Team', 'AdminTeam', 'Project', 'ProjectMember', 'DirectoryPerson', 'Subtask', 'Task', 'TaskDetail', 'Comment', 'Attachment', 'TaskEvent', 'Notification', 'Board', 'Report', 'Self']);
  for (const name of responseNames) {
    const schema = contract.components.schemas[name]; assert.equal(schema.additionalProperties, false);
    for (const key of Object.keys(schema.properties)) assert.equal(forbidden.has(key), false, `${name}.${key}`);
  }
});
test('write headers require UUID keys on completion, upload and create routes', () => {
  for (const [method, path] of [['PATCH', '/api/tasks/{id}'], ['POST', '/api/tasks/{id}/attachments'], ['POST', '/api/tasks'], ['POST', '/api/tasks/{id}/comments']]) {
    const p = operation(method, path).parameters.find((p) => p.name === 'Idempotency-Key');
    assert(p.required); const v = validator(p.schema); assert(v(randomUUID())); assert.equal(v('retry'), false);
  }
});
test('bodyless commands reject extra body; 204 never has a content schema', () => {
  assert(validateRequest('POST', '/api/logout', undefined).valid);
  assert.equal(validateRequest('POST', '/api/logout', { user_id: 12 }).valid, false);
  assert.equal(operation('POST', '/api/logout').responses['204'].content, undefined);
});
test('Task DTO includes scoped display context and rejects nested private account fields', () => {
  const time = '2026-10-05T00:00:00.000Z';
  const dto = { group_id: null, id: 101, project_id: 12, project_name: 'รายงาน', owner_team_id: 1, owner_team_name: 'ทีมทดสอบ', title: 'ตรวจยอด', description: '', category: '', status: 'todo', priority: 'medium', assignee_ids: [7], assignees: [{ id: 7, display_name: 'ผู้ทดสอบ', active: true }], assignee_id: 7, assignee: { id: 7, display_name: 'ผู้ทดสอบ', active: true }, creator_id: 1, start_date: null, due_date: null, recurrence: 'none', recurrence_anchor_day: null, predecessor_task_id: null, successor_task_id: null, version: 1, created_at: time, updated_at: time, completed_at: null, deleted_at: null, deleted_by: null, subtask_count: 0, subtask_done_count: 0, overdue: false };
  const v = schemaValidator('Task'); assert(v(dto));
  assert.equal(v({ ...dto, assignee: { ...dto.assignee, password_hash: 'private' } }), false);
  assert.equal(v({ ...dto, storage_path: 'private' }), false);
  const result = schemaValidator('TaskMutationResult');
  assert(result({ item: { ...dto, subtasks: [] }, successor: null, affected_columns: [] }));
  assert(result({ item: { ...dto, subtasks: [] }, successor: null, affected_columns: [{ status: 'todo', version: 2 }] }));
});
test('board fallback signals incomplete ordering instead of pretending a partial board is complete', () => {
  const v = schemaValidator('Board');
  const columns = ['todo', 'doing', 'review', 'done'].map((status) => ({ status, version: 1, task_ids: [], complete: false }));
  assert(v({ project_id: 1, mode: 'list_required', total: 501, columns, tasks: [] }));
  assert.equal(v({ project_id: 1, mode: 'list_required', total: 501, columns: columns.map(({ complete, ...rest }) => rest), tasks: [] }), false);
});

test('checklist remark accepts plain text, supports empty clear and rejects dates/null/oversize', () => {
  const create = (b) => validateRequest('POST', '/api/tasks/{id}/subtasks', { title: 'Checklist', task_version: 1, ...b }).valid;
  const patch = (b) => validateRequest('PATCH', '/api/subtasks/{id}', { version: 1, task_version: 2, ...b }).valid;
  assert(create({ remark: '  Notes \u{1f680}\nSecond line  ' }));
  assert(create({ remark: '\u{1f600}'.repeat(1000) }));
  assert(patch({ remark: '' }));
  for (const remark of [null, '\u{1f600}'.repeat(1001)]) { assert.equal(create({ remark }), false); assert.equal(patch({ remark }), false); }
  for (const field of ['start_date', 'due_date']) { assert.equal(create({ [field]: '2026-10-09' }), false); assert.equal(patch({ [field]: '2026-10-09' }), false); }
});
