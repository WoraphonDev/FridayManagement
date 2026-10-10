import { fileAcceptance } from '../files/provider-suite.js';
import { pgFixture } from '../schema/fixtures.js';
fileAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1, DB_PROVIDER=postgres)',
);
