import { registrationAcceptance } from '../accounts/registration-suite.js';
import { pgFixture } from '../schema/fixtures.js';
registrationAcceptance(
  'PostgreSQL 17',
  pgFixture,
  process.env.RUN_POSTGRES_TESTS === '1' ? false : 'PostgreSQL integration not configured',
);
