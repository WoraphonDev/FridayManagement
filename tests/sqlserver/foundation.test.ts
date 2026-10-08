import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openDatabase } from '../../src/repository/open.js';
import { mutateWithEffects } from '../../src/domain/atomic-effects.js';
import type { Statement } from '../../src/domain/database.js';

test(
  'Real SQL Server2022 foundation transaction/effect rollback',
  {
    skip:
      process.env.RUN_SQLSERVER_TESTS !== '1'
        ? 'NOT_RUN: explicitly configured isolated SQL2022 test database required'
        : false,
  },
  async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.DB_PROVIDER, 'sqlserver');
    assert.match(process.env.DB_NAME ?? '', /_test$/);
    const db = await openDatabase('sqlserver');
    const suffix = randomUUID().replaceAll('-', '');
    const tables = ['state', 'audit', 'notification'].map(
      (name) => `dbo.fixture_${name}_${suffix}`,
    );
    const stmt = (sqlserver: string): Statement => ({ sqlite: '', sqlserver });
    try {
      await db.transaction(async (tx) => {
        const version = await tx.query<{ version: string }>(
          stmt("SELECT CONVERT(NVARCHAR(128), SERVERPROPERTY('ProductVersion')) AS version"),
        );
        assert.match(version[0]?.version ?? '', /^16\./, 'Actual SQL Server2022 required');
      });
      await db.transaction(async (tx) => {
        for (const table of tables)
          await tx.execute(
            stmt(`CREATE TABLE ${table}(id INT PRIMARY KEY, label NVARCHAR(100) NOT NULL)`),
          );
      });
      const insert = (table: string, id: number): Statement => ({
        sqlite: '',
        sqlserver: `INSERT INTO ${table}(id,label) VALUES(@id,@label)`,
        parameters: { id, label: 'synthetic' },
      });
      await mutateWithEffects(
        db,
        async (tx) => {
          await tx.execute(insert(tables[0]!, 1));
          return 1;
        },
        (id) => tables.slice(1).map((table) => insert(table, id)),
      );
      await assert.rejects(
        mutateWithEffects(
          db,
          async (tx) => {
            await tx.execute(insert(tables[0]!, 2));
            return 2;
          },
          (id) => [insert(tables[1]!, id), insert(tables[2]!, 1)],
        ),
      );
      await db.transaction(async (tx) => {
        for (const table of tables)
          assert.deepEqual(await tx.query(stmt(`SELECT id FROM ${table}`)), [{ id: 1 }]);
      });
    } finally {
      try {
        await db.transaction(async (tx) => {
          for (const table of tables)
            await tx.execute(
              stmt(`IF OBJECT_ID(N'${table}',N'U') IS NOT NULL DROP TABLE ${table}`),
            );
        });
      } finally {
        await db.close();
      }
    }
  },
);
