import { randomUUID } from 'node:crypto';
import { PassThrough } from 'node:stream';
import type { Request } from 'express';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { fileService } from '../../src/services/files.js';
import { receive } from './helpers.js';
import { proof, now } from '../authorization/fixtures.js';
import { sql } from '../../src/repository/access-scope.js';
const db = new SqliteDatabase(process.argv[2]!),
  root = process.argv[3]!,
  mode = process.argv[4]!,
  scale = Number(process.argv[5] ?? 1);
try {
  const s = await fileService(
    db,
    { directory: root, maxFileBytes: 10485760, totalUploadBytes: 20 * scale },
    { clock: () => new Date(now) },
  );
  const start = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await start;
  if (mode === 'receiving') {
    const input = new PassThrough();
    Object.assign(input, { headers: { 'content-type': 'multipart/form-data; boundary=crash' } });
    const pending = s.receive(input as unknown as Request, proof(1), 1);
    pending.catch(() => {});
    input.write(
      '--crash\r\nContent-Disposition: form-data; name="file"; filename="crash.txt"\r\n\r\nxxxx',
    );
    for (let i = 0; i < 100; i++) {
      const rows = await db.transaction((tx) =>
        tx.query(sql('SELECT reserved_bytes FROM dbo.upload_reservations')),
      );
      if (rows.some((r) => r.reserved_bytes === 4)) {
        process.send!('staged');
        break;
      }
      await new Promise((r) => setTimeout(r, 10));
    }
    await new Promise(() => {});
  } else {
    try {
      const p = await receive(s, proof(1), Buffer.alloc(4 * scale, 97));
      if (mode === 'finalizing') {
        process.send!('staged');
        await new Promise(() => {});
      }
      await db.transaction((tx) => s.finalize(tx, proof(1), p, randomUUID()));
      await s.release(p.id);
      process.stdout.write(JSON.stringify({ code: 'PASS' }) + '\n');
    } catch (e) {
      process.stdout.write(
        JSON.stringify({ code: e instanceof Error && 'code' in e ? String(e.code) : 'FAILED' }) +
          '\n',
      );
    }
  }
} finally {
  await db.close();
  process.disconnect();
}
