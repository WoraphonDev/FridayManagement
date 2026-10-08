import { sqlFixture } from '../schema/fixtures.js';
import { sessionAcceptance } from '../sessions/provider-suite.js';
sessionAcceptance(
  'SQL2022',
  sqlFixture,
  process.env.RUN_SQLSERVER_TESTS !== '1' ? 'NOT_RUN: isolated SQL2022 required' : false,
);
