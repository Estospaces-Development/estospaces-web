import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getHostedLoginRedirectUrl,
    getLoginPath,
    getRedirectPath,
    isPublicUserPropertyDetailPath,
    isProtectedRoutePath,
    normalizeRole,
    resolveAuthRecoveryRedirect,
    requiresHostedLoginRedirect,
    resolveProtectedRedirect,
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
