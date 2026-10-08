import { openDatabase } from '../src/repository/open.js';
import { migrate } from '../src/repository/migrate.js';

const provider = process.argv[2];
try {
  if (!provider || (process.env.DB_PROVIDER && process.env.DB_PROVIDER !== provider))
    throw new Error('PROVIDER_MISMATCH');
  const database = await openDatabase(provider);
  try {
    console.log(
      JSON.stringify({
        provider,
        applied: await migrate(database),
        scope: 'business schema; provider-specific acceptance recorded separately',
      }),
    );
  } finally {
    await database.close();
  }
} catch {
  console.error(
    'MIGRATION_FAILED: ตรวจ provider/configuration และสิทธิ์ฐานข้อมูล ไม่มีการ fallback',
  );
  process.exitCode = 1;
}
