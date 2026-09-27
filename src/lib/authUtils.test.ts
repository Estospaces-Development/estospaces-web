import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getHostedLoginRedirectUrl,
    getLoginPath,
    getPostLoginRedirectPath,
    getRedirectPath,
    MAX_RETURN_PATH_LENGTH,
    isPublicUserPropertyDetailPath,
    isProtectedRoutePath,
    normalizeRole,
    resolveAuthRecoveryRedirect,
    requiresHostedLoginRedirect,
    resolveLoginReturnLocation,
    resolveLoginReturnNavigationState,
    resolveProtectedRedirect,
    sanitizeInternalReturnPath,
    sanitizeReturnNavigationState,
    shouldAwaitSessionResolution,
} from './authUtils';

test('normalizeRole maps broker access to manager routes', () => {
    assert.equal(normalizeRole('broker'), 'manager');
    assert.equal(normalizeRole('manager'), 'manager');
    assert.equal(normalizeRole('admin'), 'admin');
    assert.equal(normalizeRole(undefined), 'user');
});

test('protected route detection covers all workspace prefixes', () => {
    assert.equal(isProtectedRoutePath('/admin/help'), true);
    assert.equal(isProtectedRoutePath('/manager/messages'), true);
    assert.equal(isProtectedRoutePath('/user/dashboard/help'), true);
    assert.equal(isProtectedRoutePath('/contact'), false);
});

test('public user property detail stays readable from signed-out search results', () => {
    assert.equal(isPublicUserPropertyDetailPath('/user/properties/property-123'), true);
    assert.equal(isPublicUserPropertyDetailPath('/user/properties/property-123/'), true);
    assert.equal(isPublicUserPropertyDetailPath('/user/dashboard/properties/property-123'), false);
    assert.equal(isProtectedRoutePath('/user/properties/property-123'), false);
    assert.equal(resolveProtectedRedirect('/user/properties/property-123', false, undefined), null);
    assert.equal(resolveProtectedRedirect('/user/properties/property-123', true, 'admin'), null);
});

test('resolveProtectedRedirect sends signed-out users to login for protected pages', () => {
    assert.equal(resolveProtectedRedirect('/manager/help', false, 'manager'), '/login');
});

test('resolveProtectedRedirect sends wrong-role users back to their own workspace', () => {
    assert.equal(resolveProtectedRedirect('/admin/help', true, 'manager'), '/manager/dashboard');
    assert.equal(resolveProtectedRedirect('/manager/messages', true, 'user'), '/user/dashboard');
    assert.equal(resolveProtectedRedirect('/user/dashboard/help', true, 'admin'), '/admin/dashboard');
});

test('resolveProtectedRedirect allows matching workspace access', () => {
    assert.equal(resolveProtectedRedirect('/manager/messages', true, 'broker'), null);
    assert.equal(resolveProtectedRedirect('/admin/help', true, 'admin'), null);
    assert.equal(resolveProtectedRedirect('/contact', true, 'user'), null);
});

test('resolveAuthRecoveryRedirect sends signed-in users away from recovery forms', () => {
    assert.equal(resolveAuthRecoveryRedirect('/forgot-password', true, 'admin'), '/admin/dashboard');
    assert.equal(resolveAuthRecoveryRedirect('/reset-password', true, 'manager'), '/manager/dashboard');
    assert.equal(resolveAuthRecoveryRedirect('/login', true, 'user'), null);
    assert.equal(resolveAuthRecoveryRedirect('/forgot-password', false, 'admin'), null);
});

test('getRedirectPath stays aligned with normalized roles', () => {
    assert.equal(getRedirectPath('broker'), '/manager/dashboard');
    assert.equal(getRedirectPath('admin'), '/admin/dashboard');
    assert.equal(getRedirectPath('user'), '/user/dashboard');
});

test('getPostLoginRedirectPath returns matching-role protected deep links', () => {
    assert.equal(
        getPostLoginRedirectPath('manager', {
            pathname: '/manager/fast-track',
            search: '?case=case-123&section=documents',
        }),
        '/manager/fast-track?case=case-123&section=documents',
    );
    assert.equal(
        getPostLoginRedirectPath('user', {
            pathname: '/user/dashboard/fast-track',
            search: '?case=case-123',
            hash: '#documents',
        }),
        '/user/dashboard/fast-track?case=case-123#documents',
    );
});

