import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React, { act } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';
import ts from 'typescript';

import type { BrokerRequestRecord } from '@/services/leadsService';

// web-app#685: the "new request" form must start blank after a request is sent or
// when the user starts another one, and no refresh may refill it from the old request.

// React DOM decides at load time whether the browser supports input events, so the
// DOM must exist before react-dom/client is imported for typing to reach onChange.
const window = new Window({ url: 'https://estospaces.test/user/dashboard' });
for (const [key, value] of Object.entries({
    window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
    CustomEvent: window.CustomEvent,
    localStorage: window.localStorage, sessionStorage: window.sessionStorage,
    IS_REACT_ACT_ENVIRONMENT: true,
})) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
}

const require = createRequire(import.meta.url);

const chennaiRequest: BrokerRequestRecord = {
    id: 'req-chennai', user_id: 'user-1', request_type: 'buy', location: 'Chennai, Adyar',
    location_postcode: '600020', budget: '5000000', details: '2 bedroom flat with a balcony',
    status: 'open', dispatch_status: 'broadcasting', fast_track_enabled: true,
    response_deadline_at: '2999-01-01T00:00:00Z',
};
const closedChennaiRequest: BrokerRequestRecord = {
    ...chennaiRequest, status: 'cancelled', dispatch_status: 'cancelled',
};

type RefreshOptions = { refresh: () => void | Promise<void>; enabled?: boolean };
const stub = {
    user: { id: 'user-1', email: 'user@example.test', country_code: 'IN' } as Record<string, unknown>,
    requestsById: new Map<string, BrokerRequestRecord>(),
    created: [] as Array<Record<string, unknown>>,
    refreshOptions: null as RefreshOptions | null,
};

const loadWidget = () => {
    const compile = (filename: string): { default: React.ComponentType<{ preferredRequestId?: string | null }> } => {
        const compiled = ts.transpileModule(readFileSync(new URL(filename, import.meta.url), 'utf8'), {
            compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
                esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
        }).outputText;
        const componentModule = { exports: {} as { default: React.ComponentType<{ preferredRequestId?: string | null }> } };
        const load = (id: string): unknown => {
            if (id === '@/components/ui/ActionSpinner' || id === '@/components/ui/ConfirmModal') {
                return { __esModule: true, default: () => null };
            }
            if (id === '@/contexts/AuthContext') return { useAuth: () => ({ user: stub.user }) };
            if (id === '@/contexts/ToastContext') return { useToast: () => ({ error() {}, success() {} }) };
            if (id === '@/contexts/WorkspaceSyncContext') {
                return {
                    usePublishWorkspaceSync: () => () => {},
                    useWorkflowWorkspaceRefresh: (options: RefreshOptions) => { stub.refreshOptions = options; },
                };
            }
            if (id === '@/lib/useGeoMarket') return { useUserGeoMarket: () => 'IN' };
            if (id === '@/lib/propertyImages') return { resolvePropertyImageUrl: (value: string) => value };
            if (id === '@/services/managerVerificationService') return { isPlaceholderManagerCompanyName: () => false };
            if (id === '@/services/messagesService') return { messagesService: {} };
            if (id === '@/services/fastTrackService') return { getFastTrackCases: async () => ({ data: [], error: null }) };
            if (id === '@/services/leadsService') return {
                getUserBrokerRequests: async () => ({ data: [], error: null }),
                getBrokerRequestById: async (requestId: string) => ({ data: stub.requestsById.get(requestId) ?? null, error: null }),
                getNearbyAvailableBrokers: async () => ({ data: [], error: null }),
                createBrokerRequest: async (payload: Record<string, unknown>) => {
                    stub.created.push(payload);
                    stub.requestsById.set(chennaiRequest.id, chennaiRequest);
                    return { success: true, data: chennaiRequest, error: null };
                },
                cancelBrokerRequest: async () => ({ data: null, error: 'unused' }),
                rematchBrokerRequest: async () => ({ data: null, error: 'unused' }),
                selectBrokerRequestProperty: async () => ({ data: null, error: 'unused' }),
            };
            return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
        };
        new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
        return componentModule.exports;
    };
    return compile('./BrokerRequestWidget.tsx').default;
};

const settle = (ms = 0) => act(async () => { await new Promise((done) => setTimeout(done, ms)); });

