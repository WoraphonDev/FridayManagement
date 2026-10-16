import { registrationAcceptance } from './registration-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
registrationAcceptance('SQLite', sqliteFixture);
