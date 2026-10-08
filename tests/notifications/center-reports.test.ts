import { centerReportsAcceptance } from './center-reports-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
centerReportsAcceptance('SQLite local', sqliteFixture);
