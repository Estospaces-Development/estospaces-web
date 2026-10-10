import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';

import type { ManagerListingAction, ManagerListingStatusResult } from '@/services/propertyService';

import ManagerListingActionButtons from './ManagerListingActionButtons';
import ManagerListingStatusModal from './ManagerListingStatusModal';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/manager/dashboard/properties', width: 1024, height: 768 });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'KeyboardEvent', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        HTMLButtonElement: browserWindow.HTMLButtonElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        KeyboardEvent: browserWindow.KeyboardEvent,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });
    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    return {
        document: browserWindow.document,
        root,
        restore: () => {
            act(() => root.unmount());
            for (const key of keys) {
                const descriptor = descriptors.get(key);
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
            browserWindow.close();
        },
    };
};

type TestDocument = ReturnType<typeof installDOM>['document'];

const buttonNamed = (document: TestDocument, name: string) =>
    [...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === name) as unknown as HTMLButtonElement | undefined;

const LISTING = { id: 'property-1', title: 'Flat 4', status: 'published', listingType: 'rent', publishedAt: '2026-03-01T12:00:00Z' };

const refusal = (overrides: Partial<ManagerListingStatusResult>): ManagerListingStatusResult => ({ data: null, error: 'refused', ...overrides });

const renderModal = (
    dom: ReturnType<typeof installDOM>,
    action: ManagerListingAction,
    onConfirm: (id: string, action: ManagerListingAction) => Promise<ManagerListingStatusResult>,
    onChanged: (message: string) => void = () => undefined,
) => {
    act(() => dom.root.render(
        <MemoryRouter>
            <ManagerListingStatusModal listing={LISTING} action={action} onClose={() => undefined} onConfirm={onConfirm} onChanged={onChanged} />
        </MemoryRouter>,
    ));
};

test('the confirmation explains the effect before anything is sent', () => {
    const dom = installDOM();
    try {
        let calls = 0;
        renderModal(dom, 'unpublish', async () => { calls += 1; return refusal({}); });
        const text = dom.document.body.textContent ?? '';
        assert.match(text, /Unpublish this listing\?/);
        assert.match(text, /Flat 4 leaves search and public pages straight away/);
        assert.match(text, /stays in your inventory as a draft/);
        assert.ok(buttonNamed(dom.document, 'Unpublish'));
        assert.equal(calls, 0, 'opening the dialog changes nothing');
    } finally {
        dom.restore();
    }
});

test('a refusal for open bookings stays in the dialog with what is open, and Try again can succeed', async () => {
    const dom = installDOM();
    try {
        const answers: ManagerListingStatusResult[] = [
            refusal({
                error: 'This property cannot be unpublished while it has active bookings (1 active Fast Track case, 2 upcoming viewings).',
                status: 409,
                code: 'property_has_active_booking_work',
                activeWork: { fast_track_cases: 1, upcoming_viewings: 2 },
            }),
            { data: { id: 'property-1', status: 'draft' } as never, error: null },
        ];
        const requests: Array<[string, ManagerListingAction]> = [];
        const changed: string[] = [];
        renderModal(dom, 'unpublish', async (id, action) => { requests.push([id, action]); return answers.shift()!; }, (message) => changed.push(message));

        await act(async () => { buttonNamed(dom.document, 'Unpublish')!.click(); });
        const alert = dom.document.querySelector('[role="alert"]');
        assert.ok(alert, 'the refusal is shown in the dialog');
        assert.match(alert.textContent ?? '', /You can't unpublish while bookings are open/);
        assert.match(alert.textContent ?? '', /1 active Fast Track case/);
        assert.match(alert.textContent ?? '', /2 upcoming viewings/);
        assert.match(alert.textContent ?? '', /Finish or cancel these first/);
        assert.deepEqual(changed, [], 'a refused change is never reported as done');

        await act(async () => { buttonNamed(dom.document, 'Try again')!.click(); });
        assert.deepEqual(requests, [['property-1', 'unpublish'], ['property-1', 'unpublish']]);
        assert.deepEqual(changed, ['Listing unpublished. It is no longer public.']);
    } finally {
        dom.restore();
    }
});

test('a 503 and the plan limit each show their own message and keep the dialog open', async () => {
    const dom = installDOM();
    try {
        const changed: string[] = [];
        renderModal(dom, 'mark_sold', async () => refusal({ error: 'unavailable', status: 503, code: 'booking_activity_unavailable' }), (message) => changed.push(message));
        await act(async () => { buttonNamed(dom.document, 'Mark as let')!.click(); });
        assert.match(dom.document.querySelector('[role="alert"]')?.textContent ?? '', /Nothing was changed because we could not confirm/);
        assert.deepEqual(changed, []);
    } finally {
        dom.restore();
    }

    const limitDom = installDOM();
    try {
        renderModal(limitDom, 'republish', async () => refusal({ error: 'published property limit reached', status: 409 }));
        await act(async () => { buttonNamed(limitDom.document, 'Republish')!.click(); });
        const alert = limitDom.document.querySelector('[role="alert"]');
        assert.match(alert?.textContent ?? '', /Plan limit reached/);
        assert.equal(alert?.querySelector('a')?.getAttribute('href'), '/manager/subscription');
    } finally {
        limitDom.restore();
    }
});

test('buttons are offered only for the actions core accepts and are disabled while a dialog is open', () => {
    const noop = () => undefined;
    const labelled = (listing: Parameters<typeof ManagerListingActionButtons>[0]['listing'], disabled = false) => renderToStaticMarkup(
        <ManagerListingActionButtons listing={listing} variant="labelled" disabled={disabled} onSelect={noop} />,
    );

    const live = labelled({ title: 'Flat 4', status: 'published', listingType: 'rent', publishedAt: '2026-03-01T12:00:00Z' });
    assert.match(live, />Unpublish</);
    assert.match(live, />Mark let</);
    assert.doesNotMatch(live, /Republish/);
    assert.match(labelled({ title: 'Villa', status: 'available', listingType: 'sale' }), />Mark sold</);

    const unpublished = labelled({ title: 'Flat 4', status: 'draft', listingType: 'rent', publishedAt: '2026-03-01T12:00:00Z' });
    assert.match(unpublished, />Republish</);
    assert.doesNotMatch(unpublished, /Unpublish|Mark/);

    for (const listing of [
        { title: 'x', status: 'draft' },
        { title: 'x', status: 'pending_approval' },
        { title: 'x', status: 'suspended', publishedAt: '2026-03-01T12:00:00Z' },
        { title: 'x', status: 'sold', listingType: 'sale' },
        { title: 'x', status: 'rented' },
    ]) {
        assert.equal(labelled(listing), '', `${listing.status} has no manager action`);
    }

    assert.match(labelled({ title: 'Flat 4', status: 'published' }, true), /disabled=""/);
    const icon = renderToStaticMarkup(<ManagerListingActionButtons listing={{ title: 'Flat 4', status: 'published', listingType: 'sale' }} variant="icon" onSelect={noop} />);
    assert.match(icon, /aria-label="Unpublish Flat 4"/);
    assert.match(icon, /aria-label="Mark sold Flat 4"/);
});
