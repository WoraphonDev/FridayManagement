import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { OperationError } from '../domain/failure.js';
/** Shared cap includes hashing and verification; no unbounded pending credential queue. */
export class HashCapacity {
  private active = 0;
  async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.active >= 4) throw new OperationError(503, 'DATABASE_BUSY', 5);
    this.active++;
    try {
      return await work();
    } finally {
      this.active--;
    }
  }
}
const capacity = new HashCapacity();
function policy(password: unknown, minimum = 6): asserts password is string {
  if (
    typeof password !== 'string' ||
    Array.from(password).length < minimum ||
    Array.from(password).length > 128
  )
    throw new OperationError(422, 'VALIDATION_FAILED');
}
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
}
export async function hashPassword(password: string): Promise<string> {
  policy(password);
  return capacity.run(async () => {
    const salt = randomBytes(16),
      key = await derive(password, salt);
    try {
      return `scrypt$32768$8$1$64$${salt.toString('hex')}$${key.toString('hex')}`;
    } finally {
      salt.fill(0);
      key.fill(0);
    }
  });
}
export function isPasswordHash(encoded: string): boolean {
  return /^scrypt\$32768\$8\$1\$64\$([a-f0-9]{32})\$([a-f0-9]{128})$/.test(encoded);
}
export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  // CurrentPassword is 1–128 scalars in the locked contract; creation remains 6–128.
  policy(password, 1);
  const match = /^scrypt\$32768\$8\$1\$64\$([a-f0-9]{32})\$([a-f0-9]{128})$/.exec(encoded);
  if (!match) return false;
  return capacity.run(async () => {
    const salt = Buffer.from(match[1]!, 'hex'),
      expected = Buffer.from(match[2]!, 'hex'),
      actual = await derive(password, salt);
    try {
      return timingSafeEqual(actual, expected);
    } finally {
      salt.fill(0);
      expected.fill(0);
      actual.fill(0);
    }
  });
}