test('getPostLoginRedirectPath rejects wrong-role and public return targets', () => {
    assert.equal(
        getPostLoginRedirectPath('user', {
            pathname: '/manager/fast-track',
            search: '?case=case-123',
        }),
        '/user/dashboard',
    );
    assert.equal(
        getPostLoginRedirectPath('manager', {
            pathname: '/contact',
            search: '?case=case-123',
        }),
        '/manager/dashboard',
    );
});

test('requiresHostedLoginRedirect enforces admin login on the admin host only', () => {
    assert.equal(requiresHostedLoginRedirect('admin', 'app.estospaces.com'), true);
    assert.equal(requiresHostedLoginRedirect('admin', 'admin.estospaces.com'), false);
    assert.equal(requiresHostedLoginRedirect('manager', 'admin.estospaces.com'), true);
    assert.equal(requiresHostedLoginRedirect('user', 'app.estospaces.com'), false);
    assert.equal(requiresHostedLoginRedirect('admin', 'localhost'), false);
});

test('getHostedLoginRedirectUrl targets the correct hosted login domain', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: {
                hostname: 'app.estospaces.com',
                origin: 'https://app.estospaces.com',
            },
        },
        configurable: true,
    });

    try {
        assert.equal(getHostedLoginRedirectUrl('admin'), 'https://admin.estospaces.com/login');
        assert.equal(getHostedLoginRedirectUrl('manager'), 'https://app.estospaces.com/login');
    } finally {
        if (originalWindow === undefined) {
            delete (globalThis as { window?: Window }).window;
        } else {
            Object.defineProperty(globalThis, 'window', {
                value: originalWindow,
                configurable: true,
            });
        }
    }
});

test('login path avoids the Cloud Run reserved exact login route', () => {
    assert.equal(getLoginPath('localhost'), '/login');
    assert.equal(getLoginPath('127.0.0.1'), '/login');
    assert.equal(getLoginPath('estospaces-web-dev-zaryfkxmeq-nw.a.run.app'), '/login/');
});

test('shouldAwaitSessionResolution waits for /auth/me even when a cached user is present', () => {
    // A cached user is only a hint; role decisions made before the session is
    // confirmed were what bounced deep links to the dashboard on reload.
    assert.equal(shouldAwaitSessionResolution(true), true);
    assert.equal(shouldAwaitSessionResolution(false), false);
});

test('sanitizeInternalReturnPath accepts only internal relative paths (no open redirect)', () => {
    assert.equal(sanitizeInternalReturnPath('/search?page=2&sort=price_asc'), '/search?page=2&sort=price_asc');
    assert.equal(sanitizeInternalReturnPath('/user/properties/abc#gallery'), '/user/properties/abc#gallery');
    for (const unsafe of [
        'https://evil.example/search',
        '//evil.example/search',
        '/\\evil.example',
        '\\\\evil.example',
        '/\tevil',
        '/\nevil',
        'javascript:alert(1)',
        'search',
        '',
        '/login/',
        '/register?next=/search',
        undefined,
        { pathname: '/search' },
    ]) {
        assert.equal(sanitizeInternalReturnPath(unsafe), null, `rejects ${String(unsafe)}`);
    }
});

test('getPostLoginRedirectPath returns a seeker to the public property or search they started from', () => {
    assert.equal(
        getPostLoginRedirectPath('user', { pathname: '/user/properties/prop-1' }),
        '/user/properties/prop-1',
    );
    assert.equal(
        getPostLoginRedirectPath('user', { pathname: '/search', search: '?page=2&sort=price_asc' }),
        '/search?page=2&sort=price_asc',
    );
    assert.equal(getPostLoginRedirectPath('manager', { pathname: '/user/properties/prop-1' }), '/manager/dashboard');
    assert.equal(getPostLoginRedirectPath('admin', { pathname: '/search' }), '/admin/dashboard');
    assert.equal(getPostLoginRedirectPath('user', { pathname: '//evil.example/search' }), '/user/dashboard');
});

