import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { executeIdempotent } from '../../src/repository/idempotency.js';
import { authorizeOperation } from '../../src/services/authorization.js';
import { sql } from '../../src/repository/access-scope.js';
import { comment, command } from '../idempotency/provider-suite.js';
import { proof, now } from './fixtures.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  if (process.argv[3] === 'revoke') {
    process.send!('attempting-revoke');
    await db.transaction((tx) =>
      tx.execute(sql('DELETE FROM dbo.project_members WHERE user_id=4 AND project_id=1')),
    );
    process.stdout.write('{"revoked":true}\n');
  } else {
    const c = { ...command(process.argv[4]!), userId: 4, clock: () => new Date(now) };
    const reply = await executeIdempotent(db, {
      ...c,
      authorize: async (tx) => {
        await authorizeOperation(
          tx,
          proof(4),
          { method: 'POST', path: '/api/tasks/{id}/comments', params: { id: 1 } },
          { clock: () => new Date(now) },
        );
        const release = new Promise<void>((resolve) => process.once('message', () => resolve()));
        process.send!('authorized');
        await release;
      },
      mutate: (tx, input) => comment(tx, input, 4),
    });
    process.stdout.write(JSON.stringify(reply) + '\n');
  }
} finally {
  await db.close();
  process.disconnect();
}
