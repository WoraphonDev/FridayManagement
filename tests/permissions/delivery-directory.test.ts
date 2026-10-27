import { sqliteFixture } from '../schema/fixtures.js';
import { deliveryDirectorySuite } from './delivery-directory-suite.js';
deliveryDirectorySuite('sqlite', sqliteFixture);
