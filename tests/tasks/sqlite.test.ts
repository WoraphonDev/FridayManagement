import { taskAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
taskAcceptance('SQLite local', sqliteFixture);
