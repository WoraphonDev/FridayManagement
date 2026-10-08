import { createHash } from 'node:crypto';
import type { CookieOptions, Request } from 'express';
export const sessionCookie = 'friday_session';
export function sessionCookieOptions(secure: boolean): CookieOptions {
  return { httpOnly: true, sameSite: 'strict', secure, path: '/' };
}
/** Reject duplicates/ambiguous headers and encoded/noncanonical tokens. */
export function cookieProof(request: Pick<Request, 'rawHeaders' | 'get'>): string | null {
  const count = request.rawHeaders.filter(
    (_, i) => i % 2 === 0 && request.rawHeaders[i]!.toLowerCase() === 'cookie',
  ).length;
  if (count !== 1) return null;
  const values = (request.get('Cookie') ?? '')
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part.split('=')[0] === sessionCookie);
  if (values.length !== 1) return null;
  const match = /^friday_session=([a-f0-9]{64})$/.exec(values[0]!);
  return match ? tokenDigest(match[1]!) : null;
}
export function tokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
