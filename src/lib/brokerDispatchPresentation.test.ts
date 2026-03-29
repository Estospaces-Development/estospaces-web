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
            title: 'Broker matched',
            subtitle: 'Matched with Asha Realty',
            helper: 'Your broker is preparing a property shortlist',
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
                description: 'Asha Realty accepted your rent request and the live dispatch queue is now locked.',
            },
            {
                id: 'details',
                title: 'Request details stay attached',
                description: 'Your location, budget, and requirements remain in this workspace so the matched broker sees the same brief you submitted.',
            },
            {
                id: 'handoff',
                title: 'Broker is preparing options',
                description: 'The 24-hour property fast-track starts only after your broker shares property options and you choose one.',
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
            title: 'Portfolio shared',
            subtitle: '2 property options ready to review',
            helper: 'Choose one property to start the 24-hour fast-track',
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
            title: 'Property selected',
            subtitle: 'Canal View Loft is now linked to your live workspace',
            helper: 'Continue in the selected property or fast-track workspace',
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
            helper: 'Budget 450000 - 550000 is attached to this live brief',
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
