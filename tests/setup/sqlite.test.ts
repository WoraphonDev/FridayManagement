import { sqliteFixture } from '../schema/fixtures.js';
import { setupAcceptance } from './provider-suite.js';
setupAcceptance('SQLite', sqliteFixture);
