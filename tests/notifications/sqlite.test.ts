import { notificationAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
notificationAcceptance('SQLite local', sqliteFixture);
