import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getPurchaseWorkspaceLabel,
    hasPendingRentFinanceTasks,
    resolveFastTrackStageGuidance,
} from './fastTrackStageGuidance';

test('viewing completed fast-track guidance keeps completed buy journeys inside fast-track', () => {
    const guidance = resolveFastTrackStageGuidance({
        currentStep: 'viewing_completed',
        journeyType: 'buy',
        linkedJourney: {
            viewing: { status: 'completed' } as any,
            liveStage: 'buyer_qualification',
            primaryHeadline: 'Proof of funds / MIP',
            nextStep: 'Open the applications workspace to record proof of funds, the MIP, and the live offer.',
            saleProgression: null,
            contract: null,
            payments: [],
            invoices: [],
        },
    });

    assert.deepEqual(guidance, {
        title: 'Proof of funds / MIP',
        actionLabel: 'Continue in fast-track workspace',
        description: 'Proof of funds / MIP',
        target: 'fast_track',
    });
});

test('ready for contract rent guidance moves payment blockers into billing', () => {
    const guidance = resolveFastTrackStageGuidance({
        currentStep: 'ready_for_contract',
        journeyType: 'rent',
        linkedJourney: {
            primaryHeadline: 'Deposit and first-rent tasks',
            nextStep: 'Open the billing workspace to clear deposit or first-rent tasks and finish the move-in handoff.',
            saleProgression: null,
            viewing: null,
            contract: null,
            liveStage: null,
            payments: [
                { payment_type: 'security_deposit', status: 'pending' } as any,
            ],
            invoices: [],
        },
        hasPendingFinanceTasks: true,
    });

    assert.equal(guidance?.target, 'fast_track');
    assert.equal(guidance?.actionLabel, 'Continue in fast-track workspace');
});

test('purchase workspace label now points to the linked purchase details surface', () => {
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: {} as any, liveStage: null }), 'Open linked purchase details');
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: null, liveStage: 'buyer_qualification' } as any), 'Open linked purchase details');
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: null, liveStage: 'offer' } as any), 'Open linked purchase details');
});

test('pending rent finance task detection ignores rent blockers while payments are disabled', () => {
    assert.equal(hasPendingRentFinanceTasks({
        payments: [
            { payment_type: 'security_deposit', status: 'pending' } as any,
        ],
        invoices: [],
        contract: null,
        liveStage: null,
        nextStep: '',
        primaryHeadline: '',
        saleProgression: null,
        viewing: null,
    }), false);

    assert.equal(hasPendingRentFinanceTasks({
        payments: [
            { payment_type: 'admin_fee', status: 'pending' } as any,
        ],
        invoices: [
            { payment_type: 'first_rent', status: 'paid' } as any,
        ],
        contract: null,
        liveStage: null,
        nextStep: '',
        primaryHeadline: '',
        saleProgression: null,
        viewing: null,
    }), false);
});
