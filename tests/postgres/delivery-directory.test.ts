import test from 'node:test';
import assert from 'node:assert/strict';
import { pgFixture } from '../schema/fixtures.js';
import { statement } from '../schema/fixtures.js';
import { deliveryDirectorySuite } from '../permissions/delivery-directory-suite.js';

const skip =
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1, DB_PROVIDER=postgres)';
test('PostgreSQL 17 server for DEL-ACCESS-DIRECTORY evidence', { skip }, async (t) => {
  const f = await pgFixture();
  try {
    const [row] = await f.db.transaction((tx) =>
      tx.query<{ server_version: string }>(statement('SHOW server_version')),
    );
    t.diagnostic(`server_version=${row!.server_version}`);
    assert.match(row!.server_version, /^17\./);
  } finally {
    await f.close();
  }
});
deliveryDirectorySuite('PostgreSQL 17', pgFixture, skip);
