import { journeyAcceptance } from '../regression/journeys-suite.js';
import { regressionAcceptance } from '../regression/provider-suite.js';
import { sqlFixture } from '../schema/fixtures.js';
regressionAcceptance(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL2022 not configured; SQLite cannot close SQL acceptance',
);

journeyAcceptance(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'Native SQL2022 not configured; SQLite cannot close SQL acceptance',
);
