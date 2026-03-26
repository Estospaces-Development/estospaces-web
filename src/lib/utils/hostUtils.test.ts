import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveCurrentAppFromHostname,
    resolveHostedWorkspaceRedirect,
} from '@/lib/utils/hostUtils';

test('landing host redirects protected app routes to the app domain', () => {
    assert.equal(resolveCurrentAppFromHostname('estospaces.com'), 'landing');
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('landing', '/manager/dashboard'),
        { path: '/manager/dashboard', role: 'user' },
    );
});

test('landing host redirects admin routes to the admin domain', () => {
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('landing', '/admin/users'),
        { path: '/admin/users', role: 'admin' },
    );
});

test('app host still blocks admin routes locally', () => {
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('app', '/admin/verifications'),
        { path: '/user/dashboard', role: 'user' },
    );
});
