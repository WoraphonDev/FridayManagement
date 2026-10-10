import { pgFixture } from '../schema/fixtures.js';
import { schemaAcceptance } from '../schema/suite.js';
schemaAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS !== '1' ? 'NOT_RUN: isolated PostgreSQL test database required' : false,
);
