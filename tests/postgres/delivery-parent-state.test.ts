import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pgFixture } from '../schema/fixtures.js';
import { sessionFixture } from '../sessions/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import {
  deliveryParentStateSuite,
  seedParent,
  parentProof,
  orderedRace,
  taskService,
  workspaceService,
} from '../permissions/delivery-parent-state-suite.js';
const skip = process.env.RUN_POSTGRES_TESTS === '1' ? false : 'PG NOT_RUN (no local PG)';
deliveryParentStateSuite('PostgreSQL', pgFixture, skip);
for (const scenario of [
  'archive-restore',
  'archive-unarchive',
  'revoke-restore',
  'version',
  'retention',
] as const)
  for (const changeFirst of [true, false])
    test(
      `PostgreSQL two-connection ${scenario}, changeFirst=${changeFirst}`,
      { skip },
      async () => {
        const f = await sessionFixture(pgFixture);
        try {
          await seedParent(f);
          const manager = await parentProof(f),
            admin = await parentProof(f, 'Admin', 1);
          const tasks = taskService({ clock: f.clock }),
            workspaces = workspaceService({ clock: f.clock });
          if (scenario === 'archive-unarchive')
            await f.db.transaction((tx) =>
              tx.execute(
                sql('UPDATE dbo.projects SET archived_at=@at WHERE id=1', {
                  at: f.clock().toISOString(),
                }),
              ),
            );
          const change = async (tx: Parameters<typeof tasks.list>[0]) => {
            const text =
              scenario === 'revoke-restore'
                ? "DELETE FROM dbo.user_permissions WHERE user_id=2 AND permission_key='P-04'"
                : scenario === 'version'
                  ? 'UPDATE dbo.tasks SET version=version+1 WHERE id=3'
                  : scenario === 'retention'
                    ? "UPDATE dbo.tasks SET deleted_at='2026-09-06T00:00:00.000Z' WHERE id=3"
                    : "UPDATE dbo.teams SET archived_at='2026-10-06T00:00:00.000Z' WHERE id=1";
            await tx.execute(sql(text));
          };
          const confirm = (tx: Parameters<typeof tasks.list>[0]) =>
            scenario === 'archive-unarchive'
              ? workspaces.patchProject(tx, admin, 1, { archived: false, version: 1 }, randomUUID())
              : tasks.trashMutation(tx, manager, 3, { version: 1 }, true, randomUUID());
          const results = await orderedRace(
            f,
            changeFirst ? change : confirm,
            changeFirst ? confirm : change,
          );
          assert.equal(results[0]!.status, 'fulfilled');
          if (changeFirst) {
            assert.equal(results[1]!.status, 'rejected');
            const failure = results[1] as PromiseRejectedResult;
            assert.equal(
              failure.reason.code,
              scenario === 'revoke-restore'
                ? 'NOT_FOUND'
                : scenario === 'version'
                  ? 'VERSION_CONFLICT'
                  : scenario === 'retention'
                    ? 'RETENTION_EXPIRED'
                    : 'TEAM_ARCHIVED',
            );
          } else assert.equal(results[1]!.status, 'fulfilled');
          const events = await f.db.transaction((tx) =>
            tx.query(
              sql(
                scenario === 'archive-unarchive'
                  ? "SELECT id FROM dbo.admin_events WHERE action='project_updated'"
                  : 'SELECT id FROM dbo.task_events WHERE task_id=3',
              ),
            ),
          );
          assert.equal(events.length, changeFirst ? 0 : 1);
        } finally {
          await f.close();
        }
      },
    );