async function mountWidget(preferredRequestId: string | null = null) {
    stub.created = [];
    stub.refreshOptions = null;
    const { createRoot } = await import('react-dom/client');
    const Widget = loadWidget();
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLElement);
    const render = () => act(async () => root.render(
        <MemoryRouter initialEntries={['/user/dashboard']}><Widget preferredRequestId={preferredRequestId} /></MemoryRouter>,
    ));
    await render();
    await settle();

    const field = (id: string) => {
        const element = window.document.getElementById(id);
        assert.ok(element, `expected #${id}`);
        return element as unknown as HTMLInputElement & HTMLTextAreaElement;
    };
    const type = async (id: string, text: string) => {
        const input = field(id);
        await act(async () => {
            // The prototype setter bypasses React's value tracker, as real typing does.
            let proto: object | null = Object.getPrototypeOf(input);
            let setter: ((value: string) => void) | undefined;
            while (proto && !setter) {
                setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                proto = Object.getPrototypeOf(proto);
            }
            assert.ok(setter, 'input value setter');
            setter.call(input, text);
            input.dispatchEvent(new window.Event('input', { bubbles: true }) as unknown as Event);
        });
    };
    const clickButton = async (label: string) => {
        const button = [...window.document.querySelectorAll('button')]
            .find((candidate) => candidate.textContent?.trim() === label);
        assert.ok(button, `expected a "${label}" button`);
        await act(async () => { button.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); });
        await settle();
    };
    return {
        value: (id: string) => field(id).value,
        type,
        clickButton,
        submit: async () => {
            const form = window.document.querySelector('form');
            assert.ok(form, 'expected the request form');
            await act(async () => { form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); });
            await settle();
        },
        // The periodic workspace refresh, plus a re-run of the request load
        // (a new `user` object, as after a profile or token refresh).
        refreshWorkspace: async () => {
            await act(async () => { await stub.refreshOptions?.refresh(); });
            stub.user = { ...stub.user };
            await render();
            await settle();
        },
        unmount: async () => {
            await act(async () => root.unmount());
            host.remove();
        },
    };
}

const FIELDS = {
    location: 'broker-request-location',
    postcode: 'broker-request-location-code',
    budget: 'broker-request-budget',
    details: 'broker-request-details',
};

const assertBlankForm = (page: Awaited<ReturnType<typeof mountWidget>>, context: string) => {
    for (const [name, id] of Object.entries(FIELDS)) {
        assert.equal(page.value(id), '', `${context}: ${name} must be empty`);
    }
};

test('after a request is sent the form is blank and no refresh refills it with that request', async () => {
    stub.requestsById.clear();
    const page = await mountWidget();
    try {
        await page.type(FIELDS.location, 'Chennai, Adyar');
        await page.type(FIELDS.postcode, '600020');
        await page.type(FIELDS.budget, '5000000');
        await page.type(FIELDS.details, '2 bedroom flat with a balcony');
        await page.submit();

        assert.equal(stub.created.length, 1, 'the request must really be sent');
        assert.equal(stub.created[0].locationPostcode, '600020');
        assertBlankForm(page, 'right after sending');

        await page.refreshWorkspace();
        assertBlankForm(page, 'after the periodic refresh');

        await page.type(FIELDS.location, 'Mumbai');
        assert.equal(page.value(FIELDS.postcode), '', 'the next request has no Chennai PIN');
        assert.equal(page.value(FIELDS.details), '', 'the next request has no old requirements');
    } finally {
        await page.unmount();
    }
});

test('Start another request on a closed request clears the form and keeps it clear through a refresh', async () => {
    stub.requestsById.clear();
    stub.requestsById.set(closedChennaiRequest.id, closedChennaiRequest);
    const page = await mountWidget(closedChennaiRequest.id);
    try {
        assertBlankForm(page, 'beside a closed request');

        await page.clickButton('Start another request');
        assertBlankForm(page, 'after Start another request');

        await page.type(FIELDS.location, 'Mumbai');
        await page.refreshWorkspace();
        assert.equal(page.value(FIELDS.location), 'Mumbai', 'a refresh keeps what the user typed');
        assert.equal(page.value(FIELDS.postcode), '', 'the Chennai PIN does not come back');
        assert.equal(page.value(FIELDS.budget), '');
        assert.equal(page.value(FIELDS.details), '');
    } finally {
        await page.unmount();
    }
});

test('a form shown beside a running request starts blank and a refresh does not overwrite what is typed', async () => {
    stub.requestsById.clear();
    stub.requestsById.set(chennaiRequest.id, chennaiRequest);
    const page = await mountWidget(chennaiRequest.id);
    try {
        assertBlankForm(page, 'beside a running request');

        await page.type(FIELDS.location, 'Mumbai');
        await page.refreshWorkspace();
        assert.equal(page.value(FIELDS.location), 'Mumbai');
        assert.equal(page.value(FIELDS.postcode), '');
        assert.equal(page.value(FIELDS.details), '');
    } finally {
        await page.unmount();
    }
});
