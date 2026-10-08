import { createHash, randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { insert, time } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
export const now = '2026-10-06T00:30:00.000Z';
export const csrf = 'c'.repeat(64);
export const proof = (userId: number) => ({
  userId,
  tokenHash: createHash('sha256').update(`isolated-auth-fixture-${userId}`).digest('hex'),
});
export async function accessFixture(factory: () => Promise<Fixture>) {
  const f = await factory();
  try {
    await f.db.transaction(async (tx) => {
      await tx.execute(sql('UPDATE dbo.users SET must_change_password=0'));
      for (let id = 3; id <= 9; id++)
        await tx.execute(
          insert('users', {
            username: `Fixture${id}`,
            display_name: `fixture${id}`,
            password_hash: 'fixture-only-not-authenticatable',
            must_change_password: 0,
          }),
        );
      for (const [user_id, team_id, team_role] of [
        [2, 1, 'member'],
        [3, 1, 'lead'],
        [4, 2, 'member'],
        [6, 2, 'lead'],
        [7, 1, 'member'],
        [8, 1, 'lead'],
      ] as const)
        await tx.execute(insert('team_members', { user_id, team_id, team_role }));
      for (const [user_id, access] of [
        [4, 'editor'],
        [5, 'viewer'],
        [8, 'viewer'],
        [9, 'editor'],
      ] as const)
        await tx.execute(
          insert('project_members', { project_id: 1, user_id, access, added_by: 1 }),
        );
      await tx.execute(sql('UPDATE dbo.tasks SET creator_id=4,assignee_id=4 WHERE id=1'));
      await tx.execute(sql('UPDATE dbo.tasks SET creator_id=7,assignee_id=7 WHERE id=2'));
      await tx.execute(insert('tasks', { project_id: 2, title: 'PRIVATE_ONLY', creator_id: 1 }));
      await tx.execute(
        insert('board_positions', { task_id: 3, project_id: 2, status: 'todo', rank: 1 }),
      );
      await tx.execute(insert('subtasks', { task_id: 1, title: 'fixture child' }));
      for (const [task_id, uploader_id, deleted_at] of [
        [1, 4, null],
        [1, 9, null],
        [3, 1, null],
        [1, 4, '2026-10-05T00:00:00.000Z'],
      ] as const)
        await tx.execute(
          insert('attachments', {
            task_id,
            uploader_id,
            original_name: 'fixture.pdf',
            storage_key: randomUUID(),
            bytes: 100,
            validated_type: 'application/pdf',
            sha256: 'a'.repeat(64),
            deleted_at,
          }),
        );
      for (const [recipient_id, task_id] of [
        [4, 1],
        [4, 3],
        [5, 1],
      ] as const)
        await tx.execute(
          insert('notifications', {
            recipient_id,
            task_id,
            type: 'comment',
            message: task_id === 3 ? 'PRIVATE_ONLY' : 'fixture',
            dedupe_key: randomUUID(),
          }),
        );
      for (let user = 1; user <= 9; user++)
        await tx.execute(
          insert('sessions', {
            token_hash: proof(user).tokenHash,
            user_id: user,
            csrf_token: csrf,
            auth_version: 1,
            created_at: time,
            last_seen_at: time,
            absolute_expires_at: '2026-10-06T12:00:00.000Z',
          }),
        );
    });
    return f;
  } catch (e) {
    await f.close();
    throw e;
  }
}
