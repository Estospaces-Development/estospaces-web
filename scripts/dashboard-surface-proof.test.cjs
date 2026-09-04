const assert = require('node:assert/strict');
const test = require('node:test');

const { partitionExpectedNetworkErrors } = require('./dashboard-surface-proof.cjs');

test('treats the missing optional manager broker profile as an onboarding event', () => {
  const result = partitionExpectedNetworkErrors([
    '404 https://core-api.estospaces.com/api/v1/brokers/profile',
    '404 https://core-api.estospaces.com/api/v1/properties/missing',
    '500 https://core-api.estospaces.com/api/v1/brokers/profile',
  ], 'manager', 'https://core-api.estospaces.com');

  assert.deepEqual(result.expected, [
    '404 https://core-api.estospaces.com/api/v1/brokers/profile',
  ]);
  assert.deepEqual(result.unexpected, [
    '404 https://core-api.estospaces.com/api/v1/properties/missing',
    '500 https://core-api.estospaces.com/api/v1/brokers/profile',
  ]);
});

test('does not suppress a missing broker profile for non-manager roles', () => {
  const error = '404 https://core-api.estospaces.com/api/v1/brokers/profile';
  const result = partitionExpectedNetworkErrors(
    [error],
    'user',
    'https://core-api.estospaces.com',
  );

  assert.deepEqual(result.expected, []);
  assert.deepEqual(result.unexpected, [error]);
});
