import test from 'node:test';
import assert from 'node:assert/strict';
import { effectiveRole, rights } from '../../src/domain/permissions.js';
test('effective permission precedence; ordinary membership cannot grant read/write/manage', () => {
  for (const admin of [false, true])
    for (const lead of [false, true])
      for (const member of [null, 'viewer', 'editor'] as const) {
        const role = effectiveRole(admin, lead, member);
        assert.equal(role, admin ? 'admin' : lead ? 'lead' : (member ?? 'none'));
        assert.deepEqual(rights(role), {
          read: admin || lead || member !== null,
          write: admin || lead || member === 'editor',
          manage: admin || lead,
        });
      }
});
