import { sqliteFixture } from '../schema/fixtures.js';
import { idempotencyAcceptance } from './provider-suite.js';
idempotencyAcceptance('SQLite', sqliteFixture);
