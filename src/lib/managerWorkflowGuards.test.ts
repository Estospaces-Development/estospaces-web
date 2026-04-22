import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getManagerCreateContractGuard,
    getManagerOfferGuard,
    getManagerSaleProgressionGuard,
    getManagerViewingActionGuard,
} from './managerWorkflowGuards';

test('schedule viewing guard blocks fast-track scheduling until documents are verified', () => {
    const guard = getManagerViewingActionGuard({
        action: 'schedule_viewing',
        documentsVerified: false,
        hasViewing: false,
    });

    assert.equal(guard.canRun, false);
    assert.equal(guard.status, 'blocked');
    assert.equal(guard.target, 'documents');
});

test('offer guard surfaces property-readiness outages as unavailable workflow states', () => {
    const guard = getManagerOfferGuard({
        hasManagerLink: true,
        hasPropertyLink: true,
        workflowError: 'Property compliance readiness is temporarily unavailable. Please try again once the compliance service is reachable.',
        qualificationComplete: true,
        amlComplete: true,
        propertyOfferReady: false,
        propertyReadinessReason: null,
        propertyReadinessBlockers: [],
        hasValidAmount: true,
    });

    assert.equal(guard.canRun, false);
    assert.equal(guard.status, 'unavailable');
    assert.equal(guard.title, 'Property readiness temporarily unavailable');
    assert.equal(guard.target, 'seller');
});

test('contract guard points managers back to property readiness until the pack is contract-ready', () => {
    const guard = getManagerCreateContractGuard({
        hasContract: false,
        applicationApproved: true,
        hasPropertyLink: true,
        rentContractReady: false,
        propertyReadinessReason: 'The property compliance pack still needs to be contract-ready before the contract can be created.',
        propertyReadinessBlockers: [],
    });

    assert.equal(guard.canRun, false);
    assert.equal(guard.status, 'blocked');
    assert.equal(guard.target, 'property_readiness');
});

test('sale progression guard requires managers to stay in the purchase workspace for unsupported stages', () => {
    const guard = getManagerSaleProgressionGuard({
        hasSaleProgression: true,
        canProgressFromFastTrack: false,
    });

    assert.equal(guard.canRun, false);
    assert.equal(guard.status, 'blocked');
    assert.equal(guard.target, 'applications');
});
