import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { executeIdempotent } from '../../src/repository/idempotency.js';
import { command } from './provider-suite.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  const start = new Promise<void>((resolve) => process.once('message', () => resolve()));
  process.send!('ready');
  await start;
  process.disconnect();
  const c = command(process.argv[3]!);
  process.stdout.write(
    JSON.stringify(
      await executeIdempotent(db, {
        ...c,
        mutate: async (tx, input) => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return c.mutate(tx, input);
        },
      }),
    ) + '\n',
  );
} finally {
  await db.close();
}
