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
            matched_broker: {
                id: 'broker-1',
                name: 'Asha Realty',
            },
        } as any),
        {
            title: 'Broker matched',
            subtitle: 'Matched with Asha Realty',
            helper: 'Broker accepted your request',
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
                title: 'Property handoff comes next',
                description: 'The 24-hour property fast-track starts only after your broker shares property options and you choose one.',
            },
        ],
    );
});
