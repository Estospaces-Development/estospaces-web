import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Window } from 'happy-dom';

// Reload regression tests for QA C1 (QA-MB-20260923-01-003/018/020/030/035,
// QA-MB-20260926-01-017, QA-MB-20260924-01-016). Each test mounts the real
// AuthProvider and RouteAccessBoundary as a hard reload would: the tab's token
// is already in memory, localStorage may hold cached user slots, and /auth/me
// has not answered yet.

type Role = 'user' | 'manager' | 'admin';

const USERS: Record<Role, { id: string; email: string; role: Role }> = {
    user: { id: 'user-1', email: 'qa-user@example.test', role: 'user' },
    manager: { id: 'manager-1', email: 'qa-manager@example.test', role: 'manager' },
    admin: { id: 'admin-1', email: 'qa-admin@example.test', role: 'admin' },
};

const DEEP_LINKS: ReadonlyArray<{ role: Role; url: string }> = [
    { role: 'user', url: '/user/dashboard/saved' },
    { role: 'user', url: '/user/dashboard/bookings' },
    { role: 'user', url: '/user/dashboard/profile' },
    { role: 'user', url: '/user/dashboard/messages?conversation=conv-1' },
    { role: 'user', url: '/user/dashboard/fast-track?case=case-1&section=viewing' },
    { role: 'manager', url: '/manager/fast-track?case=case-1' },
    { role: 'manager', url: '/manager/dashboard/properties/property-1' },
    { role: 'admin', url: '/admin/fast-track?case=case-1' },
];

const OTHER_ROLE: Record<Role, Role> = { user: 'manager', manager: 'user', admin: 'manager' };

const cachedSlot = (role: Role) => JSON.stringify({ ...USERS[role], name: role, isAuthenticated: true });
const binding = (role: Role) => JSON.stringify({ id: USERS[role].id, role });

type AuthModule = typeof import('@/contexts/AuthContext');
type BoundaryModule = typeof import('@/components/routing/RouteAccessBoundary');
type TokenModule = typeof import('@/lib/authToken');

interface Harness {
    window: Window;
    location: () => string;
    locationState: () => unknown;
    rolesSeen: Array<string | null>;
    pageText: () => string;
    auth: () => ReturnType<AuthModule['useAuth']>;
    respondToAuthMe: (status: number, role?: Role) => Promise<void>;
    requests: string[];
    unmount: () => Promise<void>;
}

let modules: { auth: AuthModule; boundary: BoundaryModule; token: TokenModule } | null = null;

const flush = async () => {
    for (let i = 0; i < 10; i += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
    }
};

async function mount(
    url: string,
    seed: { token?: string; local?: Record<string, string>; session?: Record<string, string> },
    options: { loginResponse?: Role } = {},
): Promise<Harness> {
    const window = new Window({ url: `https://estospaces.test${url}` });
    const globals: Record<string, unknown> = {
        window,
        document: window.document,
        navigator: window.navigator,
        HTMLElement: window.HTMLElement,
        Element: window.Element,
        Node: window.Node,
        Event: window.Event,
        localStorage: window.localStorage,
        sessionStorage: window.sessionStorage,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }

    modules ??= {
        auth: await import('@/contexts/AuthContext'),
        boundary: await import('@/components/routing/RouteAccessBoundary'),
        token: await import('@/lib/authToken'),
    };
    const { AuthProvider, useAuth } = modules.auth;
    const RouteAccessBoundary = modules.boundary.default;

    for (const [key, value] of Object.entries(seed.local || {})) window.localStorage.setItem(key, value);
    for (const [key, value] of Object.entries(seed.session || {})) window.sessionStorage.setItem(key, value);
    if (seed.token) {
        modules.token.setAuthToken(seed.token);
    } else {
        modules.token.clearAuthToken();
    }

    const originalFetch = globalThis.fetch;
    const requests: string[] = [];
    let pendingAuthMe: Array<(response: Response) => void> = [];
    const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
        const requestUrl = String(input);
        requests.push(requestUrl);
        if (requestUrl.includes('/api/v1/auth/login') && options.loginResponse) {
            return json(200, { data: { token: `token-${options.loginResponse}`, user: USERS[options.loginResponse] } });
        }
        if (requestUrl.includes('/api/v1/auth/me')) {
            return new Promise<Response>((resolve) => { pendingAuthMe.push(resolve); });
        }
        return json(200, { data: {} });
    }) as typeof fetch;

    let currentLocation = url;
    let currentState: unknown = null;
    const rolesSeen: Array<string | null> = [];
    let authValue: ReturnType<AuthModule['useAuth']> | null = null;
    const Probe = () => {
        const location = useLocation();
        const auth = useAuth();
        authValue = auth;
        currentLocation = `${location.pathname}${location.search}`;
        currentState = location.state;
        rolesSeen.push(auth.user?.role ?? null);
        return null;
    };
    const Page = () => {
        const location = useLocation();
        return <p data-page="true">{`page:${location.pathname}${location.search}`}</p>;
    };

    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root: Root = createRoot(host as unknown as HTMLElement);
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={[url]}>
                <AuthProvider>
                    <Probe />
                    <RouteAccessBoundary>
                        <Routes>
                            <Route path="*" element={<Page />} />
                        </Routes>
                    </RouteAccessBoundary>
                </AuthProvider>
            </MemoryRouter>,
        );
    });
    await act(flush);

    return {
        window,
        location: () => currentLocation,
        locationState: () => currentState,
        rolesSeen,
        requests,
        pageText: () => String(window.document.body.textContent || ''),
        auth: () => {
            assert.ok(authValue);
            return authValue;
        },
        respondToAuthMe: async (status, role) => {
            await act(async () => {
                const waiting = pendingAuthMe;
                pendingAuthMe = [];
                for (const resolve of waiting) {
                    resolve(status === 200 && role
                        ? json(200, { data: USERS[role] })
                        : json(status, { error: 'unauthorized' }));
                }
                await flush();
            });
        },
        unmount: async () => {
            await act(async () => {
                // Settle any in-flight /auth/me so no timer or request outlives the test.
                const waiting = pendingAuthMe;
                pendingAuthMe = [];
                for (const resolve of waiting) resolve(json(401, { error: 'unauthorized' }));
                await flush();
                root.unmount();
            });
            globalThis.fetch = originalFetch;
            modules?.token.clearAuthToken();
            window.localStorage.clear();
            window.sessionStorage.clear();
            for (const [key, descriptor] of descriptors) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else delete (globalThis as Record<string, unknown>)[key];
            }
            await window.happyDOM.close();
        },
    };
}

