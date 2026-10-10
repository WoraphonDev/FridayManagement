import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { permissionService } from '../../src/services/permissions.js';
import { taskService } from '../../src/services/tasks.js';
import { proof, now } from '../authorization/fixtures.js';
// One side of a T-081 two-process race: argv = [db path, mode].
const db = new SqliteDatabase(process.argv[2]!);
try {
  const clock = () => new Date(now);
  const permissions = permissionService({ clock }),
    tasks = taskService({ clock });
  const begin = new Promise<void>((resolve) => process.once('message', () => resolve()));
  process.send!('ready');
  await begin;
  let code = 'PASS';
  try {
    const mode = process.argv[3];
    await db.transaction<unknown>((tx) =>
      mode === 'save-a' || mode === 'save-b'
        ? permissions.put(
            tx,
            proof(1),
            2,
            { keys: mode === 'save-a' ? ['P-01'] : ['P-03'], permissions_version: 1 },
            randomUUID(),
          )
        : mode === 'revoke'
          ? permissions.put(
              tx,
              proof(1),
              2,
              { keys: ['P-01'], permissions_version: 1 },
              randomUUID(),
            )
          : tasks.trashMutation(tx, proof(2), 1, { version: 1 }, false, randomUUID()),
    );
  } catch (e) {
    code = e instanceof Error && 'code' in e ? String(e.code) : 'FAILED';
  }
  process.stdout.write(JSON.stringify({ code }) + '\n');
} finally {
  await db.close();
  process.disconnect();
}
