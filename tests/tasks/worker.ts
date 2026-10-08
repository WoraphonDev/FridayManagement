import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { taskService } from '../../src/services/tasks.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { proof, now } from '../authorization/fixtures.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  const s = taskService({ clock: () => new Date(now) });
  const begin = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await begin;
  let code = 'PASS';
  try {
    await db.transaction<unknown>((tx) =>
      process.argv[3] === 'untick'
        ? s.patchSubtask(
            tx,
            proof(1),
            1,
            { version: 1, task_version: 1, done: false },
            false,
            randomUUID(),
          )
        : process.argv[3] === 'demote'
          ? workspaceService({ clock: () => new Date(now) }).projectMember(
              tx,
              proof(1),
              1,
              2,
              { version: 1, access: 'viewer' },
              false,
              randomUUID(),
            )
          : s.patch(
              tx,
              proof(1),
              1,
              {
                version: 1,
                ...(process.argv[3] === 'edit' ? { title: randomUUID() } : { status: 'done' }),
              },
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