const assertStillLoading = (harness: Harness, url: string, label: string) => {
    assert.equal(harness.location(), url, `${label}: URL must not change while /auth/me is pending`);
    assert.ok(!harness.pageText().includes('page:'), `${label}: page must not render before the session is confirmed`);
    assert.ok(!harness.pageText().includes('This page is for'), `${label}: no wrong-role verdict before confirmation`);
    assert.ok(harness.window.document.querySelector('[role="status"]'), `${label}: loading state is shown`);
};

const assertOpenedInPlace = (harness: Harness, url: string, label: string) => {
    assert.equal(harness.location(), url, `${label}: URL survives reload`);
    assert.ok(harness.pageText().includes(`page:${url}`), `${label}: requested page renders`);
};

test('fresh session: reload waits for /auth/me and then opens every deep link in place', async () => {
    for (const link of DEEP_LINKS) {
        const harness = await mount(link.url, { token: `token-${link.role}` });
        try {
            assertStillLoading(harness, link.url, `fresh ${link.url}`);
            await harness.respondToAuthMe(200, link.role);
            assertOpenedInPlace(harness, link.url, `fresh ${link.url}`);
        } finally {
            await harness.unmount();
        }
    }
});

test('cached valid session: reload still waits for /auth/me before any role decision', async () => {
    for (const link of DEEP_LINKS) {
        const harness = await mount(link.url, {
            token: `token-${link.role}`,
            local: { [`esto_user:${link.role}`]: cachedSlot(link.role) },
            session: { esto_session_user: binding(link.role) },
        });
        try {
            assert.equal(harness.auth().user?.role, link.role, 'the bound cached user is used as a display hint');
            assertStillLoading(harness, link.url, `cached ${link.url}`);
            await harness.respondToAuthMe(200, link.role);
            assertOpenedInPlace(harness, link.url, `cached ${link.url}`);
        } finally {
            await harness.unmount();
        }
    }
});

test('cached other-role slot: a stale slot is never presented and never bounces the deep link', async () => {
    for (const link of DEEP_LINKS) {
        const other = OTHER_ROLE[link.role];
        const variants: Array<{ name: string; local: Record<string, string>; session?: Record<string, string> }> = [
            // Another tab (or an earlier sign-in in this profile) left only its slot.
            { name: 'unbound other-role slot', local: { [`esto_user:${other}`]: cachedSlot(other) } },
            // Legacy unscoped slot from an older build.
            { name: 'legacy unscoped slot', local: { esto_user: cachedSlot(other) } },
            // This tab is bound to its own role but another role's slot sorts first.
            {
                name: 'bound slot plus foreign slot',
                local: { [`esto_user:${other}`]: cachedSlot(other), [`esto_user:${link.role}`]: cachedSlot(link.role) },
                session: { esto_session_user: binding(link.role) },
            },
            // The binding points at a slot that another tab overwrote with a different account.
            {
                name: 'slot overwritten by another account',
                local: { [`esto_user:${link.role}`]: JSON.stringify({ ...USERS[link.role], id: 'someone-else', isAuthenticated: true }) },
                session: { esto_session_user: binding(link.role) },
            },
        ];

        for (const variant of variants) {
            const label = `${variant.name} ${link.url}`;
            const harness = await mount(link.url, { token: `token-${link.role}`, local: variant.local, session: variant.session });
            try {
                assertStillLoading(harness, link.url, label);
                await harness.respondToAuthMe(200, link.role);
                assertOpenedInPlace(harness, link.url, label);
                assert.ok(!harness.rolesSeen.includes(other), `${label}: ${other} user was never presented`);
                assert.ok(!harness.rolesSeen.some((role) => role !== null && role !== link.role), `${label}: only the confirmed role is presented`);
            } finally {
                await harness.unmount();
            }
        }
    }
});

