import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import ts from 'typescript';

import { PENDING_GUEST_ACTION_STORAGE_KEY } from '@/lib/pendingGuestAction';

const contextPath = fileURLToPath(new URL('./AuthContext.tsx', import.meta.url));
const compiled = ts.transpileModule(readFileSync(contextPath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

test('signOut clears a pending guest action so it cannot run for the next account', async () => {
    const window = new Window({ url: 'https://estospaces.test/user/dashboard' });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node,
        sessionStorage: window.sessionStorage, localStorage: window.localStorage,
        IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const require = createRequire(import.meta.url);
    const logoutCalls: string[] = [];
    const boundaries: Record<string, unknown> = {
        '@/lib/apiUtils': {
            AUTH_EXPIRED_EVENT: 'estospaces:auth-expired',
            ApiRequestError: class ApiRequestError extends Error {},
            apiFetch: async (url: string) => { logoutCalls.push(url); return {}; },
            getErrorMessage: (error: unknown) => String(error),
            getServiceUrl: () => 'https://core.test',
        },
        '@/lib/authToken': {
            clearAuthToken: () => undefined,
            getAuthToken: () => null,
            setAuthToken: () => undefined,
        },
        '@/lib/authExpiry': { resetAuthExpiryState: () => undefined },
        '@/lib/productAnalytics': { setProductAnalyticsIdentity: () => undefined, trackProductEvent: () => undefined },
    };
    const module = { exports: {} as {
        AuthProvider: React.ComponentType<{ children: React.ReactNode }>;
        useAuth: () => { signOut: () => Promise<void> };
    } };
    const load = (id: string): unknown => boundaries[id] ?? require(id.startsWith('@/')
        ? resolve(process.cwd(), 'src', id.slice(2)) : id.startsWith('.') ? resolve(dirname(contextPath), id) : id);
    new Function('require', 'module', 'exports', compiled)(load, module, module.exports);

    let signOut: (() => Promise<void>) | null = null;
    const Probe = () => { signOut = module.exports.useAuth().signOut; return null; };
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    try {
        const { AuthProvider } = module.exports;
        await act(async () => root.render(<AuthProvider><Probe /></AuthProvider>));
        window.sessionStorage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({
            type: 'save', origin: 'search', propertyId: 'abc-1', nonce: '01234567-89ab-4cde-8f01-23456789abcd',
            returnPath: '/search', createdAt: Date.now(),
        }));
        const unrelatedKey = 'estospaces:unrelated';
        window.sessionStorage.setItem(unrelatedKey, 'kept');
        assert.ok(signOut);
        await act(async () => { await (signOut as unknown as () => Promise<void>)(); });
        assert.equal(window.sessionStorage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY), null);
        assert.equal(window.sessionStorage.getItem(unrelatedKey), 'kept');
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
});
