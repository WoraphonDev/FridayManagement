import { randomUUID } from 'node:crypto';
import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { workspaceService } from '../../src/services/workspaces.js';
import { proof, now } from '../authorization/fixtures.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  const service = workspaceService({ clock: () => new Date(now) });
  const begin = new Promise<void>((resolve) => process.once('message', () => resolve()));
  process.send!('ready');
  await begin;
  let code = 'PASS';
  try {
    await db.transaction<unknown>((tx) =>
      process.argv[3] === 'delete'
        ? service.projectMember(tx, proof(1), 1, 2, { version: 1 }, true, randomUUID())
        : process.argv[3] === 'viewer'
          ? service.projectMember(
              tx,
              proof(1),
              1,
              2,
              { version: 1, access: 'viewer' },
              false,
              randomUUID(),
            )
          : process.argv[3] === 'archive'
            ? service.patchTeam(tx, proof(1), 3, { version: 1, archived: true }, randomUUID())
            : service.createProject(
                tx,
                proof(1),
                { owner_team_id: 3, name: 'Race project' },
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
