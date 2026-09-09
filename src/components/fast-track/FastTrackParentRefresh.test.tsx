import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';
import type { FastTrackCase } from '@/services/fastTrackService';
import FastTrackCompletionRefresh from './FastTrackCompletionRefresh';

const caseItem: FastTrackCase = {
    id: 'case-1', caseId: 'case-1', propertyId: 'property-1', propertyTitle: 'Test home', propertyType: 'Apartment',
    clientId: 'user-1', clientName: 'Test client', managerId: 'manager-1', listingType: 'rent', journeyMode: 'rent', journeyType: 'rent',
    applicationId: 'application-1', viewingId: 'viewing-1', contractId: 'contract-1',
    submittedAt: '2026-09-07T00:00:00Z', hoursRemaining: 0, overdue: false, stage: 'handover',
    currentStep: 'completed', backendCurrentStep: 'completed', workspaceFinalStatus: 'completed', finalStatus: 'completed',
    documents: { identityProof: 'verified', addressProof: 'verified', items: [], allUploaded: true, allApproved: true },
    viewing: { status: 'completed' }, decision: { mode: 'rent', status: 'approved' },
    agreement: { status: 'accepted', paymentStatus: 'not_requested' },
    handover: { status: 'completed', completedAt: '2026-09-07T10:00:00Z', completedBy: 'manager-1', confirmedByUser: true },
    activity: [], documentPhase: 'verified',
};

