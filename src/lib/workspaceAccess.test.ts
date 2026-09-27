import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
    getWorkspaceRoleForPath,
    resolveRoleEquivalentPath,
    resolveWorkspaceAccess,
} from '@/lib/workspaceAccess';

const DEEP_LINKS = [
    { role: 'user', pathname: '/user/dashboard/saved', search: '' },
    { role: 'user', pathname: '/user/dashboard/bookings', search: '' },
    { role: 'user', pathname: '/user/dashboard/profile', search: '' },
    { role: 'user', pathname: '/user/dashboard/messages', search: '?conversation=conv-1' },
    { role: 'user', pathname: '/user/dashboard/fast-track', search: '?case=case-1&section=viewing' },
    { role: 'manager', pathname: '/manager/fast-track', search: '?case=case-1' },
    { role: 'manager', pathname: '/manager/dashboard/properties/property-1', search: '' },
    { role: 'manager', pathname: '/manager/dashboard/properties/edit/property-1', search: '' },
    { role: 'admin', pathname: '/admin/fast-track', search: '?case=case-1' },
] as const;

test('every deep link waits while the session is resolving, even with a cached user of any role', () => {
    for (const link of DEEP_LINKS) {
        for (const cachedRole of ['user', 'manager', 'admin', undefined]) {
            assert.deepEqual(
                resolveWorkspaceAccess({ ...link, loading: true, isAuthenticated: cachedRole !== undefined, role: cachedRole }),
                { kind: 'await-session' },
                `${link.pathname}${link.search} with cached ${cachedRole ?? 'none'}`,
            );
        }
    }
});

test('a confirmed matching session opens every deep link in place', () => {
    for (const link of DEEP_LINKS) {
        assert.deepEqual(
            resolveWorkspaceAccess({ ...link, loading: false, isAuthenticated: true, role: link.role }),
            { kind: 'allow' },
            link.pathname,
        );
    }
});

test('broker and mixed-case roles are normalized before the workspace comparison', () => {
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/fast-track', search: '?case=c', loading: false, isAuthenticated: true, role: 'broker' }),
        { kind: 'allow' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/saved', loading: false, isAuthenticated: true, role: ' User ' }),
        { kind: 'allow' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/admin/fast-track', loading: false, isAuthenticated: true, role: 'ADMIN' }),
        { kind: 'allow' },
    );
});

test('a signed-out or expired session goes to login once resolution finishes', () => {
    for (const link of DEEP_LINKS) {
        assert.deepEqual(
            resolveWorkspaceAccess({ ...link, loading: false, isAuthenticated: false }),
            { kind: 'login' },
            link.pathname,
        );
    }
});

test('a confirmed wrong role gets a truthful state instead of a dashboard redirect', () => {
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/saved', loading: false, isAuthenticated: true, role: 'manager' }),
        { kind: 'wrong-role', requiredRole: 'user', currentRole: 'manager', dashboardPath: '/manager/dashboard' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/dashboard/properties/property-1', loading: false, isAuthenticated: true, role: 'user' }),
        { kind: 'wrong-role', requiredRole: 'manager', currentRole: 'user', dashboardPath: '/user/dashboard' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/admin/verifications', loading: false, isAuthenticated: true, role: 'manager' }),
        { kind: 'wrong-role', requiredRole: 'admin', currentRole: 'manager', dashboardPath: '/manager/dashboard' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/case-file', search: '?case=c', loading: false, isAuthenticated: true, role: 'admin' }),
        { kind: 'wrong-role', requiredRole: 'user', currentRole: 'admin', dashboardPath: '/admin/dashboard' },
    );
});

test('a cross-role case or thread link is remapped to the same page for the caller, keeping its query', () => {
    // QA-MB-20260924-01-016: a manager following a /user/... case link.
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/case-file', search: '?case=case-1', loading: false, isAuthenticated: true, role: 'manager' }),
        { kind: 'redirect', to: '/manager/case-files?case=case-1' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/fast-track', search: '?case=case-1&section=viewing', hash: '#top', loading: false, isAuthenticated: true, role: 'broker' }),
        { kind: 'redirect', to: '/manager/fast-track?case=case-1&section=viewing#top' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/fast-track', search: '?case=case-1', loading: false, isAuthenticated: true, role: 'user' }),
        { kind: 'redirect', to: '/user/dashboard/fast-track?case=case-1' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/fast-track', search: '?case=case-1', loading: false, isAuthenticated: true, role: 'admin' }),
        { kind: 'redirect', to: '/admin/fast-track?case=case-1' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/messages', search: '?conversation=conv-1', loading: false, isAuthenticated: true, role: 'user' }),
        { kind: 'redirect', to: '/user/dashboard/messages?conversation=conv-1' },
    );
    assert.equal(resolveRoleEquivalentPath('/user/applications', '?application=a', '', 'manager'), '/manager/applications?application=a');
    assert.equal(resolveRoleEquivalentPath('/user/dashboard/viewings', '', '', 'manager'), '/manager/appointments');
    assert.equal(resolveRoleEquivalentPath('/user/dashboard/saved', '', '', 'manager'), null);
    assert.equal(resolveRoleEquivalentPath('/user/dashboard/messages', '', '', 'admin'), null);
});

test('launch-hidden routes keep their existing same-role redirect', () => {
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/dashboard/payments', loading: false, isAuthenticated: true, role: 'user' }),
        { kind: 'redirect', to: '/user/dashboard/contracts' },
    );
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/manager/billing', loading: false, isAuthenticated: true, role: 'manager' }),
        { kind: 'redirect', to: '/manager/contracts' },
    );
});

test('public and non-workspace routes are never gated', () => {
    assert.equal(getWorkspaceRoleForPath('/user/properties/property-1'), null);
    assert.equal(getWorkspaceRoleForPath('/search'), null);
    assert.equal(getWorkspaceRoleForPath('/users'), null);
    assert.deepEqual(
        resolveWorkspaceAccess({ pathname: '/user/properties/property-1', loading: true, isAuthenticated: false }),
        { kind: 'allow' },
    );
});

test('workspace layouts normalize the role and never bounce a confirmed wrong role to a dashboard', () => {
    for (const layout of ['UserLayoutClient', 'ManagerLayoutClient', 'AdminLayoutClient']) {
        const source = readFileSync(resolve('src/components/layout', `${layout}.tsx`), 'utf8');
        assert.match(source, /normalizeRole\(user\?\.role\)/, `${layout} normalizes the role`);
        assert.match(source, /<WrongRoleNotice /, `${layout} renders the wrong-role state`);
        assert.doesNotMatch(source, /getRedirectPath/, `${layout} does not redirect to a role dashboard`);
        assert.match(source, /shouldAwaitSessionResolution\(loading\)/, `${layout} waits on the session`);
    }
});
