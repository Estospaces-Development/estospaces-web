import assert from 'node:assert/strict';
import test from 'node:test';
import {
    formatWorkspaceReference,
    getDispatchWorkspaceSummary,
    getManagerTrackerResponseCountdown,
    getManagerWorkspaceAction,
    getManagerWorkspaceStateLabel,
    getMatchedExperienceSteps,
    selectManagerTrackerItems,
    sortManagerTrackerItems,
} from './brokerDispatchPresentation';

test('matched broker summary highlights the acceptance state', () => {
    assert.deepEqual(
        getDispatchWorkspaceSummary({
            request_type: 'buy',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'awaiting_portfolio',
            matched_broker: {
                id: 'broker-1',
                name: 'Asha Realty',
            },
        } as any),
        {
            title: 'Broker found',
            subtitle: 'Matched with Asha Realty',
            helper: 'Your broker is preparing home choices.',
        },
    );
});

test('matched experience steps keep the user in the same live workflow', () => {
    assert.deepEqual(
        getMatchedExperienceSteps({
            request_type: 'rent',
            fast_track_enabled: true,
            matched_broker: {
                id: 'broker-1',
                name: 'Asha Realty',
            },
        } as any),
        [
            {
                id: 'confirmed',
                title: 'Broker confirmed',
                description: 'Asha Realty accepted your rent request and is now helping you.',
            },
            {
                id: 'details',
                title: 'Your request details stay here',
                description: 'Your location, budget, and requirements stay attached so the broker sees the same details you shared.',
            },
            {
                id: 'handoff',
                title: 'Home choices are on the way',
                description: 'Your 24-hour journey starts after your broker shares home choices and you pick one.',
            },
        ],
    );
});

test('workspace summary reflects portfolio share and property selection states', () => {
    assert.deepEqual(
        getDispatchWorkspaceSummary({
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' }, { id: 'share-2' }],
        } as any),
        {
            title: 'Home choices ready',
            subtitle: '2 home choices ready to review',
            helper: 'Choose one home to start your 24-hour journey.',
        },
    );

    assert.deepEqual(
        getDispatchWorkspaceSummary({
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
            selected_fast_track_case_id: 'case-1',
            selected_property: {
                id: 'property-1',
                title: 'Canal View Loft',
            },
        } as any),
        {
            title: 'Home selected',
            subtitle: 'Canal View Loft is ready for your 24-hour journey',
            helper: 'Continue with your chosen home.',
        },
    );
});

test('pending request summary keeps the submitted area and budget visible', () => {
    assert.deepEqual(
        getDispatchWorkspaceSummary({
            request_type: 'buy',
            status: 'open',
            dispatch_status: 'wave_1',
            location: 'Fresh Flow District',
            location_postcode: 'SW1A 1AA',
            budget: '450000 - 550000',
        } as any),
        {
            title: 'Request sent',
            subtitle: 'Searching brokers near Fresh Flow District - SW1A 1AA',
            helper: 'Budget 450000 - 550000 is included in your request.',
        },
    );
});

test('manager workspace helpers keep same-user repeated sessions distinguishable', () => {
    assert.equal(formatWorkspaceReference('c43a0f98-2882-4d00-aa20-efa1e13fb684'), 'C43A0F98');

    assert.deepEqual(
        getManagerWorkspaceAction({
            id: 'c43a0f98-2882-4d00-aa20-efa1e13fb684',
            status: 'matched',
            dispatch_status: 'broker_matched',
            handoff_status: 'awaiting_portfolio',
        } as any),
        {
            label: 'Share property shortlist',
        },
    );

    assert.equal(
        getManagerWorkspaceStateLabel({
            handoff_status: 'awaiting_portfolio',
            status: 'matched',
            dispatch_status: 'broker_matched',
        } as any),
        'Share needed',
    );

    assert.deepEqual(
        getManagerWorkspaceAction({
            handoff_status: 'portfolio_shared',
            property_shares: [{ id: 'share-1' }],
        } as any),
        {
            label: 'Update shared shortlist',
        },
    );

    assert.deepEqual(
        getManagerWorkspaceAction({
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
            selected_lead_id: 'lead-1',
            selected_fast_track_case_id: 'case-1',
        } as any),
        {
            label: 'Open property workflow',
            path: '/manager/fast-track?case=case-1&lead=lead-1&property=property-1',
        },
    );

    assert.deepEqual(
        getManagerWorkspaceAction({
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
            selected_lead_id: 'lead-1',
        } as any),
        {
            label: 'Open lead workflow',
            path: '/manager/leads?lead=lead-1&property=property-1',
        },
    );

    assert.equal(
        getManagerWorkspaceStateLabel({
            handoff_status: 'property_selected',
            selected_property_id: 'property-1',
        } as any),
        'Property selected',
    );
});

test('manager tracker countdown only applies before a broker has matched the request', () => {
    const futureDeadline = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    assert.equal(
        getManagerTrackerResponseCountdown({
            status: 'matched',
            dispatch_status: 'broker_matched',
            response_deadline_at: futureDeadline,
        } as any),
        undefined,
    );

    const pendingSeconds = getManagerTrackerResponseCountdown({
        status: 'open',
        dispatch_status: 'wave_1',
        response_deadline_at: futureDeadline,
    } as any);

    assert.equal(typeof pendingSeconds, 'number');
    assert.ok((pendingSeconds || 0) > 0);
});

test('manager tracker sorting keeps share-needed workspaces ahead of completed downstream leads', () => {
    const sorted = sortManagerTrackerItems([
        {
            id: 'lead-completed-newer',
            requestKind: 'lead',
            status: 'responded',
            trackerLane: 'lead_responded',
            timestamp: new Date('2026-03-28T11:30:00.000Z'),
        },
        {
            id: 'workspace-share-needed',
            requestKind: 'offer',
            status: 'responded',
            trackerLane: 'share_needed',
            timestamp: new Date('2026-03-28T11:20:00.000Z'),
        },
    ]);

    assert.deepEqual(sorted.map((item) => item.id), ['workspace-share-needed', 'lead-completed-newer']);
});

test('manager tracker selection reserves visible slots for the newest share-needed workspaces', () => {
    const selected = selectManagerTrackerItems([
        {
            id: 'lead-1',
            requestKind: 'lead',
            status: 'responded',
            trackerLane: 'lead_responded',
            timestamp: new Date('2026-03-28T11:30:00.000Z'),
        },
        {
            id: 'lead-2',
            requestKind: 'lead',
            status: 'responded',
            trackerLane: 'lead_responded',
            timestamp: new Date('2026-03-28T11:29:00.000Z'),
        },
        {
            id: 'lead-3',
            requestKind: 'lead',
            status: 'responded',
            trackerLane: 'lead_responded',
            timestamp: new Date('2026-03-28T11:28:00.000Z'),
        },
        {
            id: 'lead-4',
            requestKind: 'lead',
            status: 'responded',
            trackerLane: 'lead_responded',
            timestamp: new Date('2026-03-28T11:27:00.000Z'),
        },
        {
            id: 'workspace-newest',
            requestKind: 'offer',
            status: 'responded',
            trackerLane: 'share_needed',
            timestamp: new Date('2026-03-28T11:31:00.000Z'),
        },
        {
            id: 'workspace-next',
            requestKind: 'offer',
            status: 'responded',
            trackerLane: 'share_needed',
            timestamp: new Date('2026-03-28T11:26:00.000Z'),
        },
    ]);

    assert.deepEqual(selected.map((item) => item.id), ['workspace-newest', 'workspace-next', 'lead-1', 'lead-2']);
});
