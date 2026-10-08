import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { sessionService } from '../../src/services/sessions.js';
import { accountService } from '../../src/services/accounts.js';
import { proof, now } from '../authorization/fixtures.js';
const db = new SqliteDatabase(process.argv[2]!);
const clock = () => new Date(now);
try {
  const a = accountService(db, await sessionService(db, { clock }), { clock });
  const start = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await start;
  const id = Number(process.argv[3]);
  let code = 'PASS';
  try {
    await db.transaction((tx) =>
      a.patch(
        tx,
        proof(id),
        id,
        process.argv[4] === 'demote'
          ? { version: 1, org_role: 'member' }
          : { version: 1, active: false },
        randomUUID(),
      ),
    );
  } catch (e) {
    code = e instanceof Error && 'code' in e ? String(e.code) : 'FAILED';
  }
  process.stdout.write(JSON.stringify({ code }) + '\n');
} finally {
  await db.close();
  process.disconnect();
}
