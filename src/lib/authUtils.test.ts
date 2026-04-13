import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getRedirectPath,
    isProtectedRoutePath,
    normalizeRole,
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

test('shouldAwaitSessionResolution only blocks while auth is unresolved', () => {
    assert.equal(shouldAwaitSessionResolution(true, false), true);
    assert.equal(shouldAwaitSessionResolution(true, true), false);
    assert.equal(shouldAwaitSessionResolution(false, false), false);
});
