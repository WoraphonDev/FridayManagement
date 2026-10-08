import { retentionAcceptance } from './retention-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
retentionAcceptance('SQLite local', sqliteFixture);
