import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildHostedRedirectLocation,
    buildHostedWorkspaceUrl,
    getHostConfig,
    getPublicHomeHref,
    isExternalHref,
    isSameHostedWorkspaceUrl,
    isSingleOriginHostedHost,
    resolveCurrentAppFromHostname,
    resolveHostedWorkspaceRedirect,
    shouldBypassHostedWorkspaceRedirect,
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

test('admin host preserves login routes instead of redirecting back to the protected admin shell', () => {
    assert.equal(resolveHostedWorkspaceRedirect('admin', '/login'), null);
    assert.equal(resolveHostedWorkspaceRedirect('admin', '/login/'), null);
    assert.deepEqual(
        resolveHostedWorkspaceRedirect('admin', '/privacy'),
        { path: '/admin', role: 'admin' },
    );
});

test('cloud run dev hosts stay on the same origin for admin links', () => {
    assert.equal(isSingleOriginHostedHost('estospaces-web-dev-zaryfkxmeq-nw.a.run.app'), true);
    assert.equal(resolveCurrentAppFromHostname('estospaces-web-dev-zaryfkxmeq-nw.a.run.app'), 'app');
    assert.equal(resolveCurrentAppFromHostname('estospaces-web-prod-zaryfkxmeq-nw.a.run.app'), 'app');
    assert.equal(resolveCurrentAppFromHostname('estospaces-landing-prod-zaryfkxmeq-nw.a.run.app'), 'landing');

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: {
                hostname: 'estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
                origin: 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app',
                port: '',
            },
        },
        configurable: true,
    });

    try {
        assert.equal(
            buildHostedWorkspaceUrl('/admin/dashboard', 'admin'),
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
        );
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

test('single-origin hosted dev routes allow admin manager and user workspaces', () => {
    const hostname = 'estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

    assert.equal(shouldBypassHostedWorkspaceRedirect(hostname, '/admin/dashboard'), true);
    assert.equal(shouldBypassHostedWorkspaceRedirect(hostname, '/manager/dashboard'), true);
    assert.equal(shouldBypassHostedWorkspaceRedirect(hostname, '/user/dashboard'), true);
    assert.equal(shouldBypassHostedWorkspaceRedirect(hostname, '/'), false);
    assert.equal(shouldBypassHostedWorkspaceRedirect('app.estospaces.com', '/admin/dashboard'), false);
});

test('same-origin hosted admin redirect does not navigate to the current URL again', () => {
    assert.equal(
        isSameHostedWorkspaceUrl(
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
        ),
        true,
    );

    assert.equal(
        isSameHostedWorkspaceUrl(
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/admin/dashboard',
            'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app/login',
        ),
        false,
    );
});

test('same-path hosted redirects preserve query params and hash fragments', () => {
    assert.equal(
        buildHostedRedirectLocation(
            '/admin/verifications',
            '/admin/verifications',
            '?entity=manager&managerId=broker-123',
            '#docs',
        ),
        '/admin/verifications?entity=manager&managerId=broker-123#docs',
    );
});

test('cross-path hosted redirects drop unrelated query params', () => {
    assert.equal(
        buildHostedRedirectLocation(
            '/admin/dashboard',
            '/user/dashboard',
            '?entity=manager&managerId=broker-123',
            '#docs',
        ),
        '/admin/dashboard',
    );
});

test('localhost resolves as the app host so root boot skips the landing experience', () => {
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
        value: {
            location: {
                hostname: 'localhost',
                origin: 'http://localhost:3000',
                port: '3000',
            },
        },
        configurable: true,
    });

    try {
        assert.equal(getHostConfig().currentApp, 'app');
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

test('public home href always sends the application to the official marketing website', () => {
    assert.equal(getPublicHomeHref(), 'https://estospaces.com/');
    assert.equal(isExternalHref(getPublicHomeHref()), true);
});
