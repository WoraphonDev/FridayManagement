import { sqlFixture } from '../schema/fixtures.js';
import { helperAcceptance } from '../helpers/provider-suite.js';
helperAcceptance(
  'SQL2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS !== '1' ? 'NOT_RUN: isolated SQL2022 required' : false,
);
