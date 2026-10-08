import { accountAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
accountAcceptance('SQLite', sqliteFixture);
