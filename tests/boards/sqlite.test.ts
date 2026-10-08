import { boardAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
boardAcceptance('SQLite local', sqliteFixture);
