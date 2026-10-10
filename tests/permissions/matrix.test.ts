import { sqliteFixture } from '../schema/fixtures.js';
import { matrixSuite } from './matrix-suite.js';

matrixSuite('SQLite', sqliteFixture, false);
