import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Database } from '../../src/domain/database.js';
import { TransactionFailure, OperationError } from '../../src/domain/failure.js';
import { migrate } from '../../src/repository/migrate.js';
import { setupService } from '../../src/services/setup.js';
import { ApiFault } from '../../src/api/errors.js';
import { sql } from '../../src/repository/access-scope.js';
import { verifyPassword } from '../../src/security/passwords.js';
import type { Fixture } from '../schema/fixtures.js';
export const password = '  Fixture-password-123  ',
  time = '2026-10-06T00:00:00.000Z';
export function input(token: string, username = 'FixtureAdmin') {
  return {
    token,
    organization_name: 'Test Organization',
    username,
    display_name: ' Test Admin ',
    password,
  };
}
export async function emptyFixture(factory: (initial?: boolean) => Promise<Fixture>) {
  const f = await factory(false);
  try {
    await migrate(f.db);
    return f;
  } catch (e) {
    await f.close();
    throw e;
  }
}
export async function snapshot(db: Database) {
  return db.transaction(async (tx) => {
    const out: number[] = [];
    for (const table of [
      'users',
      'organizations',
      'admin_events',
      'user_view_revisions',
      'sessions',
      'idempotency_keys',
    ]) {
      const rows = await tx.query<{ n: number }>(sql(`SELECT COUNT(*) AS n FROM dbo.${table}`));
      out.push(rows[0]!.n);
    }
    return out;
  });
}
const rejects = (p: Promise<unknown>, code: string) =>
  assert.rejects(p, (e: unknown) => e instanceof ApiFault && e.code === code);
