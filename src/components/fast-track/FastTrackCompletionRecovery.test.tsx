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

const buildCase = (): FastTrackCase => ({
    id: 'case-1', caseId: 'case-1', propertyId: 'property-1', propertyTitle: 'Test home', propertyType: 'Apartment',
    clientId: 'user-1', clientName: 'Test client', managerId: 'manager-1', listingType: 'rent', journeyMode: 'rent', journeyType: 'rent',
    submittedAt: '2026-09-07T00:00:00Z', hoursRemaining: 0, overdue: false, stage: 'handover',
    currentStep: 'completed', backendCurrentStep: 'completed', workspaceFinalStatus: 'completed', finalStatus: 'completed',
    documents: { identityProof: 'verified', addressProof: 'verified', items: [], allUploaded: true, allApproved: true },
    viewing: { status: 'completed' }, decision: { mode: 'rent', status: 'approved' },
    agreement: { status: 'accepted', paymentStatus: 'not_requested' },
    handover: { status: 'completed', completedAt: '2026-09-07T10:00:00Z', completedBy: 'manager-1', confirmedByUser: true },
    activity: [], documentPhase: 'verified',
});

const mount = async (surface: 'workspace' | 'companion', role: 'manager' | 'admin' | 'user', initial = buildCase(), parentRefresh = false) => {
    const window = new Window({ url: 'https://estospaces.test/manager/fast-track?case=case-1&section=handover' });
    const globals = { window, document: window.document, navigator: window.navigator, HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
    const host = window.document.createElement('div');
    window.document.body.append(host);
    let root = createRoot(host as unknown as HTMLDivElement);
    let current = initial;
    let corrected = false;
    let caseReadFailure = false;
    const actions: string[] = [];
    const refreshOptions: Array<{ silent?: boolean } | undefined> = [];
    let finishRefresh: () => void = () => undefined;
    const refreshFinished = new Promise<void>(resolve => { finishRefresh = () => resolve(); });
    const actor = { id: `${role}-1`, name: 'QA actor' };
    let poll: () => void | Promise<void> = () => undefined;
    const publish = () => undefined;
    const toast = { error: () => undefined, info: () => undefined, success: () => undefined, clearAll: () => undefined };
    const boundaries: Record<string, unknown> = {
        '@/contexts/AuthContext': { useAuth: () => ({ user: actor }) },
        '@/contexts/ToastContext': { useToast: () => toast },
        '@/contexts/WorkspaceSyncContext': {
            usePublishWorkspaceSync: () => publish,
            useWorkspaceRefresh: ({ refresh }: { refresh: typeof poll }) => { poll = refresh; },
        },
        '@/lib/useGeoMarket': { useGeoMarket: () => 'IN' },
        '@/services/fastTrackService': {
            getFastTrackCases: async () => ({ data: [current], error: null }),
            getFastTrackCaseById: async () => caseReadFailure
                ? { data: null, error: 'Confirming case read unavailable' }
                : { data: current, error: null },
            performFastTrackAction: async (_id: string, request: { action: string; payload: unknown }) => {
                actions.push(request.action);
                assert.deepEqual(request.payload, request.action === 'complete_handover' ? { note: '' } : {});
                if (request.action === 'complete_handover' || request.action === 'confirm_handover') current = buildCase();
                else assert.equal(request.action, 'retry_handover_sync');
                return corrected ? { data: current, error: null } : { data: null, error: 'Correct the property address.' };
            },
        },
        '@/services/workspacePreferencesService': {
            getFastTrackWorkspacePreferences: async () => ({ data: null }),
            updateFastTrackWorkspacePreferences: async () => ({ data: null }),
        },
        '@/services/managerReviewsService': { managerReviewsService: { getManagerReviewForCase: async () => ({ data: null }) } },
        '@/services/messagesService': { upsertDirectConversation: async () => { throw new Error('No messaging actions in this test'); } },
        '@/components/fast-track/FastTrackCompletionRefresh': { __esModule: true, default: FastTrackCompletionRefresh },
    };
    const require = createRequire(import.meta.url);
    const compiledModules = new Map<string, unknown>();
    const loadSource = (relative: string): unknown => {
        if (compiledModules.has(relative)) return compiledModules.get(relative);
        const filename = resolve(process.cwd(), relative);
        const compiled = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
            module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
        } }).outputText;
        const module = { exports: {} };
        const load = (id: string): unknown => {
            if (id in boundaries) return boundaries[id];
            if (id === '@/lib/fastTrackCompanion') return loadSource('src/lib/fastTrackCompanion.ts');
            if (id.startsWith('@/components/')) return new Proxy({ __esModule: true }, { get: (_target, key) => key === '__esModule' ? true : () => null });
            if (id.startsWith('@/services/')) return {};
            return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
        };
        new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
        compiledModules.set(relative, module.exports);
        return module.exports;
    };
    const { default: Component } = loadSource(`src/components/fast-track/${surface === 'workspace' ? 'FastTrackWorkspace' : 'FastTrackCompanionPanel'}.tsx`) as {
        default: React.ComponentType<{ role: string; fastTrackCase: FastTrackCase; onRefresh?: (options?: { silent?: boolean }) => Promise<void> }>;
    };
    const Parent = () => {
        const [displayCase, setDisplayCase] = React.useState(current);
        const [loading, setLoading] = React.useState(false);
        return loading ? <div>Loading parent records</div> : <Component role={role} fastTrackCase={displayCase} onRefresh={async (options) => {
            refreshOptions.push(options);
            if (!options?.silent) setLoading(true);
            await new Promise(resolve => setTimeout(resolve, 0));
            setDisplayCase(current);
            setLoading(false);
            finishRefresh();
        }} />;
    };
    const render = async () => {
        await act(async () => root.render(<MemoryRouter initialEntries={['/manager/fast-track?case=case-1&section=handover']}>{parentRefresh ? <Parent /> : <Component role={role} fastTrackCase={current} />}</MemoryRouter>));
    };
    await render();
    return {
        host, actions, refreshOptions,
        waitForRefresh: async () => {
            let deadline: ReturnType<typeof setTimeout> | undefined;
            try {
                await Promise.race([
                    refreshFinished,
                    new Promise<never>((_resolve, reject) => {
                        deadline = setTimeout(() => reject(new Error('Parent record refresh did not complete')), 3000);
                    }),
                ]);
            } finally { clearTimeout(deadline); }
        },
        correct: () => { corrected = true; },
        failCaseRead: (fail: boolean) => { caseReadFailure = fail; },
        poll: async () => { if (surface === 'workspace') await act(async () => poll()); else await render(); },
        reload: async () => { await act(async () => root.unmount()); root = createRoot(host as unknown as HTMLDivElement); await render(); },
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

test('workspace completion refresh stays retryable when mutation succeeds but confirming read fails', async () => {
    const ui = await mount('workspace', 'manager');
    try {
        ui.correct();
        ui.failCaseRead(true);
        const button = () => ui.host.querySelector('[data-fast-track-completion-refresh]')?.querySelector('button');
        assert.ok(button());
        await act(async () => button()!.click());
        assert.match(ui.host.querySelector('[role="alert"]')?.textContent || '', /Confirming case read unavailable/);
        assert.doesNotMatch(ui.host.textContent, /Completion refreshed/);
        assert.equal(button()!.disabled, false);
        assert.match(ui.host.textContent, /handover stays completed/i);
        ui.failCaseRead(false);
        await act(async () => button()!.click());
        assert.match(ui.host.textContent, /Completion refreshed/);
        assert.deepEqual(ui.actions, ['retry_handover_sync', 'retry_handover_sync']);
    } finally { await ui.close(); }
});

test('companion completion success survives the parent record refresh', async () => {
    const ui = await mount('companion', 'manager', buildCase(), true);
    try {
        ui.correct();
        const button = ui.host.querySelector('[data-fast-track-completion-refresh]')?.querySelector('button');
        assert.ok(button);
        await act(async () => { button.click(); await ui.waitForRefresh(); });
        assert.deepEqual(ui.refreshOptions, [{ silent: true }]);
        assert.match(ui.host.querySelector('[role="status"]')?.textContent || '', /Completion refreshed/);
    } finally { await ui.close(); }
});

for (const role of ['user', 'manager'] as const) test(`companion ${role} refetches persisted completion immediately after a partial failure`, async () => {
    const initial = buildCase();
    initial.workspaceFinalStatus = 'active'; initial.finalStatus = 'in_progress';
    initial.handover = { status: 'ready', confirmedByUser: false };
    const ui = await mount('companion', role, initial, true);
    try {
        const confirm = Array.from(ui.host.querySelectorAll('button')).find(button => button.textContent === (role === 'user' ? 'Confirm handover' : 'Complete handover'));
        assert.ok(confirm);
        await act(async () => { confirm.click(); await ui.waitForRefresh(); });
        assert.deepEqual(ui.refreshOptions, [{ silent: true }]);
        assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'));
    } finally { await ui.close(); }
});

for (const surface of ['workspace', 'companion'] as const) {
    for (const role of (surface === 'workspace' ? ['manager', 'admin', 'user'] : ['manager', 'user']) as Array<'manager' | 'admin' | 'user'>) {
        test(`${surface} ${role}: completed retry survives failure, reload, and address correction`, async () => {
            const ui = await mount(surface, role);
            try {
                const button = () => ui.host.querySelector('[data-fast-track-completion-refresh]')?.querySelector('button');
                assert.ok(button(), ui.host.textContent);
                assert.equal(button()!.closest('fieldset')?.hasAttribute('disabled') ?? false, false);
                await act(async () => button()!.click());
                assert.match(ui.host.querySelector('[role="alert"]')!.textContent, /Correct the property address/);
                await ui.reload();
                assert.ok(button());
                ui.correct();
                await act(async () => button()!.click());
                assert.match(ui.host.textContent, /Completion refreshed/);
                assert.deepEqual(ui.actions, ['retry_handover_sync', 'retry_handover_sync']);
                assert.equal(ui.host.querySelector('textarea:not([readonly])'), null);
            } finally { await ui.close(); }
        });
    }
}

for (const role of ['user', 'manager'] as const) test(`workspace ${role} failed initial completion becomes retryable after polling persisted completion`, async () => {
    const initial = buildCase();
    initial.workspaceFinalStatus = 'active'; initial.finalStatus = 'in_progress';
    initial.handover = { status: 'ready', confirmedByUser: false };
    const ui = await mount('workspace', role, initial);
    try {
        const confirm = Array.from(ui.host.querySelectorAll('button')).find(button => button.textContent === (role === 'user' ? 'Confirm I got the keys' : 'Complete handover'));
        assert.ok(confirm);
        assert.equal(confirm.disabled, false);
        await act(async () => confirm.click());
        await ui.poll();
        await ui.reload();
        const retry = ui.host.querySelector('[data-fast-track-completion-refresh]')?.querySelector('button');
        assert.ok(retry);
        ui.correct();
        await act(async () => retry.click());
        assert.deepEqual(ui.actions, [role === 'user' ? 'confirm_handover' : 'complete_handover', 'retry_handover_sync']);
    } finally { await ui.close(); }
});

for (const surface of ['workspace', 'companion'] as const) test(`${surface} preserves primary user confirmation beside completion recovery`, async () => {
    const initial = buildCase();
    initial.handover.confirmedByUser = false;
    const ui = await mount(surface, 'user', initial);
    try {
        assert.ok(ui.host.querySelector('[data-fast-track-completion-refresh]'));
        assert.ok(Array.from(ui.host.querySelectorAll('button')).find(button => /Confirm (I got the keys|handover)/.test(button.textContent)));
    } finally { await ui.close(); }
});

test('legacy admin summary without genuine handover evidence exposes no refresh', async () => {
    const initial = buildCase();
    initial.handover = { status: 'completed' };
    const ui = await mount('workspace', 'admin', initial);
    try { assert.equal(ui.host.querySelector('[data-fast-track-completion-refresh]'), null); }
    finally { await ui.close(); }
});
