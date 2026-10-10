import { taskAcceptance } from '../tasks/provider-suite.js';
import { pgFixture } from '../schema/fixtures.js';
taskAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1, DB_PROVIDER=postgres)',
);
