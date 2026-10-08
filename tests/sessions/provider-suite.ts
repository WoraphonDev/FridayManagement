import test from 'node:test';
import assert from 'node:assert/strict';
import type { Fixture } from '../schema/fixtures.js';
import type { Database } from '../../src/domain/database.js';
import { sql } from '../../src/repository/access-scope.js';
import { tokenDigest } from '../../src/security/session-cookie.js';
import { consumeLoginAttempt } from '../../src/security/rate-limit.js';
import { sessionService, revokeUserSessions } from '../../src/services/sessions.js';
import { hashPassword } from '../../src/security/passwords.js';
import { currentActor } from '../../src/services/authorization.js';
import { ApiFault } from '../../src/api/errors.js';
import { OperationError } from '../../src/domain/failure.js';
import { sessionFixture, password, time, rejection } from './fixtures.js';
const login = { username: 'aDmIn', password };
export function sessionAcceptance(
  provider: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (
    name: string,
    work: (f: Awaited<ReturnType<typeof sessionFixture>>) => Promise<void>,
  ) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await sessionFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  check(
    'case-insensitive login creates independent256-bit tokens/hash-only sessions and minimal scoped Self',
    async (f) => {
      const first = await f.service.login(login, '127.0.0.1');
      const second = await f.service.login(login, '127.0.0.1');
      assert(/^[a-f0-9]{64}$/.test(first.token));
      assert(first.token !== second.token);
      assert(first.body.csrf !== second.body.csrf);
      assert.equal(first.body.user.username, 'Admin');
      assert.equal(first.body.must_change_password, false);
      assert.deepEqual(first.body.effective_summary.project_ids, [1, 2]);
      const rows = await f.db.transaction((tx) =>
        tx.query(sql('SELECT * FROM dbo.sessions ORDER BY token_hash')),
      );
      assert.equal(rows.length, 2);
      assert(
        rows.every((row) => row.token_hash !== first.token && row.token_hash !== second.token),
      );
      assert(rows.some((row) => row.token_hash === tokenDigest(first.token)));
      assert.equal(first.expires, '2026-10-06T12:00:00.000Z');
      const serialized = JSON.stringify(first.body);
      assert(!serialized.includes(first.token));
      assert(!serialized.includes(password));
      assert(!serialized.includes('password_hash'));
      const db = await f.reopen(),
        service = await sessionService(db, { clock: f.clock });
      assert.equal((await service.principal(tokenDigest(first.token)))!.id, 1);
    },
  );
  check(
    'wrong/unknown/inactive/corrupt and short CurrentPassword failures are generic; spaces are significant',
    async (f) => {
      await rejection(
        f.service.login({ ...login, password: password.trim() }, '127.0.0.1'),
        'INVALID_CREDENTIALS',
      );
      await rejection(
        f.service.login({ ...login, username: 'NoSuchUser' }, '127.0.0.1'),
        'INVALID_CREDENTIALS',
      );
      await rejection(
        f.service.login({ ...login, password: 'x' }, '127.0.0.1'),
        'INVALID_CREDENTIALS',
      );
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=1')));
      await rejection(f.service.login(login, '127.0.0.1'), 'INVALID_CREDENTIALS');
      await f.db.transaction((tx) =>
        tx.execute(
          sql("UPDATE dbo.users SET active=1,password_hash='malformed-fixture' WHERE id=1"),
        ),
      );
      await rejection(f.service.login(login, '127.0.0.1'), 'INVALID_CREDENTIALS');
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.sessions')),
          )
        )[0]!.n,
        0,
      );
    },
  );
  check(
    'strict login allowlist and scalar CurrentPassword bounds validate before attempts or hashing',
    async (f) => {
      for (const body of [
        { ...login, password: '' },
        { ...login, password: '😀'.repeat(129) },
        { ...login, username: ' Admin' },
        { ...login, user_id: 1 },
      ]) {
        await assert.rejects(
          f.service.login(body, '127.0.0.1'),
          (e: unknown) =>
            (e instanceof OperationError || e instanceof ApiFault) &&
            e.code === 'VALIDATION_FAILED',
        );
      }
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.rate_limit_buckets')),
          )
        )[0]!.n,
        0,
      );
      await rejection(
        f.service.login({ ...login, password: '😀'.repeat(128) }, '127.0.0.1'),
        'INVALID_CREDENTIALS',
      );
    },
  );
  check(
    'username limit10 ignores case/IP; successes and restart preserve limits; exact15min boundary resets',
    async (f) => {
      await f.service.login(login, '127.0.0.1');
      for (let i = 1; i < 9; i++)
        await consumeLoginAttempt(f.db, i % 2 ? 'ADMIN' : 'admin', `127.0.0.${i + 1}`, f.clock);
      await f.service.login(login, '127.0.0.20');
      await rejection(f.service.login(login, '127.0.0.21'), 'RATE_LIMITED');
      const db = await f.reopen(),
        service = await sessionService(db, { clock: f.clock });
      await rejection(service.login(login, '127.0.0.22'), 'RATE_LIMITED');
      f.setTime('2026-10-06T00:15:00.000Z');
      assert.equal((await service.login(login, '127.0.0.22')).body.user.id, 1);
    },
  );
  check(
    'IP limit30 spans usernames and successful login; mapped IPv4 shares bucket; expired buckets reset',
    async (f) => {
      for (let i = 0; i < 29; i++)
        await consumeLoginAttempt(f.db, `Nonexistent${i}`, '127.0.0.1', f.clock);
      await f.service.login(login, '::FFFF:7F00:1');
      await rejection(
        f.service.login({ ...login, username: 'Member' }, '127.0.0.1'),
        'RATE_LIMITED',
      );
      const rows = await f.db.transaction((tx) =>
        tx.query<{ attempts: number }>(
          sql("SELECT attempts FROM dbo.rate_limit_buckets WHERE kind='login_ip'"),
        ),
      );
      assert.deepEqual(rows, [{ attempts: 30 }]);
      f.setTime('2026-10-06T00:15:00.000Z');
      assert.equal((await f.service.login(login, '127.0.0.1')).body.user.id, 1);
    },
  );
  check(
    'reads do not renew idle; CSRF activity renews only before exact60min expiry',
    async (f) => {
      const session = await f.service.login(login, '127.0.0.1'),
        hash = tokenDigest(session.token),
        proof = { userId: 1, tokenHash: hash };
      f.setTime('2026-10-06T00:59:59.000Z');
      await f.db.transaction((tx) => f.service.self(tx, proof));
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query(sql('SELECT last_seen_at FROM dbo.sessions WHERE token_hash=@hash', { hash })),
          )
        )[0]!.last_seen_at,
        time,
      );
      f.setTime('2026-10-06T01:00:00.000Z');
      assert.equal(await f.service.principal(hash), null);
      await rejection(
        f.db.transaction((tx) => f.service.activity(tx, proof, session.body.csrf)),
        'UNAUTHENTICATED',
      );
      const fresh = await f.service.login(login, '127.0.0.1'),
        freshProof = { userId: 1, tokenHash: tokenDigest(fresh.token) };
      f.setTime('2026-10-06T01:59:59.000Z');
      await rejection(
        f.db.transaction((tx) => f.service.activity(tx, freshProof, 'x'.repeat(64))),
        'INVALID_CSRF',
      );
      await f.db.transaction((tx) => f.service.activity(tx, freshProof, fresh.body.csrf));
      f.setTime('2026-10-06T02:59:58.999Z');
      assert(await f.service.principal(freshProof.tokenHash));
      f.setTime('2026-10-06T02:59:59.000Z');
      assert.equal(await f.service.principal(freshProof.tokenHash), null);
    },
  );
  check(
    'activity never extends12h absolute expiry; lowered configured lifetimes and clock regression fail safely',
    async (f) => {
      const session = await f.service.login(login, '127.0.0.1'),
        hash = tokenDigest(session.token),
        proof = { userId: 1, tokenHash: hash };
      for (let minute = 59; minute < 720; minute += 59) {
        f.setTime(new Date(Date.parse(time) + minute * 60000).toISOString());
        await f.db.transaction((tx) => f.service.activity(tx, proof, session.body.csrf));
      }
      f.setTime('2026-10-06T11:59:59.999Z');
      assert(await f.service.principal(hash));
      f.setTime('2026-10-06T12:00:00.000Z');
      assert.equal(await f.service.principal(hash), null);
      const short = await sessionService(f.db, {
          clock: f.clock,
          idleMinutes: 1,
          absoluteMinutes: 2,
        }),
        newSession = await short.login(login, '127.0.0.1');
      f.setTime('2026-10-06T12:00:59.000Z');
      await f.db.transaction((tx) =>
        short.activity(
          tx,
          { userId: 1, tokenHash: tokenDigest(newSession.token) },
          newSession.body.csrf,
        ),
      );
      f.setTime('2026-10-06T12:02:00.000Z');
      assert.equal(await short.principal(tokenDigest(newSession.token)), null);
      f.setTime('2026-10-06T11:47:59.000Z');
      assert.equal(await f.service.principal(hash), null);
      await rejection(sessionService(f.db, { idleMinutes: 61 }), 'SERVICE_NOT_READY');
    },
  );
  check(
    'forced gate limits Self summaries; scoped grants are current, archived Lead survives; logout revokes one session',
    async (f) => {
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql("INSERT INTO dbo.team_members(team_id,user_id,team_role) VALUES(2,2,'member')"),
        );
        await tx.execute(
          sql(
            "INSERT INTO dbo.project_members(project_id,user_id,access,added_by) VALUES(1,2,'viewer',1)",
          ),
        );
      });
      const member = await f.service.login({ username: 'Member', password }, '127.0.0.1'),
        proof = { userId: 2, tokenHash: tokenDigest(member.token) };
      assert.deepEqual(member.body.effective_summary, { lead_team_ids: [], project_ids: [1] });
      await f.db.transaction(async (tx) => {
        await tx.execute(
          sql("UPDATE dbo.team_members SET team_role='lead' WHERE user_id=2 AND team_id=2"),
        );
        await tx.execute(sql('UPDATE dbo.teams SET archived_at=@now WHERE id=2', { now: time }));
      });
      const fresh = await f.db.transaction((tx) => f.service.self(tx, proof));
      assert.deepEqual(fresh.effective_summary, { lead_team_ids: [2], project_ids: [1, 2] });
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET must_change_password=1 WHERE id=2')),
      );
      assert((await f.service.principal(proof.tokenHash))!.mustChangePassword);
      await rejection(
        f.db.transaction((tx) => currentActor(tx, proof, false, { clock: f.clock })),
        'PASSWORD_CHANGE_REQUIRED',
      );
      assert.deepEqual(
        (await f.db.transaction((tx) => f.service.self(tx, proof))).effective_summary,
        { lead_team_ids: [], project_ids: [] },
      );
      await f.db.transaction((tx) => f.service.activity(tx, proof, member.body.csrf));
      const another = await f.service.login({ username: 'Member', password }, '127.0.0.1');
      await f.db.transaction((tx) => f.service.logout(tx, proof, member.body.csrf));
      assert.equal(await f.service.principal(proof.tokenHash), null);
      assert(await f.service.principal(tokenDigest(another.token)));
    },
  );
  check(
    'auth-version/deactivation/role/reset revocation compose atomically and rollback preserves sessions',
    async (f) => {
      const originalHash = (
        await f.db.transaction((tx) =>
          tx.query<{ password_hash: string }>(
            sql('SELECT password_hash FROM dbo.users WHERE id=1'),
          ),
        )
      )[0]!.password_hash;
      const resetHash = await hashPassword('Reset-fixture-password');
      for (const mutation of ['role', 'password', 'deactivate', 'forcedLogout']) {
        const session = await f.service.login(login, '127.0.0.1'),
          hash = tokenDigest(session.token);
        await assert.rejects(
          f.db.transaction(async (tx) => {
            await revokeUserSessions(tx, 1);
            throw new Error('fixture rollback');
          }),
        );
        assert(await f.service.principal(hash));
        await f.db.transaction(async (tx) => {
          if (mutation === 'role')
            await tx.execute(sql("UPDATE dbo.users SET org_role='member' WHERE id=1"));
          if (mutation === 'password')
            await tx.execute(
              sql('UPDATE dbo.users SET must_change_password=1,password_hash=@hash WHERE id=1', {
                hash: resetHash,
              }),
            );
          if (mutation === 'deactivate')
            await tx.execute(sql('UPDATE dbo.users SET active=0 WHERE id=1'));
          await revokeUserSessions(tx, 1);
        });
        assert.equal(await f.service.principal(hash), null);
        await f.db.transaction((tx) =>
          tx.execute(
            sql(
              "UPDATE dbo.users SET active=1,org_role='admin',must_change_password=0,password_hash=@hash WHERE id=1",
              { hash: originalHash },
            ),
          ),
        );
      }
      const live = await f.service.login(login, '127.0.0.1');
      await f.db.transaction((tx) =>
        tx.execute(sql('UPDATE dbo.users SET auth_version=auth_version+1 WHERE id=1')),
      );
      assert.equal(await f.service.principal(tokenDigest(live.token)), null);
    },
  );
  check(
    'login replaces presented old session without fixation; revocation race never creates a session',
    async (f) => {
      const first = await f.service.login(login, '127.0.0.1'),
        second = await f.service.login(login, '127.0.0.1', tokenDigest(first.token));
      assert(first.token !== second.token);
      assert.equal(await f.service.principal(tokenDigest(first.token)), null);
      let signal: () => void = () => {},
        release: () => void = () => {};
      const captured = new Promise<void>((r) => {
          signal = r;
        }),
        gate = new Promise<void>((r) => {
          release = r;
        });
      const wrapped: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: async (work) => {
          const result = await f.db.transaction(work);
          if (result && typeof result === 'object' && 'password_hash' in result) {
            signal();
            await gate;
          }
          return result;
        },
      };
      const service = await sessionService(wrapped, { clock: f.clock }),
        pending = service.login(login, '127.0.0.1');
      await captured;
      await f.db.transaction((tx) => revokeUserSessions(tx, 1));
      release();
      await rejection(pending, 'INVALID_CREDENTIALS');
      assert.equal(
        (
          await f.db.transaction((tx) =>
            tx.query<{ n: number }>(sql('SELECT COUNT(*) AS n FROM dbo.sessions')),
          )
        )[0]!.n,
        0,
      );
    },
  );
}
