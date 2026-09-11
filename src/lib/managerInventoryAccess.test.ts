import assert from 'node:assert/strict';
import test from 'node:test';
import { canLoadManagerInventory } from './managerInventoryAccess';

test('unverified managers can recover their own saved drafts on inventory routes', () => {
  for (const pathname of ['/manager/dashboard/properties', '/manager/dashboard/properties/add', '/manager/dashboard/properties/edit/draft-id']) {
    assert.equal(canLoadManagerInventory(false, false, pathname), true);
  }
});

test('pending verification never enables operational or lookalike routes', () => {
  for (const pathname of ['/manager/dashboard', '/manager/leads', '/manager/fast-track', '/manager/contracts', '/manager/dashboard/properties-private', '/user/dashboard']) {
    assert.equal(canLoadManagerInventory(false, false, pathname), false);
  }
});

test('verification loading fails closed; approved managers retain inventory access', () => {
  assert.equal(canLoadManagerInventory(true, false, '/manager/dashboard/properties'), false);
  assert.equal(canLoadManagerInventory(true, true, '/manager/dashboard'), false);
  assert.equal(canLoadManagerInventory(false, true, '/manager/dashboard'), true);
});
