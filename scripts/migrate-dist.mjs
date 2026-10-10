// Container migration entry (no tsx): applies migrations/<DB_PROVIDER> with the built adapters.
import { openDatabase } from '../dist/server/repository/open.js';
import { migrate } from '../dist/server/repository/migrate.js';
const provider = process.env.DB_PROVIDER;
try {
  const database = await openDatabase(provider);
  try {
    console.log(JSON.stringify({ provider, applied: await migrate(database) }));
  } finally {
    await database.close();
  }
} catch {
  console.error('MIGRATION_FAILED: ตรวจ provider/configuration และสิทธิ์ฐานข้อมูล ไม่มีการ fallback');
  process.exitCode = 1;
}
