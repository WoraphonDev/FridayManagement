import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { taskService } from '../../src/services/tasks.js';
import { proof, now } from '../authorization/fixtures.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  const s = taskService({ clock: () => new Date(now) }),
    mode = process.argv[3];
  const begin = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await begin;
  let code = 'PASS';
  try {
    await db.transaction<unknown>((tx) =>
      mode === 'restore' || mode === 'delete'
        ? s.trashMutation(
            tx,
            proof(1),
            1,
            { version: mode === 'restore' ? 2 : 1 },
            mode === 'restore',
            randomUUID(),
          )
        : s.patch(
            tx,
            proof(1),
            1,
            { version: 1, ...(mode === 'edit' ? { title: 'RACE' } : { status: 'done' }) },
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
