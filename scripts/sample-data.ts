import { openDatabase } from '../src/repository/open.js';
import { seedFoundationFixture } from '../src/repository/sample-data.js';

try {
  if (process.argv[2] !== '--confirm-local-fixture' || process.env.DB_PROVIDER !== 'sqlite')
    throw new Error('EXPLICIT_LOCAL_FIXTURE_REQUIRED');
  const database = await openDatabase('sqlite');
  try {
    await seedFoundationFixture(database);
    console.log('Synthetic foundation fixture created; no accounts or application tasks seeded.');
  } finally {
    await database.close();
  }
} catch {
  console.error('SAMPLE_DATA_FAILED: ต้องยืนยัน local SQLite fixture และกำหนด path นอก source');
  process.exitCode = 1;
}
