import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import {
  cookieProof,
  tokenDigest,
  sessionCookieOptions,
} from '../../src/security/session-cookie.js';
import { hashPassword, verifyPassword } from '../../src/security/passwords.js';
import { OperationError } from '../../src/domain/failure.js';
test('cookie proof accepts exactly one canonical session token, rejects ambiguity and uses host-only policy', () => {
  const token = 'a'.repeat(64);
  const request = (value: string, headers = ['Cookie', value]) =>
    ({ rawHeaders: headers, get: () => value }) as unknown as Request;
  assert.equal(cookieProof(request(`other=fixture; friday_session=${token}`)), tokenDigest(token));
  for (const value of [
    `friday_session=${token}; friday_session=${token}`,
    `friday_session=${'A'.repeat(64)}`,
    `friday_session=%61${token.slice(1)}`,
    `friday_session=${token}=`,
    'other=fixture',
  ])
    assert.equal(cookieProof(request(value)), null);
  assert.equal(
    cookieProof(request(`friday_session=${token}`, ['Cookie', token, 'Cookie', token])),
    null,
  );
  assert.deepEqual(sessionCookieOptions(true), {
    httpOnly: true,
    sameSite: 'strict',
    secure: true,
    path: '/',
  });
  assert.equal(sessionCookieOptions(false).secure, false);
});
test('actual shared hash/verify cap4 rejects the fifth crypto operation; scalar128 creation works, current-password1 is generic false', async () => {
  const p = '😀'.repeat(128),
    encoded = await hashPassword(p);
  assert(await verifyPassword(p, encoded));
  assert.equal(await verifyPassword('x', encoded), false);
  const jobs = [
    hashPassword(p),
    verifyPassword(p, encoded),
    hashPassword(p),
    verifyPassword(p, encoded),
  ];
  await assert.rejects(
    verifyPassword(p, encoded),
    (e: unknown) => e instanceof OperationError && e.code === 'DATABASE_BUSY',
  );
  assert.equal((await Promise.all(jobs)).length, 4);
  assert(await verifyPassword(p, encoded));
});
