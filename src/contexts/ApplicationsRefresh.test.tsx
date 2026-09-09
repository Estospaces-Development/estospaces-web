import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';
import ts from 'typescript';
import type { Application, useApplications } from './ApplicationsContext';

const mount = async () => {
    const window = new Window({ url: 'https://estospaces.test/manager/applications' });
    const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    let user: { id: string; role: string } | null = { id: 'manager-1', role: 'manager' };
    let failure = '';
    let empty = false;
    let holdReads = false;
    const pendingReads: Array<() => void> = [];
    let refresh: () => void | Promise<void> = () => undefined;
    let latest: ReturnType<typeof useApplications>;
    const application = {
        id: 'application-1', user_id: 'user-1', manager_id: 'manager-1', property_id: 'property-1',
        fast_track_case_id: 'case-1', status: 'completed', listing_type: 'rent',
        property_title: 'Test home', property_address: '1 Test Road, London, SW1A 1AA',
        property_country: 'GB', property_currency: 'GBP', property_type: 'apartment', property_price: 1000,
        created_at: '2026-09-07T00:00:00Z', updated_at: '2026-09-07T00:00:00Z',
    };
    const fastTrackCase = { id: 'case-1', caseId: 'case-1', propertyId: 'property-1', applicationId: 'application-1', clientId: 'user-1' };
    const boundaries: Record<string, unknown> = {
        './AuthContext': { useAuth: () => ({ user }) },
        './WorkspaceSyncContext': {
            usePublishWorkspaceSync: () => () => undefined,
            useWorkspaceRefresh: (options: { refresh: typeof refresh }) => { refresh = options.refresh; },
        },
        '@/services/applicationsService': { getApplications: async () => {
            const requestFailure = failure;
            if (holdReads) await new Promise<void>(resolve => pendingReads.push(resolve));
            if (requestFailure === 'throw') throw new Error('Network unavailable');
            return requestFailure === 'applications' ? { data: null, error: 'Applications unavailable' } : { data: empty ? [] : [application], error: null };
        } },
        '@/services/fastTrackService': { getFastTrackCases: async () => failure === 'cases'
            ? { data: null, error: 'Cases unavailable' } : { data: empty ? [] : [fastTrackCase], error: null } },
        '@/services/bookingsService': { getViewings: async () => [] },
        '@/services/salesService': { getSaleProgressions: async () => ({ data: [], error: null }) },
        '@/services/propertyService': { getPropertyContextsByIds: async () => ({ data: [], error: null }) },
    };
    const require = createRequire(import.meta.url);
    const filename = resolve('src/contexts/ApplicationsContext.tsx');
    const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
        module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
    } }).outputText;
    const module = { exports: {} };
    new Function('require', 'module', 'exports', compiled)((id: string) => id in boundaries ? boundaries[id] : require(id.startsWith('@/') ? resolve('src', id.slice(2)) : id), module, module.exports);
    const source = module.exports as { ApplicationsProvider: React.ComponentType<{ children: React.ReactNode }>; useApplications: typeof useApplications };
    const Consumer = () => {
        latest = source.useApplications();
        return <div>{latest.allApplications.map((item: Application) => <span key={item.id}>{item.id}:{item.fastTrackCase?.caseId}</span>)}</div>;
    };
    const render = async () => { await act(async () => root.render(<source.ApplicationsProvider><Consumer /></source.ApplicationsProvider>)); };
    await render();
    assert.match(host.textContent, /application-1:case-1/);
    return {
        host,
        state: () => latest,
        fail: (kind: string) => { failure = kind; },
        hold: () => { holdReads = true; },
        release: () => { holdReads = false; pendingReads.splice(0).forEach(resolve => resolve()); },
        empty: () => { failure = ''; empty = true; },
        refresh: async () => { await act(async () => refresh()); },
        logout: async () => { user = null; await render(); },
        close: async () => {
            await act(async () => root.unmount());
            for (const [key, descriptor] of descriptors) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
            window.close();
        },
    };
};

for (const kind of ['applications', 'cases', 'throw']) test(`silent application refresh preserves the linked recovery case on ${kind} failure`, async () => {
    const ui = await mount();
    try {
        ui.fail(kind);
        await act(async () => {
            await assert.rejects(ui.state().fetchApplications({ silent: true }), /unavailable/i);
        });
        assert.match(ui.host.textContent, /application-1:case-1/);
        assert.equal(ui.state().isLoading, false);
        assert.match(ui.state().error || '', /unavailable/i);
    } finally { await ui.close(); }
});

for (const kind of ['applications', 'cases', 'throw']) test(`superseded explicit refresh reports its ${kind} failure when background refresh also fails`, async () => {
    const ui = await mount();
    try {
        ui.fail(kind);
        ui.hold();
        await act(async () => {
            const explicit = ui.state().fetchApplications({ silent: true });
            const rejected = assert.rejects(explicit, /unavailable/i);
            const background = ui.state().fetchApplications({ silent: true, reportFailure: false });
            ui.release();
            await Promise.all([rejected, background]);
        });
        assert.match(ui.host.textContent, /application-1:case-1/);
        assert.match(ui.state().error || '', /unavailable/i);
        assert.equal(ui.state().isLoading, false);
    } finally { await ui.close(); }
});

test('superseded explicit failure does not overwrite a successful newer refresh', async () => {
    const ui = await mount();
    try {
        ui.fail('applications');
        ui.hold();
        await act(async () => {
            const explicit = ui.state().fetchApplications({ silent: true });
            const rejected = assert.rejects(explicit, /Applications unavailable/);
            ui.fail('');
            const background = ui.state().fetchApplications({ silent: true, reportFailure: false });
            ui.release();
            await Promise.all([rejected, background]);
        });
        assert.match(ui.host.textContent, /application-1:case-1/);
        assert.equal(ui.state().error, null);
        assert.equal(ui.state().isLoading, false);
    } finally { await ui.close(); }
});

test('workspace refresh preserves application and case on failure without an unhandled rejection', async () => {
    const ui = await mount();
    try {
        ui.fail('applications');
        await ui.refresh();
        assert.match(ui.host.textContent, /application-1:case-1/);
        assert.match(ui.state().error || '', /unavailable/i);
    } finally { await ui.close(); }
});

test('successful empty application refresh removes stale applications', async () => {
    const ui = await mount();
    try {
        ui.empty();
        await act(async () => ui.state().fetchApplications({ silent: true }));
        assert.equal(ui.host.textContent, '');
        assert.equal(ui.state().error, null);
    } finally { await ui.close(); }
});

test('logout clears retained application data after a refresh failure', async () => {
    const ui = await mount();
    try {
        ui.fail('applications');
        await ui.refresh();
        await ui.logout();
        assert.equal(ui.host.textContent, '');
    } finally { await ui.close(); }
});
