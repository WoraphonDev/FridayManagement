import { randomUUID } from 'node:crypto';
import type { Fixture } from '../schema/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
import { hashPassword } from '../../src/security/passwords.js';
import { sessionService } from '../../src/services/sessions.js';
import { ApiFault } from '../../src/api/errors.js';
export const password = '  Session-fixture-password  ',
  time = '2026-10-06T00:00:00.000Z';
export async function sessionFixture(factory: (initial?: boolean) => Promise<Fixture>) {
  const f = await factory();
  try {
    const encoded = await hashPassword(password);
    await f.db.transaction(async (tx) => {
      await tx.execute(
        sql(
          'UPDATE dbo.users SET password_hash=@hash,must_change_password=0,created_at=@now,updated_at=@now',
          { hash: encoded, now: time },
        ),
      );
      for (const id of [1, 2])
        await tx.execute(
          sql(
            'INSERT INTO dbo.user_view_revisions(user_id,revision,updated_at) VALUES(@id,@revision,@now)',
            { id, revision: randomUUID(), now: time },
          ),
        );
    });
    let now = new Date(time);
    const clock = () => new Date(now);
    return {
      ...f,
      clock,
      setTime: (value: string) => {
        now = new Date(value);
      },
      service: await sessionService(f.db, { clock }),
    };
  } catch (e) {
    await f.close();
    throw e;
  }
}
export async function rejection(p: Promise<unknown>, code: string) {
  const assert = (await import('node:assert/strict')).default;
  await assert.rejects(p, (e: unknown) => e instanceof ApiFault && e.code === code);
}
