import { workspaceAcceptance } from '../workspaces/provider-suite.js';
import { pgFixture } from '../schema/fixtures.js';
workspaceAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1, DB_PROVIDER=postgres)',
);
