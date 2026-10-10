import { journeyAcceptance } from '../regression/journeys-suite.js';
import { regressionAcceptance } from '../regression/provider-suite.js';
import { pgFixture } from '../schema/fixtures.js';
regressionAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1)',
);

journeyAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1'
    ? false
    : 'PostgreSQL integration not configured (RUN_POSTGRES_TESTS=1)',
);
