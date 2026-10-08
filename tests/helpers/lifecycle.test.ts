import test from 'node:test';
import assert from 'node:assert/strict';
import { requireVersion, requireWritableResource } from '../../src/domain/lifecycle.js';
const active = {
  userActive: true,
  forcedPassword: false,
  canRead: true,
  canWrite: true,
  canManageTrash: false,
  exists: true,
  deleted: false,
  projectArchived: false,
  teamArchived: false,
};
test('Expected version rejects stale/invalid/overflow without a new version', () => {
  assert.equal(requireVersion(1, 1), 2);
  assert.throws(() => requireVersion(2, 1), { status: 409, code: 'VERSION_CONFLICT' });
  for (const expected of [0, -1, 1.1, NaN, 2147483648])
    assert.throws(() => requireVersion(1, expected), { status: 422 });
  assert.throws(() => requireVersion(2147483647, 2147483647), { status: 503 });
});
test('Write lifecycle checks auth/scope/deleted/archive boundaries and RD-01 exceptions', () => {
  requireWritableResource(active);
  assert.throws(() => requireWritableResource({ ...active, userActive: false }), { status: 401 });
  assert.throws(() => requireWritableResource({ ...active, forcedPassword: true }), {
    status: 403,
    code: 'PASSWORD_CHANGE_REQUIRED',
  });
  assert.throws(() => requireWritableResource({ ...active, canRead: false }), { status: 404 });
  assert.throws(() => requireWritableResource({ ...active, canWrite: false }), { status: 403 });
  assert.throws(() => requireWritableResource({ ...active, deleted: true }), { status: 404 });
  assert.throws(() => requireWritableResource({ ...active, projectArchived: true }, 'delete'), {
    status: 422,
    code: 'PROJECT_ARCHIVED',
  });
  requireWritableResource({ ...active, projectArchived: true, canManageTrash: true }, 'delete');
  requireWritableResource(
    { ...active, projectArchived: true, deleted: true, canManageTrash: true },
    'restore',
  );
  assert.throws(
    () => requireWritableResource({ ...active, projectArchived: true, canManageTrash: true }),
    { status: 422 },
  );
  assert.throws(() => requireWritableResource({ ...active, teamArchived: true }), {
    status: 422,
    code: 'TEAM_ARCHIVED',
  });
  assert.throws(() => requireWritableResource(active, 'restore'), { status: 404 });
});
