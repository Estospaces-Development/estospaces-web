import assert from 'node:assert/strict';
import test from 'node:test';

import type { FastTrackCase } from '@/services/fastTrackService';

import {
    buildFastTrackThreadRecipientLabel,
    describeFastTrackWorkspaceFocus,
    describeFastTrackWorkspaceStatus,
    resolveFastTrackSelectionCaseId,
    resolveFastTrackThreadRecipientId,
} from './fastTrackWorkspace';

const buildCase = (overrides: Partial<FastTrackCase> = {}): FastTrackCase => ({
    id: 'case-record-1',
    caseId: 'case-1',
    propertyId: 'property-1',
    propertyTitle: 'Example property',
    propertyType: 'Apartment',
    clientId: 'user-1',
    clientName: 'Example user',
    managerId: 'manager-1',
    listingType: 'rent',
    journeyMode: 'rent',
    journeyType: 'rent',
    submittedAt: '2026-04-14T00:00:00Z',
    hoursRemaining: 20,
    overdue: false,
    stage: 'selected',
    currentStep: 'property_selected',
    backendCurrentStep: 'property_selected',
    workspaceFinalStatus: 'active',
    finalStatus: 'in_progress',
    documents: {
        identityProof: 'pending',
        addressProof: 'pending',
        items: [],
        allUploaded: false,
        allApproved: false,
    },
    viewing: { status: 'pending' },
    decision: { mode: 'rent', status: 'pending' },
    agreement: { status: 'pending', paymentStatus: 'not_requested' },
    handover: { status: 'pending' },
    activity: [],
    documentPhase: 'not_requested',
    ...overrides,
});

test('selection resolves legacy query ids to the matching case', () => {
    const cases = [
        buildCase({
            caseId: 'case-a',
            leadId: 'lead-a',
            propertyId: 'property-a',
            applicationId: 'application-a',
            viewingId: 'viewing-a',
            contractId: 'contract-a',
            paymentId: 'payment-a',
        }),
        buildCase({
            caseId: 'case-b',
            leadId: 'lead-b',
            propertyId: 'property-b',
            applicationId: 'application-b',
            viewingId: 'viewing-b',
            contractId: 'contract-b',
            paymentId: 'payment-b',
        }),
    ];

    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('application=application-b'), null), 'case-b');
    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('viewing=viewing-a'), null), 'case-a');
    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('contract=contract-b'), null), 'case-b');
    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('payment=payment-a'), null), 'case-a');
});

test('selection falls back to previous case when the query does not match', () => {
    const cases = [buildCase({ caseId: 'case-a' }), buildCase({ caseId: 'case-b' })];
    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('application=missing'), 'case-b'), 'case-b');
});

test('thread recipient resolution stays case-role aware', () => {
    const baseCase = buildCase({ clientId: 'user-1', managerId: 'manager-1' });
    assert.equal(resolveFastTrackThreadRecipientId('user', 'user-1', baseCase), 'manager-1');
    assert.equal(resolveFastTrackThreadRecipientId('manager', 'manager-1', baseCase), 'user-1');
    assert.equal(resolveFastTrackThreadRecipientId('admin', 'admin-1', baseCase), 'user-1');
    assert.equal(resolveFastTrackThreadRecipientId('user', 'manager-1', baseCase), null);
    assert.equal(buildFastTrackThreadRecipientLabel('user', baseCase), 'Your helper');
    assert.equal(buildFastTrackThreadRecipientLabel('manager', baseCase), 'Example user');
});

test('workspace focus and status copy stays single-workspace oriented', () => {
    const documentsCase = buildCase({ stage: 'documents' });
    assert.equal(describeFastTrackWorkspaceFocus(documentsCase, 'user'), 'Upload the core files');
    assert.match(describeFastTrackWorkspaceStatus(documentsCase, 'manager'), /same page|same case/i);

    const agreementCase = buildCase({
        stage: 'agreement',
        agreement: { status: 'sent', paymentStatus: 'requested', amountDue: 1200 },
    });
    assert.equal(describeFastTrackWorkspaceFocus(agreementCase, 'manager'), 'Confirm payment and move to handover');

    const completedCase = buildCase({ workspaceFinalStatus: 'completed' });
    assert.equal(describeFastTrackWorkspaceFocus(completedCase, 'admin'), 'Case finished');
    assert.equal(describeFastTrackWorkspaceStatus(completedCase, 'admin'), 'Every core step was completed inside this workspace.');
});
