import { sqliteFixture } from '../schema/fixtures.js';
import { sessionAcceptance } from './provider-suite.js';
sessionAcceptance('SQLite', sqliteFixture);
