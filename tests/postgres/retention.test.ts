import { retentionAcceptance } from '../operations/retention-suite.js';
import { pgFixture } from '../schema/fixtures.js';
retentionAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1)',
);
