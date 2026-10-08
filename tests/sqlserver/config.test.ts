import test from 'node:test';
import assert from 'node:assert/strict';
import { parseConfiguration } from '../../src/config/config.js';
import { acquireSqlInstance } from '../../src/config/sql-instance.js';
import { Connection } from 'tedious';
import { openDatabase } from '../../src/repository/open.js';

test(
  'Real SQL2022 Session application guard excludes another connection, releases on close and reports held session loss',
  {
    skip:
      process.env.RUN_SQLSERVER_TESTS !== '1'
        ? 'NOT_RUN: isolated SQL2022 configuration required'
        : false,
  },
  async () => {
    assert.equal(process.env.NODE_ENV, 'test');
    assert.equal(process.env.DB_PROVIDER, 'sqlserver');
    assert.match(process.env.DB_NAME ?? '', /_test$/);
    const config = parseConfiguration(process.env).database;
    assert(config.provider === 'sqlserver');
    const database = await openDatabase('sqlserver');
    try {
      await database.transaction(async (tx) => {
        const result = await tx.query<{ version: string }>({
          sqlite: '',
          sqlserver: "SELECT CONVERT(NVARCHAR(128),SERVERPROPERTY('ProductVersion')) AS version",
        });
        assert.match(result[0]?.version ?? '', /^16\./);
      });
    } finally {
      await database.close();
    }
    let release: (() => Promise<void>) | undefined;
    try {
      release = await acquireSqlInstance(config, () => assert.fail('Unexpected SQL session loss'));
      await assert.rejects(acquireSqlInstance(config, () => undefined));
      await release();
      let connection: Connection | undefined;
      let notifyLost: () => void = () => undefined;
      const lost = new Promise<void>((resolve) => {
        notifyLost = resolve;
      });
      release = await acquireSqlInstance(config, notifyLost, (options) => {
        connection = new Connection(options);
        return connection;
      });
      assert(connection);
      connection.close();
      let timer: NodeJS.Timeout | undefined;
      try {
        await Promise.race([
          lost,
          new Promise<never>((_resolve, reject) => {
            timer = setTimeout(
              () => reject(new Error('SQL guard session loss not reported')),
              5000,
            );
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
      await release();
      release = await acquireSqlInstance(config, () => undefined);
    } finally {
      await release?.();
    }
  },
);
