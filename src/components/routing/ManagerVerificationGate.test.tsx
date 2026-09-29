import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Window } from 'happy-dom';

import type { VerificationStatus } from '@/services/managerVerificationService';
import type { VerifiedManagerArea } from '@/lib/managerVerificationGate';

// QA-MB-20260922-01-001 / QA-MB-20260924-01-014 / QA-MB-20260923-01-029:
// gated manager routes must explain themselves in place instead of silently
// redirecting to the dashboard.

type ContextModule = typeof import('@/contexts/ManagerVerificationContext');
type GateModule = typeof import('./ManagerVerificationGate');

let modules: { context: ContextModule; gate: GateModule } | null = null;

interface VerificationState {
    isLoading?: boolean;
    error?: string | null;
    verificationStatus?: VerificationStatus | null;
    hasProfile?: boolean;
    agencyReason?: string;
}

interface Harness {
    text: () => string;
    location: () => string;
    query: (selector: string) => Element | null;
    click: (label: string) => Promise<void>;
    refetchCalls: () => number;
    unmount: () => Promise<void>;
}

async function mount(path: string, area: VerifiedManagerArea, state: VerificationState): Promise<Harness> {
    const window = new Window({ url: `https://estospaces.test${path}` });
    const globals: Record<string, unknown> = {
        window,
        document: window.document,
        navigator: window.navigator,
        HTMLElement: window.HTMLElement,
        Element: window.Element,
        Node: window.Node,
        Event: window.Event,
        MouseEvent: window.MouseEvent,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }

    modules ??= {
        context: await import('@/contexts/ManagerVerificationContext'),
        gate: await import('./ManagerVerificationGate'),
    };
    const Context = modules.context.default;
    const Gate = modules.gate.default;

    let refetchCalls = 0;
    const status = state.verificationStatus ?? null;
    const value = {
        managerProfile: state.hasProfile === false ? null : ({
            id: 'manager-1',
            verification_status: status ?? 'incomplete',
            agency_verification_reason: state.agencyReason,
        } as unknown),
        documents: [],
        verificationStatus: status,
        isVerified: status === 'approved',
        isLoading: Boolean(state.isLoading),
        error: state.error ?? null,
        refetch: async () => { refetchCalls += 1; },
    } as unknown as NonNullable<React.ContextType<typeof Context>>;

    let currentLocation = path;
    const Probe = () => {
        const location = useLocation();
        currentLocation = location.pathname;
        return null;
    };

    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root: Root = createRoot(host as unknown as HTMLElement);
    await act(async () => {
        root.render(
            <MemoryRouter initialEntries={[path]}>
                <Context.Provider value={value}>
                    <Probe />
                    <Routes>
                        <Route path="/manager/dashboard" element={<p>dashboard page</p>} />
                        <Route path="/manager/verification" element={<p>verification page</p>} />
                        <Route path="*" element={<Gate area={area}><p data-gated-page>{`${area} page content`}</p></Gate>} />
                    </Routes>
                </Context.Provider>
            </MemoryRouter>,
        );
    });

    const findButton = (label: string) => Array.from(window.document.querySelectorAll('button, a'))
        .find((element) => element.textContent?.trim() === label) as unknown as HTMLElement | undefined;

    return {
        text: () => window.document.body.textContent ?? '',
        location: () => currentLocation,
        query: (selector) => window.document.querySelector(selector) as unknown as Element | null,
        click: async (label) => {
            const target = findButton(label);
            assert.ok(target, `expected a control labelled "${label}"`);
            await act(async () => {
                target.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }) as unknown as Event);
            });
        },
        refetchCalls: () => refetchCalls,
        unmount: async () => {
            await act(async () => root.unmount());
            await window.happyDOM.close();
            for (const [key, descriptor] of descriptors) {
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else delete (globalThis as Record<string, unknown>)[key];
            }
        },
    };
}

test('a pending manager opening Fast Track sees an explicit gate on the same URL', async () => {
    const harness = await mount('/manager/fast-track', 'fast-track', { verificationStatus: 'submitted' });
    try {
        assert.equal(harness.location(), '/manager/fast-track');
        assert.doesNotMatch(harness.text(), /dashboard page|fast-track page content/);
        assert.match(harness.text(), /Your manager profile is pending verification/);
        assert.equal(harness.query('[data-manager-verification-status]')?.textContent, 'Pending review');
        assert.ok(harness.query('a[href="/manager/verification"]'), 'links to the verification page');
    } finally {
        await harness.unmount();
    }
});

test('re-verification explains the profile-change cause and keeps existing appointments viewable', async () => {
    const harness = await mount('/manager/appointments', 'appointments', {
        verificationStatus: 'verification_required',
        agencyReason: 'Agency profile details changed and require admin review.',
    });
    try {
        assert.match(harness.text(), /Re-verification required after profile changes/);
        assert.match(harness.text(), /Agency profile details changed and require admin review\./);
        assert.equal(harness.query('[data-manager-verification-status]')?.textContent, 'Re-verification required');
        assert.doesNotMatch(harness.text(), /appointments page content/);

        await harness.click('View existing appointments');
        assert.equal(harness.location(), '/manager/appointments');
        assert.match(harness.text(), /appointments page content/);
        assert.equal(harness.query('[data-manager-verification-banner]')?.getAttribute('data-manager-verification-banner'), 'verification_required');
        assert.ok(harness.query('[data-manager-verification-banner] a[href="/manager/verification"]'));
    } finally {
        await harness.unmount();
    }
});

test('the verification link on the gate leads to the verification page', async () => {
    const harness = await mount('/manager/contracts', 'contracts', { verificationStatus: 'rejected' });
    try {
        await harness.click('Go to verification');
        assert.equal(harness.location(), '/manager/verification');
        assert.match(harness.text(), /verification page/);
    } finally {
        await harness.unmount();
    }
});

test('analytics stays gated without a partial view', async () => {
    const harness = await mount('/manager/analytics', 'analytics', { verificationStatus: 'under_review' });
    try {
        assert.match(harness.text(), /Analytics open once your manager verification is approved/);
        assert.doesNotMatch(harness.text(), /View existing/);
    } finally {
        await harness.unmount();
    }
});

test('a verified manager goes straight to the page', async () => {
    const harness = await mount('/manager/fast-track', 'fast-track', { verificationStatus: 'approved' });
    try {
        assert.match(harness.text(), /fast-track page content/);
        assert.equal(harness.query('[data-manager-verification-gate]'), null);
    } finally {
        await harness.unmount();
    }
});

test('the subscription page is never replaced by the gate', async () => {
    const harness = await mount('/manager/subscription', 'subscription', { verificationStatus: 'submitted' });
    try {
        assert.equal(harness.location(), '/manager/subscription');
        assert.match(harness.text(), /subscription page content/);
    } finally {
        await harness.unmount();
    }
});

test('while the status loads nothing is shown or redirected', async () => {
    const harness = await mount('/manager/contracts', 'contracts', { isLoading: true });
    try {
        assert.equal(harness.location(), '/manager/contracts');
        assert.doesNotMatch(harness.text(), /contracts page content|pending verification/);
    } finally {
        await harness.unmount();
    }
});

test('a failed status lookup offers a retry instead of opening the page', async () => {
    const harness = await mount('/manager/fast-track', 'fast-track', { error: 'Network error', hasProfile: false });
    try {
        assert.match(harness.text(), /We couldn't confirm your verification status/);
        assert.doesNotMatch(harness.text(), /fast-track page content|View existing/);
        await harness.click('Retry');
        assert.equal(harness.refetchCalls(), 1);
    } finally {
        await harness.unmount();
    }
});
