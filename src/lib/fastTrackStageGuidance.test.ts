import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getPurchaseWorkspaceLabel,
    hasPendingRentFinanceTasks,
    resolveFastTrackStageGuidance,
} from './fastTrackStageGuidance';

test('viewing completed fast-track guidance sends completed buy journeys into the purchase workspace', () => {
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
        actionLabel: 'Open buyer qualification workspace',
        description: 'Open the applications workspace to record proof of funds, the MIP, and the live offer.',
        target: 'applications',
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

    assert.equal(guidance?.target, 'billing');
    assert.equal(guidance?.actionLabel, 'Open billing workspace');
});

test('purchase workspace label follows the live sale lane', () => {
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: {} as any, liveStage: null }), 'Open sale progression workspace');
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: null, liveStage: 'buyer_qualification' } as any), 'Open buyer qualification workspace');
    assert.equal(getPurchaseWorkspaceLabel({ saleProgression: null, liveStage: 'offer' } as any), 'Open offer workspace');
});

test('pending rent finance task detection only flags deposit and rent blockers', () => {
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
    }), true);

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
