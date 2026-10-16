import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Database, Transaction } from '../../src/domain/database.js';
import type { Fixture } from '../schema/fixtures.js';
import { sessionFixture, password, rejection } from '../sessions/fixtures.js';
import { registrationService, registrationReply } from '../../src/services/registrations.js';
import { accountService } from '../../src/services/accounts.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { verifyPassword } from '../../src/security/passwords.js';
import { sessionService } from '../../src/services/sessions.js';

const input = { email: 'New.Member@Example.invalid', display_name: 'สมาชิกใหม่ ไทย 😀', password };
export function registrationAcceptance(
  profile: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: string | false = false,
) {
  const run = (
    name: string,
    work: (
      f: Awaited<ReturnType<typeof sessionFixture>>,
      service: ReturnType<typeof registrationService>,
    ) => Promise<void>,
  ) =>
    test(`${profile}: email registration ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        await work(f, registrationService(f.db, { clock: f.clock }));
      } finally {
        await f.close();
      }
    });
  const rows = <R extends Record<string, string | number | null>>(db: Database, query: string) =>
    db.transaction((tx) => tx.query<R>(sql(query)));
  const admin = async (f: Awaited<ReturnType<typeof sessionFixture>>) => {
    const result = await f.service.login({ username: 'Admin', password }, '127.0.0.2');
    return { userId: 1, tokenHash: tokenDigest(result.token) };
  };
  run(
    'is inactive, preserves passwords on duplicate/concurrent submission, rejects injected rights',
    async (f, service) => {
      const before = (await rows(f.db, 'SELECT id FROM dbo.users')).length;
      const replies = await Promise.all([
        service.register(input, '127.0.0.1', randomUUID()),
        service.register(
          { ...input, email: input.email.toLowerCase(), password: 'Different-password' },
          '127.0.0.3',
          randomUUID(),
        ),
      ]);
      assert.deepEqual(replies, [registrationReply, registrationReply]);
      const pending = (
        await rows<{
          id: number;
          active: number;
          org_role: string;
          password_hash: string;
          username: string;
        }>(
          f.db,
          'SELECT u.id,u.active,u.org_role,u.password_hash,u.username FROM dbo.users u JOIN dbo.registrations r ON r.user_id=u.id',
        )
      )[0]!;
      assert.equal(pending.active, 0);
      assert.equal(pending.org_role, 'member');
      assert.equal((await rows(f.db, 'SELECT id FROM dbo.users')).length, before + 1);
      assert(
        (await verifyPassword(password, pending.password_hash)) ||
          (await verifyPassword('Different-password', pending.password_hash)),
      );
      const original = pending.password_hash;
      assert.deepEqual(
        await service.register(
          { ...input, password: 'Replacement-password' },
          '127.0.0.4',
          randomUUID(),
        ),
        registrationReply,
      );
      assert.equal(
        (
          await rows<{ password_hash: string }>(
            f.db,
            `SELECT password_hash FROM dbo.users WHERE id=${pending.id}`,
          )
        )[0]!.password_hash,
        original,
      );
      await rejection(
        f.service.login({ username: input.email, password }, '127.0.0.5'),
        'INVALID_CREDENTIALS',
      );
      await rejection(
        f.service.login({ username: pending.username, password }, '127.0.0.6'),
        'INVALID_CREDENTIALS',
      );
      await rejection(
        service.register({ ...input, org_role: 'admin' }, '127.0.0.7', randomUUID()),
        'VALIDATION_FAILED',
      );
      assert.equal((await rows(f.db, 'SELECT token_hash FROM dbo.sessions')).length, 0);
      const audits = await rows(
        f.db,
        "SELECT redacted_changes FROM dbo.admin_events WHERE action='registration_submitted'",
      );
      assert.equal(audits.length, 1);
      assert(!JSON.stringify(audits).includes(input.email));
      assert(!JSON.stringify(audits).includes(password));
    },
  );
  run(
    'Admin approval unlocks case-insensitive email login with no memberships or permissions',
    async (f, service) => {
      await service.register(input, '127.0.0.1', randomUUID());
      const proof = await admin(f);
      const pending = (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!;
      const member = await f.service.login({ username: 'Member', password }, '127.0.0.3');
      await rejection(
        f.db.transaction((tx) =>
          service.review(
            tx,
            { userId: 2, tokenHash: tokenDigest(member.token) },
            pending.id,
            { version: 1 },
            'approved',
            randomUUID(),
          ),
        ),
        'FORBIDDEN',
      );
      await f.db.transaction((tx) =>
        service.review(tx, proof, pending.id, { version: 1 }, 'approved', randomUUID()),
      );
      const login = await f.service.login(
        { username: input.email.toUpperCase(), password },
        '127.0.0.4',
      );
      assert.equal(login.body.user.org_role, 'member');
      assert.equal(login.body.must_change_password, false);
      assert.deepEqual(login.body.user.teams, []);
      assert.deepEqual(login.body.user.permission_keys, []);
      assert.deepEqual(login.body.effective_summary.project_ids, []);
      const requests = await f.db.transaction((tx) =>
        service.list(tx, proof, { status: 'all', page: 1, pageSize: 1 }),
      );
      assert.equal(requests.total, 1);
      assert.equal(requests.items[0]!.status, 'approved');
      const details = await rows(
        f.db,
        `SELECT redacted_changes FROM dbo.admin_events WHERE resource_type='registration' AND resource_id=${pending.id}`,
      );
      assert.equal(details.length, 2);
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=@id', { id: pending.user_id })),
      );
      await rejection(
        f.service.login({ username: input.email, password }, '127.0.0.5'),
        'INVALID_CREDENTIALS',
      );
    },
  );
  run(
    'reject/stale review cannot activate accounts or bypass approval through account PATCH',
    async (f, service) => {
      await service.register(input, '127.0.0.1', randomUUID());
      const proof = await admin(f),
        account = accountService(f.db, f.service, { clock: f.clock });
      const item = (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!;
      for (const body of [{ active: true }, { org_role: 'admin' }, { team_ids: [1] }])
        await rejection(
          f.db.transaction((tx) =>
            account.patch(tx, proof, item.user_id, { version: 1, ...body }, randomUUID()),
          ),
          'VALIDATION_FAILED',
        );
      await f.db.transaction((tx) =>
        service.review(tx, proof, item.id, { version: 1 }, 'rejected', randomUUID()),
      );
      await assert.rejects(
        f.db.transaction((tx) =>
          service.review(tx, proof, item.id, { version: 1 }, 'approved', randomUUID()),
        ),
        (e: unknown) =>
          !!e && typeof e === 'object' && 'code' in e && e.code === 'VERSION_CONFLICT',
      );
      await rejection(
        f.db.transaction((tx) =>
          service.review(tx, proof, item.id, { version: 2 }, 'approved', randomUUID()),
        ),
        'VERSION_CONFLICT',
      );
      await rejection(
        f.service.login({ username: input.email, password }, '127.0.0.3'),
        'INVALID_CREDENTIALS',
      );
      assert.deepEqual(await service.register(input, '127.0.0.4', randomUUID()), registrationReply);
      assert.equal((await rows(f.db, 'SELECT id FROM dbo.registrations')).length, 1);
    },
  );
  run(
    'business rows roll back with failed audit on submission and approval',
    async (f, service) => {
      const blocked: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: (work) =>
          f.db.transaction((tx) =>
            work({
              query: tx.query.bind(tx),
              execute: async (statement) => {
                if (statement.sqlite.includes('INSERT INTO admin_events'))
                  throw new Error('synthetic audit failure');
                await tx.execute(statement);
              },
            } as Transaction),
          ),
      };
      const failing = registrationService(blocked, { clock: f.clock });
      await assert.rejects(
        failing.register(input, '127.0.0.1', randomUUID()),
        /synthetic audit failure/,
      );
      assert.equal((await rows(f.db, 'SELECT id FROM dbo.users')).length, 2);
      assert.equal((await rows(f.db, 'SELECT id FROM dbo.registrations')).length, 0);
      await service.register(input, '127.0.0.2', randomUUID());
      const proof = await admin(f),
        item = (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!;
      await assert.rejects(
        blocked.transaction((tx) =>
          failing.review(tx, proof, item.id, { version: 1 }, 'approved', randomUUID()),
        ),
        /synthetic audit failure/,
      );
      assert.equal(
        (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!.version,
        1,
      );
      await rejection(
        f.service.login({ username: input.email, password }, '127.0.0.4'),
        'INVALID_CREDENTIALS',
      );
    },
  );
  run('rate limits public submissions and maintenance blocks new accounts', async (f, service) => {
    for (let i = 0; i < 10; i++) await service.register(input, '127.0.0.1', randomUUID());
    await rejection(service.register(input, '127.0.0.1', randomUUID()), 'RATE_LIMITED');
    await f.db.transaction((tx) =>
      tx.execute(
        sql(
          "INSERT INTO dbo.maintenance_state(id,owner_id,state,lease_expires_at,created_at,updated_at) VALUES(1,@owner,'frozen',@expires,@now,@now)",
          {
            owner: randomUUID(),
            expires: '2027-01-01T00:00:00.000Z',
            now: f.clock().toISOString(),
          },
        ),
      ),
    );
    await rejection(
      service.register({ ...input, email: 'Other@example.invalid' }, '127.0.0.2', randomUUID()),
      'MAINTENANCE',
    );
    assert.equal((await rows(f.db, 'SELECT id FROM dbo.registrations')).length, 1);
  });
  run(
    'version counter limits never partially approve or activate an account',
    async (f, service) => {
      await service.register(input, '127.0.0.1', randomUUID());
      const proof = await admin(f);
      const item = (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!;
      const busy = (e: unknown) =>
        !!e && typeof e === 'object' && 'code' in e && e.code === 'DATABASE_BUSY';
      for (const column of ['version', 'auth_version'] as const) {
        await f.db.transaction((tx) =>
          tx.execute(
            sql(`UPDATE dbo.users SET ${column}=2147483647 WHERE id=@id`, { id: item.user_id }),
          ),
        );
        await assert.rejects(
          f.db.transaction((tx) =>
            service.review(tx, proof, item.id, { version: 1 }, 'approved', randomUUID()),
          ),
          busy,
        );
        assert.equal(
          (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!.status,
          'pending',
        );
        assert.equal(
          (
            await rows<{ active: number }>(
              f.db,
              `SELECT active FROM dbo.users WHERE id=${item.user_id}`,
            )
          )[0]!.active,
          0,
        );
        await f.db.transaction((tx) =>
          tx.execute(sql(`UPDATE dbo.users SET ${column}=1 WHERE id=@id`, { id: item.user_id })),
        );
      }
      assert.equal(
        (await rows(f.db, "SELECT id FROM dbo.admin_events WHERE action='registration_approved'"))
          .length,
        0,
      );
    },
  );
  run(
    'contact edits preserve immutable email login and persistence after reopening',
    async (f, service) => {
      await service.register(input, '127.0.0.1', randomUUID());
      const proof = await admin(f);
      const item = (await f.db.transaction((tx) => service.list(tx, proof, {}))).items[0]!;
      await f.db.transaction((tx) =>
        service.review(tx, proof, item.id, { version: 1 }, 'approved', randomUUID()),
      );
      const account = accountService(f.db, f.service, { clock: f.clock });
      const login = await f.service.login({ username: input.email, password }, '127.0.0.3');
      await f.db.transaction((tx) =>
        account.patch(
          tx,
          proof,
          item.user_id,
          { version: 2, email: 'contact@example.invalid' },
          randomUUID(),
        ),
      );
      const self = await f.db.transaction((tx) =>
        f.service.self(tx, { userId: item.user_id, tokenHash: tokenDigest(login.token) }),
      );
      assert.equal(self.user.email, 'contact@example.invalid');
      assert.deepEqual(
        await service.register(
          { ...input, password: 'Replacement-password' },
          '127.0.0.4',
          randomUUID(),
        ),
        registrationReply,
      );
      const reopened = await f.reopen(),
        sessions = await sessionService(reopened, { clock: f.clock });
      assert.equal(
        (await sessions.login({ username: input.email, password }, '127.0.0.5')).body.user.id,
        item.user_id,
      );
      await rejection(
        sessions.login({ username: 'contact@example.invalid', password }, '127.0.0.6'),
        'INVALID_CREDENTIALS',
      );
    },
  );
}
