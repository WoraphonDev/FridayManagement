import { sqliteFixture } from '../schema/fixtures.js';
import { deliveryParentStateSuite } from './delivery-parent-state-suite.js';
deliveryParentStateSuite('SQLite', sqliteFixture);
