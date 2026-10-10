import { sqlFixture } from '../schema/fixtures.js';
import { matrixSuite } from '../permissions/matrix-suite.js';

matrixSuite(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL Server integration not configured; SQLite cannot close SQL acceptance',
);
