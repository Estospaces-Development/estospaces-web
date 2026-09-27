import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

import { PENDING_GUEST_ACTION_STORAGE_KEY } from '@/lib/pendingGuestAction';

type SeenLocation = { pathname: string; search: string; state: unknown };

const pagePath = fileURLToPath(new URL('./page.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(pagePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

const continueAfterLogin = async (
    role: string,
    entry: { pathname: string; search?: string; state?: unknown },
    pendingAction?: Record<string, unknown>,
) => {
    const window = new Window({ url: `http://localhost:3000${entry.pathname}${entry.search || ''}` });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node, sessionStorage: window.sessionStorage,
        IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const seen: SeenLocation[] = [];
    if (pendingAction) {
        window.sessionStorage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify(pendingAction));
    }
    const require = createRequire(import.meta.url);
    const boundaries: Record<string, unknown> = {
        '@/contexts/AuthContext': {
            useAuth: () => ({
                isAuthenticated: true,
                loading: false,
                getRole: () => role,
                login: async () => ({ success: true, role }),
                signOut: async () => undefined,
                user: { id: 'qa', email: 'qa@example.test', role },
                hasRoleConflict: () => false,
                getExistingRole: () => null,
            }),
        },
    };
    const module = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => boundaries[id] ?? require(id.startsWith('@/')
        ? resolve(process.cwd(), 'src', id.slice(2)) : id.startsWith('.') ? resolve(dirname(pagePath), id) : id);
    new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
    const Probe = () => {
        const location = useLocation();
        seen.push({ pathname: location.pathname, search: location.search, state: location.state });
        return null;
    };
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    try {
        await act(async () => root.render(<MemoryRouter initialEntries={[{ pathname: entry.pathname, search: entry.search || '', state: entry.state }]}>
            <Routes>
                <Route path="/login" element={<module.exports.default />} />
                <Route path="*" element={<Probe />} />
            </Routes>
        </MemoryRouter>));
        const button = Array.from(container.querySelectorAll('button'))
            .find((candidate) => /Continue to Dashboard/.test(candidate.textContent || ''));
        assert.ok(button);
        await act(async () => { (button as unknown as HTMLButtonElement).click(); });
        return Object.assign({}, seen.at(-1), {
            storedAction: window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY),
        });
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
};

test('login returns a seeker to the property they started from, keeping its search back target', async () => {
    const landed = await continueAfterLogin('user', {
        pathname: '/login',
        state: { from: {
            pathname: '/user/properties/prop-1', search: '', hash: '',
            state: { backTo: '/search?page=2', backLabel: 'Back to Search' },
        } },
    });
    assert.equal(landed?.pathname, '/user/properties/prop-1');
    assert.deepEqual(landed?.state, { backTo: '/search?page=2', backLabel: 'Back to Search' });
});

test('login honours a validated ?redirect= search return path', async () => {
    const landed = await continueAfterLogin('user', {
        pathname: '/login',
        search: `?redirect=${encodeURIComponent('/search?q=London&page=2')}`,
    });
    assert.equal(landed?.pathname, '/search');
    assert.equal(landed?.search, '?q=London&page=2');
});

test('login ignores an external ?redirect= target and uses the role dashboard', async () => {
    const landed = await continueAfterLogin('user', {
        pathname: '/login',
        search: `?redirect=${encodeURIComponent('//evil.example/search')}`,
    });
    assert.equal(landed?.pathname, '/user/dashboard');
    assert.equal(landed?.state, null);
});

test('login does not send a manager to a public seeker return path', async () => {
    const landed = await continueAfterLogin('manager', {
        pathname: '/login',
        state: { from: { pathname: '/user/properties/prop-1', search: '', hash: '' } },
    });
    assert.equal(landed?.pathname, '/manager/dashboard');
});

const HANDOFF_NONCE = '01234567-89ab-4cde-8f01-23456789abcd';
const pendingAction = {
    type: 'save', origin: 'property', propertyId: 'prop-1', nonce: HANDOFF_NONCE,
    returnPath: '/user/properties/prop-1', createdAt: Date.now(),
};
const handoffState = { from: {
    pathname: '/user/properties/prop-1', search: '', hash: '',
    state: { backTo: '/search?page=2', pendingActionNonce: HANDOFF_NONCE },
} };

test('a seeker completing the guest handoff keeps the pending action and receives its nonce', async () => {
    const landed = await continueAfterLogin('user', { pathname: '/login', state: handoffState }, pendingAction);
    assert.equal(landed?.pathname, '/user/properties/prop-1');
    assert.deepEqual(landed?.state, { backTo: '/search?page=2', pendingActionNonce: HANDOFF_NONCE });
    assert.ok(landed?.storedAction, 'pending action is left for the property page to consume');
});

test('a manager login through the guest handoff clears the pending action and drops the nonce', async () => {
    const landed = await continueAfterLogin('manager', { pathname: '/login', state: handoffState }, pendingAction);
    assert.equal(landed?.pathname, '/manager/dashboard');
    assert.equal(landed?.storedAction, null);
    assert.equal(landed?.state, null);
});

test('an admin login clears the pending action', async () => {
    const landed = await continueAfterLogin('admin', { pathname: '/login', state: handoffState }, pendingAction);
    assert.equal(landed?.storedAction, null);
});

test('a different user signing in without the handoff clears the pending action', async () => {
    const landed = await continueAfterLogin('user', { pathname: '/login' }, pendingAction);
    assert.equal(landed?.pathname, '/user/dashboard');
    assert.equal(landed?.storedAction, null);
});

test('a seeker login returning to a protected deep link clears the pending action', async () => {
    const landed = await continueAfterLogin('user', {
        pathname: '/login',
        state: { from: { pathname: '/user/dashboard/fast-track', search: '', hash: '' } },
    }, pendingAction);
    assert.equal(landed?.pathname, '/user/dashboard/fast-track');
    assert.equal(landed?.storedAction, null);
});

test('an empty or unknown role clears the pending action even through the seeker handoff', async () => {
    for (const role of ['', 'broker-admin', 'undefined']) {
        const landed = await continueAfterLogin(role, { pathname: '/login', state: handoffState }, pendingAction);
        assert.equal(landed?.storedAction, null, `role ${JSON.stringify(role)} clears the entry`);
        assert.equal(
            (landed?.state as { pendingActionNonce?: string } | null)?.pendingActionNonce,
            undefined,
            `role ${JSON.stringify(role)} gets no nonce`,
        );
    }
});

test('the seeker handoff role check is case-insensitive for a real user role', async () => {
    const landed = await continueAfterLogin(' User ', { pathname: '/login', state: handoffState }, pendingAction);
    assert.ok(landed?.storedAction);
});
