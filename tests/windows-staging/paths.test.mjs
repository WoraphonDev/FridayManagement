import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import * as policy from '../../scripts/windows/staging-policy.mjs';
const isOutsideCheckout = (...args) => policy.isOutsideCheckout?.(...args);
test('dot-prefixed children cannot masquerade as paths outside checkout', () => {
  const root = resolve('fixture-source');
  assert.equal(isOutsideCheckout(root, resolve(root, '..private', 'service.env')), false);
  assert.equal(isOutsideCheckout(root, root), false);
  assert.equal(isOutsideCheckout(root, resolve(root, 'private', 'service.env')), false);
  assert.equal(isOutsideCheckout(root, resolve(root, '..', 'private', 'service.env')), true);
});
