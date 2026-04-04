import assert from 'node:assert/strict';
import test from 'node:test';

import { buildApiUrl } from './apiUtils';

test('buildApiUrl keeps absolute service URLs intact', () => {
    const url = buildApiUrl('https://api.estospaces.dev', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'https://api.estospaces.dev/api/v1/leads/broker');
});

test('buildApiUrl resolves local proxy paths against the current origin fallback', () => {
    const url = buildApiUrl('/__dev_proxy/core', '/api/v1/leads/broker');

    assert.equal(url.toString(), 'http://localhost/__dev_proxy/core/api/v1/leads/broker');
});
