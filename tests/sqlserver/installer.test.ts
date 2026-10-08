import { installerAcceptance } from '../admin-cli/provider-suite.js';
import { sqlFixture } from '../schema/fixtures.js';
installerAcceptance(
  'SQL2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS === '1'
    ? false
    : 'NOT_RUN: native SQL2022 installer integration required',
);
