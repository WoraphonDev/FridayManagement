import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, HashCapacity } from '../../src/security/passwords.js';
import { canonicalIp } from '../../src/security/rate-limit.js';
import { OperationError } from '../../src/domain/failure.js';
test('actual async scrypt uses independent random salts; verifies correct password and rejects wrong/malformed cost', async () => {
  const password = 'Fixture-secret-123';
  const [first, second] = await Promise.all([hashPassword(password), hashPassword(password)]);
  assert(first !== second);
  assert(await verifyPassword(password, first));
  assert(!(await verifyPassword('Wrong-fixture-123', first)));
  assert(!(await verifyPassword(password, first.replace('$32768$', '$999999999$'))));
});
test('password policy counts Unicode scalars6/128, preserves whitespace and rejects limits before crypto', async () => {
  const p = '😀'.repeat(6);
  assert(await verifyPassword(p, await hashPassword(p)));
  for (const value of ['x'.repeat(5), '😀'.repeat(129)])
    await assert.rejects(
      hashPassword(value),
      (e: unknown) => e instanceof OperationError && e.code === 'VALIDATION_FAILED',
    );
  const spaced = '  password-fixture  ',
    encoded = await hashPassword(spaced);
  assert(await verifyPassword(spaced, encoded));
  assert(!(await verifyPassword(spaced.trim(), encoded)));
});
test('hash resource cap4 rejects excess with503 and always releases capacity', async () => {
  const gate = new HashCapacity();
  let release: () => void = () => {};
  const barrier = new Promise<void>((r) => {
    release = r;
  });
  const held = Array.from({ length: 4 }, () => gate.run(() => barrier));
  await assert.rejects(
    gate.run(async () => {}),
    (e: unknown) => e instanceof OperationError && e.code === 'DATABASE_BUSY',
  );
  release();
  await Promise.all(held);
  await assert.rejects(
    gate.run(async () => {
      throw new Error('fixture failure');
    }),
  );
  assert.equal(await gate.run(async () => true), true);
});
test('IP canonicalization unifies mapped IPv4 and equivalent IPv6 without trusting arbitrary text', () => {
  for (const ip of ['127.0.0.1', '::ffff:127.0.0.1', '::FFFF:7F00:1'])
    assert.equal(canonicalIp(ip), '127.0.0.1');
  assert.equal(canonicalIp('2001:0DB8:0:0:0:0:0:1'), canonicalIp('2001:db8::1'));
  assert.throws(() => canonicalIp('spoofed'));
});
