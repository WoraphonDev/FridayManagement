import { registrationAcceptance } from '../accounts/registration-suite.js';
import { sqlFixture } from '../schema/fixtures.js';
registrationAcceptance(
  'SQL Server 2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1' ? false : 'SQL Server integration not configured',
);
