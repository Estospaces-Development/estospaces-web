const assert = require('node:assert/strict');
const test = require('node:test');

const { partitionNetworkErrors } = require('./auth-host-proof.cjs');

test('partitions only expected authorization cleanup responses for wrong-role redirects', () => {
  const result = partitionNetworkErrors([
    '401 https://core-api.estospaces.com/api/v1/auth/me',
    '401 https://core-api.estospaces.com/api/v1/properties/saved',
    '500 https://core-api.estospaces.com/api/v1/auth/me',
    '401 https://unexpected.example/api/v1/auth/me',
  ], 'https://core-api.estospaces.com');

  assert.deepEqual(result.expected, [
    '401 https://core-api.estospaces.com/api/v1/auth/me',
    '401 https://core-api.estospaces.com/api/v1/properties/saved',
  ]);
  assert.deepEqual(result.unexpected, [
    '500 https://core-api.estospaces.com/api/v1/auth/me',
    '401 https://unexpected.example/api/v1/auth/me',
  ]);
});

test('does not suppress cleanup responses unless an expected origin is supplied', () => {
  const result = partitionNetworkErrors([
    '401 https://core-api.estospaces.com/api/v1/auth/me',
  ]);

  assert.deepEqual(result.expected, []);
  assert.deepEqual(result.unexpected, [
    '401 https://core-api.estospaces.com/api/v1/auth/me',
  ]);
});
