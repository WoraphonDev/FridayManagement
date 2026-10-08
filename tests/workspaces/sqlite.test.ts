import { workspaceAcceptance } from './provider-suite.js';
import { sqliteFixture } from '../schema/fixtures.js';
workspaceAcceptance('SQLite local', sqliteFixture);
