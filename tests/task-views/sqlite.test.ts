import { taskViewAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
taskViewAcceptance('SQLite local', sqliteFixture);