test('expired token: reload waits, then sends the caller to login with the deep link as return target', async () => {
    for (const link of DEEP_LINKS) {
        const harness = await mount(link.url, {
            token: `expired-${link.role}`,
            local: { [`esto_user:${link.role}`]: cachedSlot(link.role) },
            session: { esto_session_user: binding(link.role) },
        });
        try {
            assertStillLoading(harness, link.url, `expired ${link.url}`);
            await harness.respondToAuthMe(401);
            assert.match(harness.location(), /^\/login\/?$/, `expired ${link.url}: login`);
            const from = (harness.locationState() as { from?: { pathname?: string; search?: string } } | null)?.from;
            assert.equal(`${from?.pathname}${from?.search}`, link.url, `expired ${link.url}: deep link kept as return target`);
            assert.ok(!harness.pageText().includes('page:/user') && !harness.pageText().includes('page:/manager') && !harness.pageText().includes('page:/admin'));
            assert.equal(harness.window.localStorage.getItem(`esto_user:${link.role}`), null, 'cached slot cleared on expiry');
            assert.equal(harness.window.sessionStorage.getItem('esto_session_user'), null, 'binding cleared on expiry');
        } finally {
            await harness.unmount();
        }
    }
});

test('confirmed wrong role shows a truthful state and keeps the URL instead of redirecting to a dashboard', async () => {
    const cases: Array<{ url: string; actual: Role; heading: string; dashboard: string }> = [
        { url: '/user/dashboard/saved', actual: 'manager', heading: 'This page is for User accounts', dashboard: 'Go to your Manager dashboard' },
        { url: '/user/dashboard/profile', actual: 'admin', heading: 'This page is for User accounts', dashboard: 'Go to your Admin dashboard' },
        { url: '/manager/dashboard/properties/property-1', actual: 'user', heading: 'This page is for Manager accounts', dashboard: 'Go to your User dashboard' },
        { url: '/admin/verifications', actual: 'manager', heading: 'This page is for Admin accounts', dashboard: 'Go to your Manager dashboard' },
    ];
    for (const item of cases) {
        const harness = await mount(item.url, { token: `token-${item.actual}` });
        try {
            await harness.respondToAuthMe(200, item.actual);
            assert.equal(harness.location(), item.url, `${item.url}: URL kept`);
            assert.ok(harness.pageText().includes(item.heading), `${item.url}: heading`);
            assert.ok(harness.pageText().includes(item.dashboard), `${item.url}: dashboard link`);
            assert.ok(!harness.pageText().includes('page:'), `${item.url}: other-role page not rendered`);
        } finally {
            await harness.unmount();
        }
    }
});

test('cross-role case link (QA-MB-20260924-01-016) is remapped to the same case in the caller workspace', async () => {
    const harness = await mount('/user/dashboard/case-file?case=case-1', { token: 'token-manager' });
    try {
        await harness.respondToAuthMe(200, 'manager');
        assertOpenedInPlace(harness, '/manager/case-files?case=case-1', 'manager case-file remap');
    } finally {
        await harness.unmount();
    }
});

test('login clears stale role slots, is not blocked by them, and binds the new user to this tab', async () => {
    const harness = await mount('/login', {
        local: { 'esto_user:manager': cachedSlot('manager'), esto_user: cachedSlot('admin') },
    }, { loginResponse: 'user' });
    try {
        assert.equal(harness.auth().getExistingRole(), null, 'stale slots without a live token are not an active session');
        let result: Awaited<ReturnType<ReturnType<AuthModule['useAuth']>['login']>> | null = null;
        await act(async () => {
            result = await harness.auth().login('qa-user@example.test', 'password-123');
        });
        assert.deepEqual(result, { success: true, role: 'user' });
        // login() re-validates through /auth/me shortly after success.
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 150)); });
        await harness.respondToAuthMe(200, 'user');
        assert.equal(harness.window.localStorage.getItem('esto_user:manager'), null);
        assert.equal(harness.window.localStorage.getItem('esto_user'), null);
        assert.ok(harness.window.localStorage.getItem('esto_user:user'));
        assert.deepEqual(JSON.parse(String(harness.window.sessionStorage.getItem('esto_session_user'))), { id: 'user-1', role: 'user' });

        await act(async () => {
            await harness.auth().signOut();
        });
        const remaining = Array.from({ length: harness.window.localStorage.length }, (_, i) => harness.window.localStorage.key(i))
            .filter((key) => key?.startsWith('esto_user'));
        assert.deepEqual(remaining, [], 'sign-out clears every cached slot');
        assert.equal(harness.window.sessionStorage.getItem('esto_session_user'), null, 'sign-out clears the binding');
    } finally {
        await harness.unmount();
    }
});
