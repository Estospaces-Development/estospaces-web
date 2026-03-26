import assert from 'node:assert/strict';
import test from 'node:test';
import {
    getDispatchWorkspaceSummary,
    getMatchedExperienceSteps,
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