const mount = async (surface: 'appointments' | 'contracts' | 'manager-contracts' | 'user-viewings', failure: 'cases' | 'contracts' | 'applications' | 'viewings' = 'cases', initialFailure = false) => {
    const pagePaths = { appointments: 'manager/appointments', contracts: 'user/dashboard/contracts', 'manager-contracts': 'manager/contracts', 'user-viewings': 'user/dashboard/viewings' };
    const url = `/${pagePaths[surface]}?case=case-1&viewing=viewing-1`;
    const window = new Window({ url: `https://estospaces.test${url}` });
    const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    let fail = initialFailure;
    let empty = false;
    let caseReadCount = 0;
    let blockedRead: Promise<void> | null = null;
    let releaseRead: () => void = () => undefined;
    let backgroundRequest: void | Promise<void>;
    let refresh: () => void | Promise<void> = () => undefined;
    const toast = { error: () => undefined, info: () => undefined, success: () => undefined };
    const publish = () => undefined;
    const boundaries: Record<string, unknown> = {
        '@/components/fast-track/FastTrackCompletionRefresh': { __esModule: true, default: FastTrackCompletionRefresh },
        '@/contexts/AuthContext': { useAuth: () => ({ user: { id: surface === 'appointments' || surface === 'manager-contracts' ? 'manager-1' : 'user-1' } }) },
        '@/contexts/ToastContext': { useToast: () => toast },
        '@/contexts/WorkspaceSyncContext': {
            usePublishWorkspaceSync: () => publish,
            useWorkflowWorkspaceRefresh: (options: { refresh: typeof refresh }) => { refresh = options.refresh; },
            useWorkspaceRefresh: (options: { refresh: typeof refresh }) => { refresh = options.refresh; },
        },
        '@/services/fastTrackService': {
            getFastTrackCases: async () => {
                caseReadCount += 1;
                if (blockedRead) await blockedRead;
                return fail && failure === 'cases' ? { data: null, error: 'Cases unavailable' } : { data: empty ? [] : [caseItem], error: null };
            },
            performFastTrackAction: async () => { fail = true; return { data: caseItem, error: null }; },
        },
        '@/services/bookingsService': { bookingsService: { getViewings: async () => {
            if (fail && failure === 'viewings') throw new Error('Viewings unavailable');
            return [{ id: 'viewing-1', property_id: 'property-1', property_title: 'Test home', scheduled_at: '2026-09-07T10:00:00Z', status: 'completed' }];
        } } },
        '@/services/contractsService': {
            getUserContracts: async () => fail && failure === 'contracts' ? { data: null, error: 'Contracts unavailable' } : ({ data: [{ id: 'contract-1', application_id: 'application-1', property_id: 'property-1', property_title: 'Test home', status: 'signed', created_at: '2026-09-07T00:00:00Z' }], error: null }),
            getContract: async () => ({ data: { id: 'contract-1', application_id: 'application-1', property_id: 'property-1', property_title: 'Test home', status: 'signed', created_at: '2026-09-07T00:00:00Z' }, error: null }),
        },
        '@/services/applicationsService': { getApplications: async () => fail && failure === 'applications' ? { data: null, error: 'Applications unavailable' } : ({ data: [{ id: 'application-1', property_id: 'property-1', fast_track_case_id: 'case-1', status: 'completed', listing_type: 'rent' }], error: null }) },
        '@/services/salesService': { getSaleProgressions: async () => ({ data: [], error: null }) },
    };
    const require = createRequire(import.meta.url);
    const cache = new Map<string, unknown>();
    const loadSource = (relative: string): unknown => {
        if (cache.has(relative)) return cache.get(relative);
        const compiled = ts.transpileModule(readFileSync(resolve(relative), 'utf8'), { compilerOptions: {
            module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
        } }).outputText;
        const module = { exports: {} };
        const load = (id: string): unknown => {
            if (id in boundaries) return boundaries[id];
            if (id === '@/lib/fastTrackCompanion') return loadSource('src/lib/fastTrackCompanion.ts');
            if (id === '@/components/fast-track/FastTrackCompanionPanel' || id === '@/components/fast-track/FastTrackCompletionRefresh') return loadSource(`src/${id.slice(2)}.tsx`);
            if (id.startsWith('@/components/')) return { __esModule: true, default: () => null };
            return require(id.startsWith('@/') ? resolve('src', id.slice(2)) : id);
        };
        new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
        cache.set(relative, module.exports);
        return module.exports;
    };
    const { default: Page } = loadSource(`src/pages/${pagePaths[surface]}/page.tsx`) as { default: React.ComponentType };
    await act(async () => root.render(<MemoryRouter initialEntries={[url]}><Page /></MemoryRouter>));
    return {
        host,
        backgroundFailure: async () => { fail = true; await act(async () => refresh()); },
        readCount: () => caseReadCount,
        beginBackgroundFailure: async () => {
            fail = true;
            blockedRead = new Promise<void>(resolve => { releaseRead = resolve; });
            await act(async () => { backgroundRequest = refresh(); });
        },
        releaseBackground: async () => {
            await act(async () => {
                releaseRead();
                await backgroundRequest;
                blockedRead = null;
            });
        },
        empty: async () => { fail = false; empty = true; await act(async () => refresh()); },
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

for (const surface of ['appointments', 'contracts'] as const) test(`${surface} retains completion recovery after retry succeeds but the parent read fails`, async () => {
    const ui = await mount(surface);
    try {
        const button = ui.host.querySelector('[data-fast-track-completion-refresh] button');
        assert.ok(button, 'Actual linked completion recovery is mounted');
        await act(async () => (button as unknown as HTMLButtonElement).click());
        assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'), 'Failed read must not remove recovery');
        assert.match(ui.host.textContent, /Update saved, but the latest case could not be loaded/);
        await ui.empty();
        assert.equal(ui.host.querySelector('[data-fast-track-completion-refresh]'), null, 'A successful empty result removes the missing case');
    } finally { await ui.close(); }
});

for (const surface of ['manager-contracts', 'user-viewings'] as const) {
    const failures = surface === 'manager-contracts' ? ['cases', 'contracts', 'applications'] as const : ['cases', 'viewings'] as const;
    for (const failure of failures) test(`${surface} reports ${failure} read failure after saved completion without dropping recovery`, async () => {
        const ui = await mount(surface, failure);
        try {
            const button = ui.host.querySelector('[data-fast-track-completion-refresh] button');
            assert.ok(button, 'Actual parent mounts its linked recovery control');
            await act(async () => (button as unknown as HTMLButtonElement).click());
            assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'));
            assert.match(ui.host.textContent, /Update saved, but the latest case could not be loaded/);
            assert.doesNotMatch(ui.host.textContent, /Completion refreshed\. Your handover remains completed/);
            await ui.backgroundFailure();
            assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'), 'Background failure preserves recovery without rejecting');
            await ui.empty();
            assert.equal(ui.host.querySelector('[data-fast-track-completion-refresh]'), null);
        } finally { await ui.close(); }
    });
}

for (const surface of ['manager-contracts', 'user-viewings'] as const) test(`${surface} keeps initial primary records available when linked cases cannot load`, async () => {
    const ui = await mount(surface, 'cases', true);
    try {
        assert.match(ui.host.textContent, surface === 'manager-contracts' ? /All \(1\)/ : /Test home/);
        assert.equal(ui.host.querySelector('[data-fast-track-completion-refresh]'), null);
    } finally { await ui.close(); }
});

test('contracts action joining a failing background read still receives its own failure feedback', async () => {
    const ui = await mount('contracts');
    try {
        await ui.beginBackgroundFailure();
        const button = ui.host.querySelector('[data-fast-track-completion-refresh] button');
        assert.ok(button);
        await act(async () => (button as unknown as HTMLButtonElement).click());
        assert.equal(ui.readCount(), 2, 'The action shares the initial plus one in-flight background read');
        await ui.releaseBackground();
        assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'));
        assert.match(ui.host.textContent, /Update saved, but the latest case could not be loaded/);
        assert.doesNotMatch(ui.host.textContent, /Completion refreshed\. Your handover remains completed/);
    } finally { await ui.close(); }
});
