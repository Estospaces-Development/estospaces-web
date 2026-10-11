import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

// web-app#684: the full-screen branded loader must only cover the page once the sign-in has
// succeeded. While the request is running (and after a wrong password) the form stays in view
// and the button shows its own pending state.

// React DOM decides at load time whether the browser supports input events, so the
// DOM must exist before react-dom/client is imported for typing to reach onChange.
const window = new Window({ url: 'https://estospaces.test/login' });
for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
    localStorage: window.localStorage, sessionStorage: window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
})) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

const require = createRequire(import.meta.url);

type LoginResult = { success: boolean; error?: string; role?: string };
const stub = { finishLogin: null as null | ((result: LoginResult) => void) };

const loadLoginPage = (): React.ComponentType => {
    const compiled = ts.transpileModule(readFileSync(new URL('./page.tsx', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const componentModule = { exports: {} as { default: React.ComponentType } };
    const load = (id: string): unknown => {
        if (id === '@/contexts/AuthContext') {
            return {
                useAuth: () => ({
                    isAuthenticated: false, loading: false, user: null,
                    getRole: () => 'user', getExistingRole: () => null, hasRoleConflict: () => false,
                    signOut: async () => {},
                    login: () => new Promise<LoginResult>((done) => { stub.finishLogin = done; }),
                }),
            };
        }
        return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
    };
    new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
    return componentModule.exports.default;
};

const settle = () => act(async () => { await new Promise((done) => setTimeout(done, 0)); });

async function mountLoginPage() {
    const { createRoot } = await import('react-dom/client');
    const LoginPage = loadLoginPage();
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLElement);
    await act(async () => root.render(<MemoryRouter initialEntries={['/login']}><LoginPage /></MemoryRouter>));
    await settle();

    const type = async (id: string, text: string) => {
        const input = window.document.getElementById(id) as unknown as HTMLInputElement;
        assert.ok(input, `expected #${id}`);
        await act(async () => {
            // The prototype setter bypasses React's value tracker, as real typing does.
            const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
            assert.ok(setter, 'input value setter');
            setter.call(input, text);
            input.dispatchEvent(new window.Event('input', { bubbles: true }) as unknown as Event);
        });
    };
    return {
        fillAndSubmit: async () => {
            await type('email', 'user@example.test');
            await type('password', 'not-the-password');
            const form = window.document.querySelector('form');
            assert.ok(form, 'expected the sign-in form');
            await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
        },
        finishLogin: async (result: LoginResult) => {
            assert.ok(stub.finishLogin, 'the sign-in request must be in flight');
            await act(async () => { stub.finishLogin?.(result); });
            await settle();
        },
        // A boolean, not the element: a failed assert would try to print a happy-dom node and never finish.
        hasFullScreenLoader: () => window.document.querySelector('[data-loading-layer="global"]') !== null,
        submitButton: () => window.document.querySelector('button[type="submit"]') as unknown as HTMLButtonElement,
        alertText: () => window.document.querySelector('form [role="alert"]')?.textContent ?? '',
        unmount: async () => {
            await act(async () => root.unmount());
            host.remove();
        },
    };
}

test('while signing in the form stays visible and only the button shows it is working', async () => {
    const page = await mountLoginPage();
    try {
        await page.fillAndSubmit();
        assert.match(page.submitButton().textContent || '', /Signing in/);
        assert.equal(page.submitButton().getAttribute('aria-busy'), 'true');
        assert.equal(page.hasFullScreenLoader(), false, 'no full-screen loader while the request is running');
    } finally {
        await page.finishLogin({ success: false, error: 'cleanup' });
        await page.unmount();
    }
});

test('a wrong password never shows the full-screen loader and shows the error with the button restored', async () => {
    const page = await mountLoginPage();
    try {
        await page.fillAndSubmit();
        assert.equal(page.hasFullScreenLoader(), false, 'no loader flash before the error arrives');
        await page.finishLogin({ success: false, error: 'Invalid email or password' });

        assert.equal(page.hasFullScreenLoader(), false);
        assert.match(page.alertText(), /Invalid email or password/);
        assert.match(page.submitButton().textContent || '', /Sign In/);
        assert.equal(page.submitButton().disabled, false);
    } finally {
        await page.unmount();
    }
});

test('the full-screen loader appears once sign-in has succeeded and the user is being redirected', async () => {
    const page = await mountLoginPage();
    try {
        await page.fillAndSubmit();
        assert.equal(page.hasFullScreenLoader(), false);
        await page.finishLogin({ success: true, role: 'user' });

        assert.equal(page.hasFullScreenLoader(), true, 'the loader covers the page while redirecting');
    } finally {
        await page.unmount();
    }
});
