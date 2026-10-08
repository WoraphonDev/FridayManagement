import { fileAcceptance } from '../files/provider-suite.js';
import { sqlFixture } from '../schema/fixtures.js';
fileAcceptance(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL Server integration not configured; SQLite cannot close SQL acceptance',
);
