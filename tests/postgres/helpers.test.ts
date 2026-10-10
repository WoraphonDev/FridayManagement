import { pgFixture } from '../schema/fixtures.js';
import { helperAcceptance } from '../helpers/provider-suite.js';
helperAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS !== '1' ? 'NOT_RUN: isolated PostgreSQL test database required' : false,
);
