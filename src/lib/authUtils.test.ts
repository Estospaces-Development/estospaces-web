import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getHostedLoginRedirectUrl,
    getLoginPath,
    getPostLoginRedirectPath,
    getRedirectPath,
    isPublicUserPropertyDetailPath,
    isProtectedRoutePath,
    normalizeRole,
    resolveAuthRecoveryRedirect,
    requiresHostedLoginRedirect,
    resolveLoginReturnLocation,
    resolveLoginReturnNavigationState,
    resolveProtectedRedirect,
    sanitizeInternalReturnPath,
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

test('shouldAwaitSessionResolution allows cached authenticated workspaces during refresh', () => {
    assert.equal(shouldAwaitSessionResolution(true, false), true);
    assert.equal(shouldAwaitSessionResolution(true, true), false);
    assert.equal(shouldAwaitSessionResolution(false, false), false);
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
    assert.equal(resolveLoginReturnNavigationState({ from: { state: { backTo: 'https://evil.example' } } }), undefined);
    assert.equal(resolveLoginReturnNavigationState({ from: { pathname: '/search' } }), undefined);
    assert.equal(resolveLoginReturnNavigationState(undefined), undefined);
});
