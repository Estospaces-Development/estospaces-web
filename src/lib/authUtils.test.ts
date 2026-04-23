import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getHostedLoginRedirectUrl,
    getRedirectPath,
    isProtectedRoutePath,
    normalizeRole,
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

test('shouldAwaitSessionResolution blocks whenever auth is still resolving', () => {
    assert.equal(shouldAwaitSessionResolution(true, false), true);
    assert.equal(shouldAwaitSessionResolution(true, true), true);
    assert.equal(shouldAwaitSessionResolution(false, false), false);
});
