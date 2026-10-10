import { pgFixture } from '../schema/fixtures.js';
import { authorizationAcceptance } from '../authorization/provider-suite.js';
authorizationAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS !== '1' ? 'NOT_RUN: isolated PostgreSQL test database required' : false,
);
