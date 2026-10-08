import { installerAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
installerAcceptance('SQLite', sqliteFixture);
