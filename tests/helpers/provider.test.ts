import { sqliteFixture } from '../schema/fixtures.js';
import { helperAcceptance } from './provider-suite.js';
helperAcceptance('SQLite local', sqliteFixture);
