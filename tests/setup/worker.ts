import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import { setupService } from '../../src/services/setup.js';
import { input, time } from './provider-suite.js';
import { ApiFault } from '../../src/api/errors.js';
import { randomUUID } from 'node:crypto';
const db = new SqliteDatabase(process.argv[2]!);
let token = '';
try {
  const service = await setupService(db, {
    announceToken: (t) => {
      token = t;
    },
    clock: () => new Date(time),
  });
  const start = new Promise<void>((r) => process.once('message', () => r()));
  process.send!('ready');
  await start;
  try {
    await service.create(input(token, `Fixture${process.argv[3]}`), '127.0.0.1', randomUUID());
    process.stdout.write('{"status":201}\n');
  } catch (e) {
    if (e instanceof ApiFault && e.code === 'SETUP_ALREADY_COMPLETED')
      process.stdout.write('{"status":409}\n');
    else throw e;
  }
  service.dispose();
} finally {
  await db.close();
  process.disconnect();
}
