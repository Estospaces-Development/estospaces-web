import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

const mountSettings = async (initialEntry: string) => {
    const window = new Window({ url: 'https://estospaces.test/user/dashboard/settings' });
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
        IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    let writes = 0;
    const toast = { error() {}, success() {} };
    const boundaries: Record<string, unknown> = {
        '@/services/authService': {
            getPreferences: async () => ({ data: { preferred_city: 'Chennai' }, error: null }),
            updatePreferences: async () => { writes++; throw new Error('Navigation must not save preferences'); },
        },
        '@/contexts/ToastContext': { useToast: () => toast },
        '@/contexts/AuthContext': { useOptionalAuth: () => null },
        '@/lib/useGeoMarket': { useUserGeoMarket: () => 'IN' },
    };
    const require = createRequire(import.meta.url);
    const code = ts.transpileModule(readFileSync(new URL('./page.tsx', import.meta.url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
            esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const page = { exports: {} as { default: React.ComponentType } };
    new Function('require', 'module', 'exports', code)((id: string) => id in boundaries ? boundaries[id]
        : require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id), page, page.exports);
    const SettingsPage = page.exports.default;
    const HistoryControls = () => {
        const location = useLocation();
        const navigate = useNavigate();
        return <><output>{location.search}</output><button onClick={() => navigate(-1)}>History back</button>
            <button onClick={() => navigate(1)}>History forward</button></>;
    };
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    await act(async () => root.render(<MemoryRouter initialEntries={[initialEntry]}>
        <SettingsPage /><HistoryControls />
    </MemoryRouter>));
    const button = (label: string) => {
        const result = [...host.querySelectorAll('button')].find(item => item.textContent?.trim() === label);
        assert.ok(result, `Missing button: ${label}`);
        return result;
    };
    return {
        host, button, writes: () => writes,
        click: async (label: string) => { await act(async () => button(label).click()); },
        dispose: async () => {
            await act(async () => root.unmount());
            await window.happyDOM.close();
            for (const [key, descriptor] of descriptors) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
        },
    };
};

test('location-settings deep link opens actual Search controls on initial load and remount', async () => {
    for (let load = 0; load < 2; load++) {
        const ui = await mountSettings('/user/dashboard/settings?tab=search');
        try {
            assert.equal(ui.button('Search').getAttribute('aria-pressed'), 'true');
            assert.match(ui.host.textContent || '', /Preferred City/);
            assert.equal(ui.writes(), 0);
        } finally { await ui.dispose(); }
    }
});

test('settings tabs follow history and preserve unrelated URL parameters without saving', async () => {
    const ui = await mountSettings('/user/dashboard/settings?tab=search&source=map');
    try {
        await ui.click('Alerts');
        assert.equal(ui.button('Alerts').getAttribute('aria-pressed'), 'true');
        assert.equal(ui.host.querySelector('output')?.textContent, '?tab=alerts&source=map');
        await ui.click('History back');
        assert.equal(ui.button('Search').getAttribute('aria-pressed'), 'true');
        await ui.click('History forward');
        assert.equal(ui.button('Alerts').getAttribute('aria-pressed'), 'true');
        assert.equal(ui.writes(), 0);
    } finally { await ui.dispose(); }
});

test('missing or unrecognized settings tab keeps the existing Alerts default', async () => {
    for (const search of ['', '?tab=unknown', '?tab=__proto__']) {
        const ui = await mountSettings(`/user/dashboard/settings${search}`);
        try {
            assert.equal(ui.button('Alerts').getAttribute('aria-pressed'), 'true');
            assert.equal(ui.writes(), 0);
        } finally { await ui.dispose(); }
    }
});
