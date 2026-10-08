import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { insert } from '../schema/fixtures.js';
import { sessionFixture, password } from '../sessions/fixtures.js';
import { accountService } from '../../src/services/accounts.js';
import { currentActor } from '../../src/services/authorization.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
const next = '  New-password-fixture  ';
export function accountAcceptance(
  provider: string,
  factory: () => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (
    name: string,
    run: (
      f: Awaited<ReturnType<typeof sessionFixture>>,
      a: ReturnType<typeof accountService>,
      proof: { userId: number; tokenHash: string },
    ) => Promise<void>,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        const login = await f.service.login({ username: 'Admin', password }, '127.0.0.1');
        await run(f, accountService(f.db, f.service, { clock: f.clock }), {
          userId: 1,
          tokenHash: tokenDigest(login.token),
        });
      } finally {
        await f.close();
      }
    });
  const rejected = (p: Promise<unknown>, code: string) =>
    assert.rejects(
      p,
      (e: unknown) => (e instanceof ApiFault || e instanceof OperationError) && e.code === code,
    );
  check(
    'T015 rotates token/CSRF, revokes others, preserves absolute lifetime and clears forced gate',
    async (f, a, proof) => {
      const other = await f.service.login({ username: 'Admin', password }, '127.0.0.2');
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=1')),
      );
      await rejected(
        f.db.transaction((tx) => currentActor(tx, proof, false, { clock: f.clock })),
        'PASSWORD_CHANGE_REQUIRED',
      );
      const prepared = await a.prepare('password', proof, {
        current_password: password,
        new_password: next,
      });
      f.setTime('2026-10-06T00:10:00.000Z');
      const result = await f.db.transaction((tx) => a.password(tx, proof, prepared, randomUUID()));
      assert.notEqual(tokenDigest(result.token), proof.tokenHash);
      assert.equal(result.expires, '2026-10-06T12:00:00.000Z');
      assert.equal(result.body.must_change_password, false);
      assert.equal(result.body.user.version, 2);
      assert.equal(await f.service.principal(proof.tokenHash), null);
      assert.equal(await f.service.principal(tokenDigest(other.token)), null);
      assert.equal((await f.service.principal(tokenDigest(result.token)))!.id, 1);
      await rejected(
        f.service.login({ username: 'Admin', password: next.trim() }, '127.0.0.3'),
        'INVALID_CREDENTIALS',
      );
      await f.service.login({ username: 'Admin', password: next }, '127.0.0.3');
      const events = await f.db.transaction((tx) =>
        tx.query(sql('SELECT redacted_changes FROM dbo.admin_events')),
      );
      assert(!JSON.stringify(events).includes(next));
      assert(!JSON.stringify(events).includes('scrypt$'));
    },
  );
  check(
    'T015 rejects wrong current, short/long passwords and client-controlled fields without mutation',
    async (f, a, proof) => {
      for (const body of [
        { current_password: 'wrong', new_password: next },
        { current_password: password, new_password: 'x'.repeat(5) },
        { current_password: password, new_password: '😀'.repeat(129) },
        { current_password: password, new_password: next, user_id: 2 },
      ])
        await assert.rejects(a.prepare('password', proof, body));
      assert.equal(
        (
          await f.db.transaction((tx) => tx.query(sql('SELECT version FROM dbo.users WHERE id=1')))
        )[0]!.version,
        1,
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
      const p = await a.prepare('password', proof, {
        current_password: password,
        new_password: '😀'.repeat(128),
      });
      await f.db.transaction((tx) => a.password(tx, proof, p, randomUUID()));
      await f.service.login({ username: 'Admin', password: '😀'.repeat(128) }, '127.0.0.2');
    },
  );
  check(
    'T015 credential attempt limit survives business rollback and expires at15min',
    async (f, a, proof) => {
      for (let i = 0; i < 10; i++)
        await rejected(
          a.prepare('password', proof, { current_password: 'wrong', new_password: next }),
          'INVALID_CREDENTIALS',
        );
      await rejected(
        a.prepare('password', proof, { current_password: password, new_password: next }),
        'RATE_LIMITED',
      );
      f.setTime('2026-10-06T00:15:00.000Z');
      await a.prepare('password', proof, { current_password: password, new_password: next });
    },
  );
  check('T015 prepared credentials recheck revocation before commit', async (f, a, proof) => {
    const prepared = await a.prepare('password', proof, {
      current_password: password,
      new_password: next,
    });
    await f.db.transaction((tx) =>
      tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1 WHERE id=1')),
    );
    await rejected(
      f.db.transaction((tx) => a.password(tx, proof, prepared, randomUUID())),
      'UNAUTHENTICATED',
    );
    assert.equal(
      (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
      0,
    );
  });
  check(
    'T016 create forces change, defaults member, username CI duplicate, immutable username and no secrets',
    async (f, a, proof) => {
      const p = await a.prepare('create', proof, {
        username: 'Temp.User',
        display_name: '  ผู้ใช้ใหม่  ',
        temp_password: next,
      });
      const made = await f.db.transaction((tx) => a.create(tx, proof, p, randomUUID()));
      assert.equal(made.item.display_name, 'ผู้ใช้ใหม่');
      assert.equal(made.item.org_role, 'member');
      assert.equal(made.item.must_change_password, true);
      const login = await f.service.login({ username: 'temp.user', password: next }, '127.0.0.2');
      assert(login.body.must_change_password);
      const duplicate = await a.prepare('create', proof, {
        username: 'TEMP.USER',
        display_name: 'duplicate',
        temp_password: next,
      });
      await rejected(
        f.db.transaction((tx) => a.create(tx, proof, duplicate, randomUUID())),
        'VALIDATION_FAILED',
      );
      await rejected(
        f.db.transaction((tx) =>
          a.patch(tx, proof, made.item.id, { username: 'changed', version: 1 }, randomUUID()),
        ),
        'VALIDATION_FAILED',
      );
      const listing = await f.db.transaction((tx) => a.list(tx, proof, {}));
      assert(!JSON.stringify(listing).includes(next));
      assert(!JSON.stringify(listing).includes('password_hash'));
    },
  );
  check(
    'T016 search is literal, pages stable, active filter and no privileged member reads',
    async (f, a, proof) => {
      for (const q of ['%', '_', '[', "' OR 1=1 --"]) {
        const list = await f.db.transaction((tx) => a.list(tx, proof, { q }));
        assert.equal(list.total, 0);
      }
      const page = await f.db.transaction((tx) => a.list(tx, proof, { page: 2, pageSize: 1 }));
      assert.equal(page.total, 2);
      assert.equal(page.items[0]!.username, 'Member');
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=2')));
      assert.equal((await f.db.transaction((tx) => a.list(tx, proof, { active: false }))).total, 1);
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=1 WHERE id=2')));
      const member = await f.service.login({ username: 'Member', password }, '127.0.0.2');
      await rejected(
        f.db.transaction((tx) =>
          a.list(tx, { userId: 2, tokenHash: tokenDigest(member.token) }, {}),
        ),
        'FORBIDDEN',
      );
    },
  );
  check(
    'T016 optimistic version, no-op and last active Admin guard preserve state/audit',
    async (f, a, proof) => {
      await rejected(
        f.db.transaction((tx) =>
          a.patch(tx, proof, 1, { active: false, version: 1 }, randomUUID()),
        ),
        'LAST_ACTIVE_ADMIN',
      );
      await rejected(
        f.db.transaction((tx) =>
          a.patch(tx, proof, 1, { org_role: 'member', version: 1 }, randomUUID()),
        ),
        'LAST_ACTIVE_ADMIN',
      );
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { display_name: 'ผู้ทดสอบ', version: 1 }, randomUUID()),
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { display_name: 'changed', version: 1 }, randomUUID()),
      );
      await rejected(
        f.db.transaction((tx) =>
          a.patch(tx, proof, 2, { display_name: 'stale', version: 1 }, randomUUID()),
        ),
        'VERSION_CONFLICT',
      );
      assert.equal((await f.db.transaction((tx) => a.list(tx, proof, {}))).items[1]!.version, 2);
    },
  );
  check(
    'T015/016 reset confirms actor password, rejects stale version, revokes and forces target only',
    async (f, a, proof) => {
      const member = await f.service.login({ username: 'Member', password }, '127.0.0.2');
      await rejected(
        a.prepare('reset', proof, { admin_password: 'wrong', temp_password: next, version: 1 }, 2),
        'INVALID_CREDENTIALS',
      );
      await rejected(
        a.prepare('reset', proof, { admin_password: password, temp_password: next, version: 2 }, 2),
        'VERSION_CONFLICT',
      );
      const prepared = await a.prepare(
        'reset',
        proof,
        { admin_password: password, temp_password: next, version: 1 },
        2,
      );
      const reset = await f.db.transaction((tx) => a.reset(tx, proof, 2, prepared, randomUUID()));
      assert.equal(reset.item.must_change_password, true);
      assert.equal(reset.item.version, 2);
      assert.equal(await f.service.principal(tokenDigest(member.token)), null);
      assert.equal((await f.service.principal(proof.tokenHash))!.id, 1);
      const fresh = await f.service.login({ username: 'Member', password: next }, '127.0.0.2');
      assert(fresh.body.must_change_password);
      await rejected(
        f.db.transaction((tx) =>
          currentActor(tx, { userId: 2, tokenHash: tokenDigest(fresh.token) }, false, {
            clock: f.clock,
          }),
        ),
        'PASSWORD_CHANGE_REQUIRED',
      );
      assert(!JSON.stringify(reset).includes('password_hash'));
      assert(!JSON.stringify(reset).includes(next));
    },
  );
  check(
    'T016 deactivation cleans all unfinished including archived/deleted; done/history survive; notifications/revisions atomic',
    async (f, a, proof) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(insert('team_members', { user_id: 2, team_id: 1, team_role: 'lead' }));
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2,creator_id=2'));
        await tx.execute(sql('DELETE FROM dbo.board_positions WHERE task_id=2'));
        await tx.execute(
          sql("UPDATE dbo.tasks SET status='done',completed_at=@now WHERE id=2", {
            now: f.clock().toISOString(),
          }),
        );
        await tx.execute(
          insert('board_positions', { task_id: 2, project_id: 1, status: 'done', rank: 1 }),
        );
        await tx.execute(
          sql('UPDATE dbo.projects SET archived_at=@now WHERE id=1', {
            now: f.clock().toISOString(),
          }),
        );
        await tx.execute(
          sql('UPDATE dbo.tasks SET deleted_at=@now,deleted_by=1 WHERE id=1', {
            now: f.clock().toISOString(),
          }),
        );
        await tx.execute(
          insert('users', {
            username: 'OtherAdmin',
            display_name: 'Admin2',
            password_hash: 'fixture',
            org_role: 'admin',
            must_change_password: 0,
          }),
        );
        await tx.execute(insert('user_view_revisions', { user_id: 3, revision: randomUUID() }));
      });
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=2')),
      );
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { active: false, version: 1 }, randomUUID()),
      );
      const tasks = await f.db.transaction((tx) =>
        tx.query(sql('SELECT id,assignee_id,creator_id,version FROM dbo.tasks ORDER BY id')),
      );
      assert.deepEqual(
        tasks.map((t) => [t.assignee_id, t.creator_id, t.version]),
        [
          [null, 2, 2],
          [2, 2, 1],
        ],
      );
      const events = await f.db.transaction((tx) =>
        tx.query(sql('SELECT field_changes FROM dbo.task_events')),
      );
      assert.deepEqual(JSON.parse(String(events[0]!.field_changes)), [
        { field: 'assignee_id', before: 2, after: null },
        {field:'assignee_ids',before:'[2]',after:'[]'},
      ]);
      const notices = await f.db.transaction((tx) =>
        tx.query(sql('SELECT recipient_id FROM dbo.notifications')),
      );
      assert.deepEqual(notices, [{ recipient_id: 3 }]);
      assert.notEqual(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=2')),
          )
        )[0]!.revision,
        before[0]!.revision,
      );
      await rejected(
        f.service.login({ username: 'Member', password }, '127.0.0.2'),
        'INVALID_CREDENTIALS',
      );
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { active: true, version: 2 }, randomUUID()),
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id FROM dbo.tasks WHERE id=1')),
          )
        )[0]!.assignee_id,
        null,
      );
    },
  );
  check(
    'T016 Admin demotion retains independent ownerLead/editor even archived; viewer/private loses assignee',
    async (f, a, proof) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql("UPDATE dbo.users SET org_role='admin' WHERE id=2"));
        await tx.execute(insert('team_members', { user_id: 2, team_id: 1, team_role: 'lead' }));
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2'));
        await tx.execute(
          insert('tasks', { project_id: 2, title: 'private', creator_id: 2, assignee_id: 2 }),
        );
        await tx.execute(
          sql('UPDATE dbo.projects SET archived_at=@now', { now: f.clock().toISOString() }),
        );
      });
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { org_role: 'member', version: 1 }, randomUUID()),
      );
      assert.deepEqual(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id FROM dbo.tasks ORDER BY id')),
          )
        ).map((t) => t.assignee_id),
        [2, 2, null],
      );
    },
  );
  check(
    'T016 demotion preserves explicit editor but removes viewer-only assignment and leaves unrelated revision private',
    async (f, a, proof) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(sql("UPDATE dbo.users SET org_role='admin' WHERE id=2"));
        await tx.execute(
          insert('project_members', { project_id: 1, user_id: 2, access: 'editor', added_by: 1 }),
        );
        await tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2'));
        await tx.execute(
          insert('tasks', { project_id: 2, title: 'viewer only', creator_id: 1, assignee_id: 2 }),
        );
        await tx.execute(
          insert('project_members', { project_id: 2, user_id: 2, access: 'viewer', added_by: 1 }),
        );
        await tx.execute(
          insert('users', {
            username: 'Unrelated',
            display_name: 'Unrelated',
            password_hash: 'fixture',
            must_change_password: 0,
          }),
        );
        await tx.execute(insert('user_view_revisions', { user_id: 3, revision: randomUUID() }));
      });
      const revision = (
        await f.db.transaction((tx) =>
          tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=3')),
        )
      )[0]!.revision;
      await f.db.transaction((tx) =>
        a.patch(tx, proof, 2, { org_role: 'member', version: 1 }, randomUUID()),
      );
      assert.deepEqual(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT assignee_id FROM dbo.tasks ORDER BY id')),
          )
        ).map((r) => r.assignee_id),
        [2, 2, null],
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT revision FROM dbo.user_view_revisions WHERE user_id=3')),
          )
        )[0]!.revision,
        revision,
      );
    },
  );
  check(
    'T015 exact12 scalars accepted, wrong-current request does not alter last-seen',
    async (f, a, proof) => {
      const before = await f.db.transaction((tx) =>
        tx.query(sql('SELECT last_seen_at FROM dbo.sessions')),
      );
      await rejected(
        a.prepare('password', proof, { current_password: 'wrong', new_password: '😀'.repeat(12) }),
        'INVALID_CREDENTIALS',
      );
      assert.deepEqual(
        await f.db.transaction((tx) => tx.query(sql('SELECT last_seen_at FROM dbo.sessions'))),
        before,
      );
      const p = await a.prepare('password', proof, {
        current_password: password,
        new_password: '😀'.repeat(12),
      });
      await f.db.transaction((tx) => a.password(tx, proof, p, randomUUID()));
    },
  );
  check(
    'T016 rollback prevents partial account/task/audit/notification changes',
    async (f, a, proof) => {
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.tasks SET assignee_id=2')));
      await assert.rejects(
        f.db.transaction(async (tx) => {
          await a.patch(tx, proof, 2, { active: false, version: 1 }, randomUUID());
          throw new Error('fixture rollback');
        }),
      );
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT active,version FROM dbo.users WHERE id=2')),
          )
        )[0]!.active,
        1,
      );
      assert.deepEqual(
        (
          await f.db.transaction((tx) => tx.query(sql('SELECT assignee_id,version FROM dbo.tasks')))
        ).map((r) => [r.assignee_id, r.version]),
        [
          [2, 1],
          [2, 1],
        ],
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.admin_events')))).length,
        0,
      );
      assert.equal(
        (await f.db.transaction((tx) => tx.query(sql('SELECT id FROM dbo.task_events')))).length,
        0,
      );
    },
  );
}
