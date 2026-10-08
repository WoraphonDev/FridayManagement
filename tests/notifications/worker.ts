import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { reminderService } from '../../src/services/reminders.js';
const db = new SqliteDatabase(process.argv[2]!);
try {
  const start = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await start;
  const result = await reminderService(db, () => new Date('2026-10-06T00:00:00Z')).run();
  process.stdout.write(JSON.stringify(result) + '\n');
} finally {
  await db.close();
  process.disconnect();
}
