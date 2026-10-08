import type { Database } from '../domain/database.js';

/** Local synthetic scaffold fixture only; no user accounts/passwords or automatic application seed. */
export async function seedFoundationFixture(database: Database): Promise<void> {
  if (database.provider !== 'sqlite' || process.env.NODE_ENV === 'production')
    throw new Error('LOCAL_FIXTURE_ONLY');
  await database.transaction(async (transaction) => {
    await transaction.execute({
      sqlite:
        'CREATE TABLE IF NOT EXISTS foundation_sample(id INTEGER PRIMARY KEY, label TEXT NOT NULL)',
      sqlserver: '',
    });
    await transaction.execute({
      sqlite: 'INSERT OR IGNORE INTO foundation_sample(id,label) VALUES($id,$label)',
      sqlserver: '',
      parameters: { id: 1, label: 'ตัวอย่างสำหรับตรวจโครงแอปเท่านั้น' },
    });
  });
}