export function setupAcceptance(
  provider: string,
  factory: (initial?: boolean) => Promise<Fixture>,
  skip: false | string = false,
) {
  const check = (name: string, work: (f: Fixture) => Promise<void>) =>
    test(`${provider}: ${name}`, { skip }, async () => {
      const f = await emptyFixture(factory);
      try {
        await work(f);
      } finally {
        await f.close();
      }
    });
  const service = async (db: Database, clock = () => new Date(time)) => {
    let token = '';
    const api = await setupService(db, {
      clock,
      announceToken: (value) => {
        token = value;
      },
    });
    return { api, token };
  };
  check(
    'setup token is 256-bit, changes with service restart, never stored or exposed by meta',
    async (f) => {
      const first = await service(f.db),
        second = await service(f.db);
      assert(/^[a-f0-9]{64}$/.test(first.token));
      assert(first.token !== second.token);
      const meta = await second.api.meta();
      assert.deepEqual(Object.keys(meta).sort(), ['setupRequired', 'version']);
      assert.equal(meta.setupRequired, true);
      assert(!JSON.stringify(meta).includes(first.token));
      await rejects(
        second.api.create(input(first.token), '127.0.0.1', randomUUID()),
        'INVALID_SETUP_TOKEN',
      );
      assert.deepEqual(await snapshot(f.db), [0, 0, 0, 0, 0, 0]);
    },
  );
  check(
    'valid setup creates one active Admin/organization/audit/revision; scrypt salt/cost/no-trim; safe DTO',
    async (f) => {
      const { api, token } = await service(f.db);
      const reply = await api.create(input(token), '127.0.0.1', randomUUID());
      assert.equal(reply.item.org_role, 'admin');
      assert.equal(reply.item.active, true);
      assert.equal(reply.item.must_change_password, false);
      assert.equal(reply.item.display_name, 'Test Admin');
      const serialized = JSON.stringify(reply);
      assert(!serialized.includes(password));
      assert(!serialized.includes(token));
      assert(!serialized.includes('password_hash'));
      assert.deepEqual(await snapshot(f.db), [1, 1, 1, 1, 0, 0]);
      await f.db.transaction(async (tx) => {
        const users = await tx.query<{ password_hash: string }>(
          sql('SELECT password_hash FROM dbo.users'),
        );
        assert(users[0]!.password_hash.startsWith('scrypt$32768$8$1$64$'));
        assert(await verifyPassword(password, users[0]!.password_hash));
        assert(!(await verifyPassword(password.trim(), users[0]!.password_hash)));
        const events = await tx.query<{ redacted_changes: string }>(
          sql('SELECT redacted_changes FROM dbo.admin_events'),
        );
        assert.deepEqual(JSON.parse(events[0]!.redacted_changes), {
          initial_admin_id: reply.item.id,
        });
      });
      const reopened = await f.reopen();
      let emitted = false;
      const next = await setupService(reopened, {
        announceToken: () => {
          emitted = true;
        },
      });
      assert.equal(emitted, false);
      assert.equal((await next.meta()).setupRequired, false);
    },
  );
  check(
    'wrong token403 and strict field/password rules reject without business rows; configured setup409 even wrong token',
    async (f) => {
      const { api, token } = await service(f.db);
      await rejects(
        api.create(input('x'.repeat(64)), '127.0.0.1', randomUUID()),
        'INVALID_SETUP_TOKEN',
      );
      for (const body of [
        { ...input(token), password: 'short' },
        { ...input(token), org_role: 'admin' },
        { ...input(token), username: 'invalid space' },
        { ...input(token), organization_name: ' ' },
      ])
        await rejects(api.create(body, '127.0.0.1', randomUUID()), 'VALIDATION_FAILED');
      assert.deepEqual(await snapshot(f.db), [0, 0, 0, 0, 0, 0]);
      await api.create(input(token), '127.0.0.1', randomUUID());
      await rejects(
        api.create(input('x'.repeat(64)), '127.0.0.1', randomUUID()),
        'SETUP_ALREADY_COMPLETED',
      );
      await f.db.transaction((tx) => tx.execute(sql('UPDATE dbo.users SET active=0')));
      assert.equal((await api.meta()).setupRequired, false);
    },
  );
  check(
    'audit failure rolls back organization/user/revision; rate attempts survive business rollback',
    async (f) => {
      const injected: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: (work) =>
          f.db.transaction((tx) =>
            work({
              query: (s) => tx.query(s),
              execute: async (s) => {
                if (s.sqlite.includes('INSERT INTO admin_events'))
                  throw new Error('injected audit failure');
                await tx.execute(s);
              },
            }),
          ),
      };
      const { api, token } = await service(injected);
      await assert.rejects(api.create(input(token), '127.0.0.1', randomUUID()));
      assert.deepEqual(await snapshot(f.db), [0, 0, 0, 0, 0, 0]);
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ attempts: number }>(
          sql('SELECT attempts FROM dbo.rate_limit_buckets'),
        );
        assert.equal(rows[0]!.attempts, 1);
      });
    },
  );
  check('parallel setup commands create exactly one complete set and the loser409', async (f) => {
    const { api, token } = await service(f.db);
    const results = await Promise.allSettled([
      api.create(input(token), '127.0.0.1', randomUUID()),
      api.create(input(token, 'OtherAdmin'), '127.0.0.2', randomUUID()),
    ]);
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1);
    const failure = results.find((r) => r.status === 'rejected');
    assert(
      failure?.status === 'rejected' &&
        failure.reason instanceof ApiFault &&
        failure.reason.code === 'SETUP_ALREADY_COMPLETED',
    );
    assert.deepEqual(await snapshot(f.db), [1, 1, 1, 1, 0, 0]);
  });
  check(
    'persisted setup IP limit10/15min survives restart; equivalent mapped IPv4 buckets match; cutoff resets',
    async (f) => {
      let now = new Date(time);
      const { api } = await service(f.db, () => now);
      for (let i = 0; i < 10; i++)
        await rejects(
          api.create(input('x'.repeat(64)), i % 2 ? '::ffff:7f00:1' : '127.0.0.1', randomUUID()),
          'INVALID_SETUP_TOKEN',
        );
      const second = await service(f.db, () => now);
      await rejects(
        second.api.create(input(second.token), '::ffff:127.0.0.1', randomUUID()),
        'RATE_LIMITED',
      );
      now = new Date('2026-10-06T00:15:00.000Z');
      await rejects(
        second.api.create(input('x'.repeat(64)), '127.0.0.1', randomUUID()),
        'INVALID_SETUP_TOKEN',
      );
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ attempts: number; bucket_hash: string }>(
          sql('SELECT attempts,bucket_hash FROM dbo.rate_limit_buckets'),
        );
        assert.equal(rows.length, 1);
        assert.equal(rows[0]!.attempts, 1);
        assert(/^[a-f0-9]{64}$/.test(rows[0]!.bucket_hash));
      });
    },
  );
  check(
    'pre-existing organization without accounts updated atomically rather than duplicated',
    async (f) => {
      await f.db.transaction((tx) =>
        tx.execute(sql("INSERT INTO dbo.organizations(id,name) VALUES(1,'preconfigured')")),
      );
      const { api, token } = await service(f.db);
      await api.create(input(token), '127.0.0.1', randomUUID());
      assert.deepEqual(await snapshot(f.db), [1, 1, 1, 1, 0, 0]);
      await f.db.transaction(async (tx) => {
        const rows = await tx.query<{ name: string; version: number }>(
          sql('SELECT name,version FROM dbo.organizations'),
        );
        assert.equal(rows[0]!.name, 'Test Organization');
        assert.equal(rows[0]!.version, 2);
      });
    },
  );
  check(
    'simulated lost commit acknowledgement returns busy; authoritative meta false and further setup409',
    async (f) => {
      const uncertain: Database = {
        provider: f.db.provider,
        close: () => f.db.close(),
        transaction: async (work) => {
          let changed = false;
          const result = await f.db.transaction((tx) =>
            work({
              execute: (s) => tx.execute(s),
              query: async (s) => {
                if (s.sqlite.includes('INSERT INTO users')) changed = true;
                return tx.query(s);
              },
            }),
          );
          if (changed)
            throw new TransactionFailure('unknown', new Error('injected lost acknowledgement'));
          return result;
        },
      };
      const { api, token } = await service(uncertain);
      await assert.rejects(
        api.create(input(token), '127.0.0.1', randomUUID()),
        (e: unknown) => e instanceof OperationError && e.code === 'DATABASE_BUSY',
      );
      assert.equal((await api.meta()).setupRequired, false);
      await rejects(api.create(input(token), '127.0.0.1', randomUUID()), 'SETUP_ALREADY_COMPLETED');
      assert.deepEqual(await snapshot(f.db), [1, 1, 1, 1, 0, 0]);
    },
  );
}
