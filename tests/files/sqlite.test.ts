import { fileAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
fileAcceptance('SQLite local', sqliteFixture);
