import { SqliteDatabase } from '../../src/repository/sqlite/database.js';
import type { Database } from '../../src/domain/database.js';
import { sessionService } from '../../src/services/sessions.js';
import { consumeLoginAttempt } from '../../src/security/rate-limit.js';
import { ApiFault } from '../../src/api/errors.js';
import { password, time } from './fixtures.js';
const db = new SqliteDatabase(process.argv[2]!),
  mode = process.argv[3]!;
try {
  if (mode === 'rate') {
    const start = new Promise<void>((r) => process.once('message', () => r()));
    process.send!('ready');
    await start;
    let allowed = 0,
      limited = 0;
    for (let i = 0; i < 10; i++) {
      try {
        await consumeLoginAttempt(db, 'ADMIN', `127.0.0.${process.argv[4]!}`, () => new Date(time));
        allowed++;
      } catch (e) {
        if (e instanceof ApiFault && e.code === 'RATE_LIMITED') limited++;
        else throw e;
      }
    }
    process.stdout.write(JSON.stringify({ allowed, limited }) + '\n');
  } else {
    const wrapper: Database = {
      provider: 'sqlite',
      close: () => db.close(),
      transaction: async (work) => {
        const result = await db.transaction(work);
        if (result && typeof result === 'object' && 'password_hash' in result) {
          const release = new Promise<void>((r) => process.once('message', () => r()));
          process.send!('captured');
          await release;
        }
        return result;
      },
    };
    const service = await sessionService(wrapper, { clock: () => new Date(time) });
    try {
      await service.login({ username: 'Admin', password }, '127.0.0.1');
      process.stdout.write('{"status":200}\n');
    } catch (e) {
      if (e instanceof ApiFault && e.code === 'INVALID_CREDENTIALS')
        process.stdout.write('{"status":401}\n');
      else throw e;
    }
  }
} finally {
  await db.close();
  process.disconnect();
}
