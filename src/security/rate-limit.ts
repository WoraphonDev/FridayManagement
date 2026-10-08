import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import type { Database } from '../domain/database.js';
import { runTransaction } from '../domain/transaction.js';
import { utcNow } from '../domain/dates.js';
import { ApiFault } from '../api/errors.js';
import { sql } from '../repository/access-scope.js';
export function canonicalIp(input: string): string {
  if (isIP(input) === 4) return input;
  if (isIP(input) !== 6) throw new ApiFault('SERVICE_NOT_READY');
  const address = new URL(`http://[${input}]/`).hostname.slice(1, -1).toLowerCase();
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(address);
  if (mapped) {
    const a = parseInt(mapped[1]!, 16),
      b = parseInt(mapped[2]!, 16);
    return `${a >>> 8}.${a & 255}.${b >>> 8}.${b & 255}`;
  }
  return address;
}
/** Attempts commit separately from business rollback; no raw IP or credential input stored. */
export async function consumeSetupAttempt(
  database: Database,
  address: string,
  clock?: () => Date,
  bucket: { kind: string; identity: string } = { kind: 'setup_ip', identity: canonicalIp(address) },
): Promise<void> {
  const hash = createHash('sha256').update(`${bucket.kind}\0${bucket.identity}`).digest('hex');
  const result = await runTransaction(database, async (tx) => {
    const now = utcNow(clock);
    const rows = await tx.query<{
      window_started_at: string;
      window_expires_at: string;
      attempts: number;
    }>({
      sqlite:
        'SELECT window_started_at,window_expires_at,attempts FROM rate_limit_buckets WHERE kind=$kind AND bucket_hash=$hash AND window_expires_at>$now ORDER BY window_started_at DESC LIMIT 1',
      sqlserver:
        'SELECT TOP(1) window_started_at,window_expires_at,attempts FROM dbo.rate_limit_buckets WITH (UPDLOCK,HOLDLOCK) WHERE kind=@kind AND bucket_hash=@hash AND window_expires_at>@now ORDER BY window_started_at DESC',
      parameters: { hash, now, kind: bucket.kind },
    });
    const row = rows[0];
    if (row && row.attempts >= 10)
      return {
        allowed: false,
        retry: Math.max(1, Math.ceil((Date.parse(row.window_expires_at) - Date.parse(now)) / 1000)),
      };
    if (row)
      await tx.execute(
        sql(
          'UPDATE dbo.rate_limit_buckets SET attempts=attempts+1 WHERE kind=@kind AND bucket_hash=@hash AND window_started_at=@start',
          { hash, kind: bucket.kind, start: row.window_started_at },
        ),
      );
    else {
      await tx.execute(
        sql(
          'DELETE FROM dbo.rate_limit_buckets WHERE kind=@kind AND bucket_hash=@hash AND window_expires_at<=@now',
          { hash, kind: bucket.kind, now },
        ),
      );
      await tx.execute(
        sql(
          'INSERT INTO dbo.rate_limit_buckets(kind,bucket_hash,window_started_at,window_expires_at,attempts) VALUES(@kind,@hash,@now,@expires,1)',
          {
            hash,
            kind: bucket.kind,
            now,
            expires: new Date(Date.parse(now) + 15 * 60000).toISOString(),
          },
        ),
      );
    }
    return { allowed: true, retry: 0 };
  });
  if (!result.allowed) throw new ApiFault('RATE_LIMITED', undefined, result.retry);
}

/** Both limits are claimed atomically, in a fixed lock order, for every allowed attempt. */
export async function consumeLoginAttempt(
  database: Database,
  username: string,
  address: string,
  clock?: () => Date,
) {
  const keys = [
    { kind: 'login_ip', value: canonicalIp(address), limit: 30 },
    { kind: 'login_username', value: username.toLowerCase(), limit: 10 },
  ].map((key) => ({
    ...key,
    hash: createHash('sha256').update(`${key.kind}\0${key.value}`).digest('hex'),
  }));
  const retry = await runTransaction(database, async (tx) => {
    const now = utcNow(clock);
    const claimed: Array<{ kind: string; hash: string; start?: string }> = [];
    let denied = 0;
    for (const key of keys) {
      const rows = await tx.query<{
        window_started_at: string;
        window_expires_at: string;
        attempts: number;
      }>({
        sqlite:
          'SELECT window_started_at,window_expires_at,attempts FROM rate_limit_buckets WHERE kind=$kind AND bucket_hash=$hash AND window_expires_at>$now ORDER BY window_started_at DESC LIMIT 1',
        sqlserver:
          'SELECT TOP(1) window_started_at,window_expires_at,attempts FROM dbo.rate_limit_buckets WITH (UPDLOCK,HOLDLOCK) WHERE kind=@kind AND bucket_hash=@hash AND window_expires_at>@now ORDER BY window_started_at DESC',
        parameters: { kind: key.kind, hash: key.hash, now },
      });
      const row = rows[0];
      if (row && row.attempts >= key.limit)
        denied = Math.max(
          denied,
          Math.max(1, Math.ceil((Date.parse(row.window_expires_at) - Date.parse(now)) / 1000)),
        );
      claimed.push({
        kind: key.kind,
        hash: key.hash,
        ...(row ? { start: row.window_started_at } : {}),
      });
    }
    if (denied) return denied;
    for (const key of claimed) {
      if (key.start)
        await tx.execute(
          sql(
            'UPDATE dbo.rate_limit_buckets SET attempts=attempts+1 WHERE kind=@kind AND bucket_hash=@hash AND window_started_at=@start',
            { kind: key.kind, hash: key.hash, start: key.start },
          ),
        );
      else {
        await tx.execute(
          sql(
            'DELETE FROM dbo.rate_limit_buckets WHERE kind=@kind AND bucket_hash=@hash AND window_expires_at<=@now',
            { kind: key.kind, hash: key.hash, now },
          ),
        );
        await tx.execute(
          sql(
            'INSERT INTO dbo.rate_limit_buckets(kind,bucket_hash,window_started_at,window_expires_at,attempts) VALUES(@kind,@hash,@now,@expires,1)',
            {
              kind: key.kind,
              hash: key.hash,
              now,
              expires: new Date(Date.parse(now) + 900000).toISOString(),
            },
          ),
        );
      }
    }
    return 0;
  });
  if (retry) throw new ApiFault('RATE_LIMITED', undefined, retry);
}
