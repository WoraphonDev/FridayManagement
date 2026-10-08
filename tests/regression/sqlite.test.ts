import { journeyAcceptance } from './journeys-suite.js';
import { regressionAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
regressionAcceptance('SQLite local', sqliteFixture);

journeyAcceptance('SQLite local', sqliteFixture);
