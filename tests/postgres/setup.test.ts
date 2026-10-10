import { pgFixture } from '../schema/fixtures.js';
import { setupAcceptance } from '../setup/provider-suite.js';
setupAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS !== '1' ? 'NOT_RUN: isolated PostgreSQL test database required' : false,
);
