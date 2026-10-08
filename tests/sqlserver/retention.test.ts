import { retentionAcceptance } from '../operations/retention-suite.js';
import { sqlFixture } from '../schema/fixtures.js';
retentionAcceptance(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL2022 not configured; local SQLite cannot close SQL acceptance',
);
