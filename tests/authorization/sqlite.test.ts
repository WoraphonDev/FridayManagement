import { sqliteFixture } from '../schema/fixtures.js';
import { authorizationAcceptance } from './provider-suite.js';
authorizationAcceptance('SQLite', sqliteFixture);
