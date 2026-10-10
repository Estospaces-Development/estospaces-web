import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { PropertyProvider, useProperties } from '@/contexts/PropertyContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';
import { clearAuthToken, setAuthToken } from '@/lib/authToken';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

type ContextValue = ReturnType<typeof useProperties>;

const captureManagerContext = (): ContextValue => {
    let captured: ContextValue | null = null;
    const Capture = () => {
        captured = useProperties();
        return null;
    };
    renderToStaticMarkup(
        <MemoryRouter initialEntries={['/manager/dashboard/properties']}>
            <WorkspaceSyncProvider>
                <PropertyProvider scope="manager" enabled={false}>
                    <Capture />
                </PropertyProvider>
            </WorkspaceSyncProvider>
        </MemoryRouter>,
    );
    assert.ok(captured);
    return captured;
};

test('the context sends the action to core and returns core\'s answer, accepted or refused', async () => {
    const originalFetch = globalThis.fetch;
    const requests: Array<{ url: string; method?: string; body: unknown }> = [];
    const answers = [
        { status: 200, body: { success: true, data: { id: 'property-1', title: 'Flat 4', status: 'draft', listing_type: 'rent', published_at: '2026-03-01T12:00:00Z' } } },
        { status: 409, body: { success: false, code: 'property_has_active_booking_work', error: 'This property cannot be marked as let while it has active bookings (1 upcoming viewing).', data: { upcoming_viewings: 1 } } },
    ];
    setAuthToken('manager-session-token');
    globalThis.fetch = async (input, init) => {
        requests.push({ url: String(input), method: init?.method, body: JSON.parse(String(init?.body ?? '{}')) });
        const answer = answers.shift()!;
        return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { 'Content-Type': 'application/json' } });
    };
    try {
        const context = captureManagerContext();
        const accepted = await context.changeListingStatus('property-1', 'unpublish');
        assert.equal(accepted.error, null);
        assert.equal(accepted.data?.status, 'draft');

        const refused = await context.changeListingStatus('property-1', 'mark_sold');
        assert.equal(refused.data, null);
        assert.equal(refused.status, 409);
        assert.deepEqual(refused.activeWork, { upcoming_viewings: 1 });

        assert.deepEqual(requests.map((request) => [request.method, request.body]), [
            ['PUT', { action: 'unpublish' }],
            ['PUT', { action: 'mark_sold' }],
        ]);
        assert.match(requests[0].url, /\/api\/v1\/properties\/property-1\/manager-status$/);
    } finally {
        globalThis.fetch = originalFetch;
        clearAuthToken();
    }
});

test('the inventory and the detail page open the same confirmation and refresh from the server after a change', () => {
    const list = read('src/pages/manager/dashboard/properties/page.tsx');
    assert.match(list, /changeListingStatus,/);
    // Grid hover actions and the table row both offer the actions.
    assert.equal((list.match(/<ManagerListingActionButtons/g) ?? []).length, 2);
    assert.match(list, /variant="floating"/);
    assert.match(list, /variant="icon"/);
    assert.match(list, /<ManagerListingStatusModal[\s\S]*?onConfirm=\{changeListingStatus\}/);
    assert.match(list, /onChanged=\{\(message\) => \{\s*setPendingListingAction\(null\);\s*appToast\.success\(message\);/);

    const detail = read('src/pages/manager/dashboard/properties/[id]/page.tsx');
    assert.match(detail, /<ManagerListingActionButtons[\s\S]*?variant="labelled"/);
    assert.match(detail, /<ManagerListingStatusModal[\s\S]*?onConfirm=\{changeListingStatus\}/);
    // The saved state is re-read once core accepted the change.
    assert.match(detail, /appToast\.success\(message\);[\s\S]*?void detailQuery\.refetch\(\);/);
    // An owner-unpublished listing is brought back with Republish, not sent to approval by Publish Property.
    assert.match(detail, /property\.draft === true\) && !isOwnerUnpublished\(property\) && \(/);
});

test('the context re-reads the inventory through the workspace sync instead of trusting its own copy', () => {
    const source = read('src/contexts/PropertyContext.tsx');
    assert.match(source, /changeListingStatus: async \(id: string, action: propertyService\.ManagerListingAction\) => \{[\s\S]*?propertyService\.updateManagerPropertyStatus\(id, action\);[\s\S]*?if \(result\.data\) \{[\s\S]*?reason: "property-status-changed"/);
    // No global loading flag (the dialog has its own), and a refused change never touches the loaded list.
    const body = source.slice(source.indexOf('changeListingStatus: async'), source.indexOf('duplicateProperty: async'));
    assert.ok(body.length > 0);
    assert.doesNotMatch(body, /setLoading\(/);
    assert.equal((body.match(/setProperties\(/g) ?? []).length, 1);
});

test('manager pages still never force a delete', () => {
    for (const path of ['src/pages/manager/dashboard/properties/page.tsx', 'src/pages/manager/dashboard/properties/[id]/page.tsx', 'src/components/manager/ManagerListingStatusModal.tsx']) {
        assert.doesNotMatch(read(path), /force: true|ForceDeletePropertyModal/, path);
    }
});
