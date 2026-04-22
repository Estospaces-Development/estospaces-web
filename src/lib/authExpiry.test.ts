import assert from 'node:assert/strict';
import test from 'node:test';
import {
    handleUnauthorizedSession,
    resetAuthExpiryState,
    syncAuthExpiryState,
} from './authExpiry';

test('unauthorized session handling suppresses duplicate 401s after the token is cleared', () => {
    resetAuthExpiryState();

    let expireCount = 0;
    const firstResult = handleUnauthorizedSession({
        isBrowser: true,
        isAuthEndpoint: false,
        token: 'token-a',
        onExpire: () => {
            expireCount += 1;
        },
    });

    const secondResult = handleUnauthorizedSession({
        isBrowser: true,
        isAuthEndpoint: false,
        token: null,
        onExpire: () => {
            expireCount += 1;
        },
    });

    assert.equal(firstResult, true);
    assert.equal(secondResult, true);
    assert.equal(expireCount, 1);
});

test('unauthorized session handling resets cleanly for a new login token', () => {
    resetAuthExpiryState();

    handleUnauthorizedSession({
        isBrowser: true,
        isAuthEndpoint: false,
        token: 'token-a',
        onExpire: () => undefined,
    });

    syncAuthExpiryState('token-b');

    let expireCount = 0;
    const nextResult = handleUnauthorizedSession({
        isBrowser: true,
        isAuthEndpoint: false,
        token: 'token-b',
        onExpire: () => {
            expireCount += 1;
        },
    });

    assert.equal(nextResult, true);
    assert.equal(expireCount, 1);
});