test('resolveLoginReturnLocation reads router state first, then a validated redirect query', () => {
    assert.deepEqual(
        resolveLoginReturnLocation({ from: { pathname: '/user/properties/prop-1', search: '', hash: '' } }, '?redirect=/search'),
        { pathname: '/user/properties/prop-1', search: '', hash: '' },
    );
    assert.deepEqual(
        resolveLoginReturnLocation(null, `?redirect=${encodeURIComponent('/search?q=London&page=2')}`),
        { pathname: '/search', search: '?q=London&page=2', hash: '' },
    );
    assert.equal(resolveLoginReturnLocation(null, `?redirect=${encodeURIComponent('https://evil.example/')}`), null);
    assert.equal(resolveLoginReturnLocation(null, `?redirect=${encodeURIComponent('//evil.example/')}`), null);
    assert.equal(resolveLoginReturnLocation({ from: 'https://evil.example/' }, ''), null);
    assert.equal(
        getPostLoginRedirectPath('user', resolveLoginReturnLocation(null, `?redirect=${encodeURIComponent('//evil.example/')}`)),
        '/user/dashboard',
    );
});

test('resolveLoginReturnNavigationState keeps only a validated internal back target', () => {
    assert.deepEqual(
        resolveLoginReturnNavigationState({ from: { state: { backTo: '/search?page=2', backLabel: 'Back to Search' } } }),
        { backTo: '/search?page=2', backLabel: 'Back to Search' },
    );
    assert.deepEqual(
        resolveLoginReturnNavigationState({ from: { state: { pendingActionNonce: '01234567-89ab-4cde-8f01-23456789abcd' } } }),
        { pendingActionNonce: '01234567-89ab-4cde-8f01-23456789abcd' },
    );
    assert.equal(resolveLoginReturnNavigationState({ from: { state: { pendingActionNonce: 'short' } } }), undefined);
    assert.equal(resolveLoginReturnNavigationState({ from: { state: { backTo: 'https://evil.example' } } }), undefined);
    assert.equal(resolveLoginReturnNavigationState({ from: { pathname: '/search' } }), undefined);
    assert.equal(resolveLoginReturnNavigationState(undefined), undefined);
});

const DOT_SEGMENT_REDIRECTS = [
    '/.//evil',
    '/..//evil',
    '/%2e//evil',
    '/%2e%2e//evil',
    '/%2E%2E//evil',
    '/search/..//evil',
    '/user/..//evil',
    '/search/../..//evil',
    '/././/evil',
    '/%2e/%2e//evil',
];

test('sanitizeInternalReturnPath rejects dot segments that normalise to a protocol-relative path', () => {
    for (const unsafe of DOT_SEGMENT_REDIRECTS) {
        assert.equal(sanitizeInternalReturnPath(unsafe), null, `rejects ${unsafe}`);
        assert.equal(sanitizeInternalReturnPath(`${unsafe}?page=2#x`), null, `rejects ${unsafe} with query`);
    }
    // Dot segments that stay same-origin are normalised, not rejected.
    assert.equal(sanitizeInternalReturnPath('/user/../search?page=2'), '/search?page=2');
});

test('dot-segment redirects never reach login, back-state or post-login targets', () => {
    for (const unsafe of DOT_SEGMENT_REDIRECTS) {
        assert.equal(resolveLoginReturnLocation(null, `?redirect=${encodeURIComponent(unsafe)}`), null, unsafe);
        assert.equal(resolveLoginReturnLocation({ from: { pathname: unsafe, search: '', hash: '' } }, ''), null, unsafe);
        assert.equal(sanitizeReturnNavigationState({ backTo: unsafe }), undefined, unsafe);
        assert.equal(getPostLoginRedirectPath('user', { pathname: unsafe }), '/user/dashboard', unsafe);
    }
});

test('sanitizeInternalReturnPath caps return paths at the maximum length', () => {
    const prefix = '/search?q=';
    const atLimit = `${prefix}${'a'.repeat(MAX_RETURN_PATH_LENGTH - prefix.length)}`;
    assert.equal(MAX_RETURN_PATH_LENGTH, 2048);
    assert.equal(sanitizeInternalReturnPath(atLimit), atLimit);
    assert.equal(sanitizeInternalReturnPath(`${atLimit}a`), null);
    // Percent-encoding growth during normalisation is also capped.
    assert.equal(sanitizeInternalReturnPath(`/search?q=${' '.repeat(1500)}x`), null);
});
