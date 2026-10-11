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

import type { BrokerRequestRecord, Lead } from '@/services/leadsService';

const require = createRequire(import.meta.url);
const pendingLead: Lead = {
    id: 'waiting-client', status: 'new', stage: 'matching', name: 'Waiting client',
    created_at: '2026-09-10T10:00:00Z', updated_at: '2026-09-10T10:00:00Z', sla_remaining_seconds: 480,
};

const loadWidget = (available: boolean, leads: Lead[], blockedReason?: string, offers: BrokerRequestRecord[] = []) => {
    const compile = (filename: string): { default: React.ComponentType } => {
        const compiled = ts.transpileModule(readFileSync(new URL(filename, import.meta.url), 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
                esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        const componentModule = { exports: {} as { default: React.ComponentType } };
        const load = (id: string): unknown => {
            if (id === './BrokerRequestItem') return compile('./BrokerRequestItem.tsx');
            if (id === './ClientProfileModal' || id === '@/components/ui/Avatar') {
                return { __esModule: true, default: () => null };
            }
            if (id === '@/contexts/ToastContext') return { useToast: () => ({ error() {}, success() {} }) };
            if (id === '@/contexts/WorkspaceSyncContext') {
                return { usePublishWorkspaceSync: () => () => {}, useWorkflowWorkspaceRefresh() {} };
            }
            if (id === '@/services/leadsService') return {
                getBrokerLeads: async () => ({ data: leads, error: null }),
                getBrokerRequestOffers: async () => ({ data: offers, error: null }),
                getBrokerAvailability: async () => ({ data: {
                    broker_id: 'manager-fixture', available_for_fast_response: available,
                    seconds_remaining: 0, blocked_reason: blockedReason,
                }, error: null }),
            };
            if (id === '@/services/userPropertiesService') return {
                getUserProperties: async () => ({ data: [], error: null }),
            };
            return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
        };
        new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
        return componentModule.exports;
    };
    return compile('./BrokerResponseWidget.tsx').default;
};

const renderTracker = async (available: boolean, leads: Lead[], blockedReason?: string, offers: BrokerRequestRecord[] = []) => {
    const window = new Window();
    const globals = { window, document: window.document, navigator: window.navigator,
        HTMLElement: window.HTMLElement, Node: window.Node, IS_REACT_ACT_ENVIRONMENT: true };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }
    const container = window.document.createElement('div');
    window.document.body.append(container);
    const root = createRoot(container as unknown as HTMLElement);
    try {
        const Widget = loadWidget(available, leads, blockedReason, offers);
        await act(async () => root.render(<MemoryRouter><Widget /></MemoryRouter>));
        return container.textContent;
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.abort();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
    }
};

test('available manager with no pending requests is standing by without an active countdown', async () => {
    const text = await renderTracker(true, []);
    assert.match(text, /Standing by/);
    assert.match(text, /No waiting requests/);
    assert.doesNotMatch(text, /their own 10-minute countdown/);
    assert.doesNotMatch(text, /Live queue is on|Response required in:/);
});

test('pending requests retain their real waiting count and response countdown', async () => {
    const text = await renderTracker(true, [pendingLead]);
    assert.match(text, /1 waiting/);
    assert.match(text, /Response required in:8:00/);
    assert.doesNotMatch(text, /Standing by|No waiting requests/);
});

test('responded history is not counted as a waiting request', async () => {
    const text = await renderTracker(true, [{ ...pendingLead, stage: 'broker_matched' }]);
    assert.match(text, /Standing by/);
    assert.match(text, /No waiting requests/);
    assert.doesNotMatch(text, /Response required in:/);
});

test('#691: a new request stays in the live queue next to an older accepted request with the same brief', async () => {
    const brief = { user_id: 'client-691', request_type: 'rent', location: 'Chennai', location_postcode: '600001',
        budget: '650000', details: 'Need a Chennai rental quickly' };
    const offers: BrokerRequestRecord[] = [
        { ...brief, id: 'aaaaaaaa-0000-4000-8000-000000000001', status: 'matched', dispatch_status: 'broker_matched',
            matched_broker_id: 'manager-fixture', created_at: '2026-10-11T10:00:00Z', updated_at: '2026-10-11T10:08:00Z' },
        { ...brief, id: 'bbbbbbbb-0000-4000-8000-000000000002', status: 'submitted', dispatch_status: 'matching_wave_1',
            broker_offer_status: 'pending', broker_offer_expires_at: new Date(Date.now() + 8 * 60_000).toISOString(),
            created_at: '2026-10-11T10:05:00Z', updated_at: '2026-10-11T10:05:00Z' },
    ];
    const text = await renderTracker(true, [], undefined, offers);
    assert.match(text, /1 waiting/);
    assert.match(text, /Response required in:/);
    assert.doesNotMatch(text, /No waiting requests/);
});

test('offline and blocked dispatch do not imply availability', async () => {
    assert.match(await renderTracker(false, []), /Offline for the rapid-response queue/);
    const blocked = await renderTracker(true, [], 'Verification required');
    assert.match(blocked, /Live dispatch unavailable/);
    assert.match(blocked, /Verification required/);
    assert.doesNotMatch(blocked, /Standing by/);
});

test('phones show one live response status and Go live toggle, not a second dispatch card (web-app#535)', () => {
    const source = readFileSync(new URL('./BrokerResponseWidget.tsx', import.meta.url), 'utf8');
    const mobileSummary = source.slice(source.indexOf('data-manager-mobile-live-response'), source.indexOf('data-manager-live-response-details'));
    assert.match(mobileSummary, /\{availabilityError && <p/);
    assert.match(source, /className="mb-6 hidden flex-col[^"]* sm:flex[^"]*" data-manager-live-dispatch-panel/);
    assert.match(source, /<div className="hidden items-center gap-2 sm:flex">\s*<div className="p-2 bg-red-100/);
});
