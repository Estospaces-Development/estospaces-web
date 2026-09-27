import assert from 'node:assert/strict';
import test from 'node:test';

import { getManagerWorkspaceAction } from '@/lib/brokerDispatchPresentation';
import { getManagerFastTrackRequestContext } from '@/lib/managerFastTrackRequestNavigation';
import {
    findRequestContextCase,
    findRequestContextCaseMatch,
    getFastTrackStartSuccessMessage,
    getRequestContextCaseHeading,
    isReusableFastTrackCase,
    leadMatchesRequestContext,
} from '@/lib/manualFastTrackStart';

const activeCase = (overrides: Record<string, unknown> = {}) => ({
    id: 'case-existing',
    caseId: 'case-existing',
    finalStatus: 'in_progress' as const,
    propertyId: 'property-1',
    clientId: 'user-1',
    leadId: 'lead-old',
    brokerRequestId: undefined as string | undefined,
    ...overrides,
});

test('overdue in-progress cases count as existing because the backend reuses them', () => {
    assert.equal(isReusableFastTrackCase({ finalStatus: 'in_progress' }), true);
    assert.equal(isReusableFastTrackCase({ finalStatus: 'completed' }), false);
    assert.equal(isReusableFastTrackCase({ finalStatus: 'rejected' }), false);
});

test('selected-request shortcut resolves the existing case by client and property (QA-MB-20260923-01-038)', () => {
    // Broker request whose record does not carry the case ID, as observed on dev.
    const action = getManagerWorkspaceAction({
        id: 'request-0817',
        user_id: 'user-1',
        handoff_status: 'property_selected',
        selected_property_id: 'property-1',
        selected_lead_id: 'lead-selected',
    } as any);
    assert.equal(action.label, 'Start Fast Track workflow');
    assert.ok(action.path);

    const context = getManagerFastTrackRequestContext(new URL(action.path, 'https://app.test').search);
    assert.deepEqual(context, {
        brokerRequestId: 'request-0817',
        leadId: 'lead-selected',
        clientId: 'user-1',
        propertyId: 'property-1',
    });

    const cases = [
        activeCase({ id: 'case-other', caseId: 'case-other', clientId: 'user-2' }),
        activeCase(),
    ];
    assert.equal(findRequestContextCase(cases, context)?.caseId, 'case-existing');
});

test('request context prefers the broker request, then the lead, then client and property', () => {
    const byRequest = activeCase({ id: 'case-request', caseId: 'case-request', brokerRequestId: 'request-1', clientId: 'user-9' });
    const byLead = activeCase({ id: 'case-lead', caseId: 'case-lead', leadId: 'lead-1', clientId: 'user-8' });
    const byPair = activeCase({ id: 'case-pair', caseId: 'case-pair' });
    const cases = [byPair, byLead, byRequest];

    assert.equal(findRequestContextCase(cases, { brokerRequestId: 'request-1', leadId: 'lead-1', clientId: 'user-1', propertyId: 'property-1' })?.id, 'case-request');
    assert.equal(findRequestContextCase(cases, { leadId: 'lead-1', clientId: 'user-1', propertyId: 'property-1' })?.id, 'case-lead');
    assert.equal(findRequestContextCase(cases, { clientId: 'user-1', propertyId: 'property-1' })?.id, 'case-pair');
});

test('request context never resolves a finished case or a partial match', () => {
    assert.equal(findRequestContextCase([activeCase({ finalStatus: 'completed' })], { clientId: 'user-1', propertyId: 'property-1' }), null);
    assert.equal(findRequestContextCase([activeCase()], { clientId: 'user-1' }), null);
    assert.equal(findRequestContextCase([activeCase()], { brokerRequestId: 'request-unknown' }), null);
    assert.equal(findRequestContextCase([activeCase()], null), null);
    assert.equal(findRequestContextCase([activeCase()], {}), null);
});

test('lead filter matches the selected request by field instead of the broker-request UUID text', () => {
    const lead = { id: 'lead-selected', broker_request_id: undefined, user_id: 'user-1', property_id: 'property-1' };
    const context = { brokerRequestId: 'request-0817', leadId: 'lead-other', clientId: 'user-1', propertyId: 'property-1' };

    assert.equal(leadMatchesRequestContext(lead, context), true);
    assert.equal(leadMatchesRequestContext({ ...lead, id: 'lead-x', user_id: 'user-2' }, context), false);
    assert.equal(leadMatchesRequestContext({ ...lead, id: 'lead-x', user_id: 'user-2', broker_request_id: 'request-0817' }, context), true);
    assert.equal(leadMatchesRequestContext({ ...lead, id: 'lead-other', user_id: 'user-2' }, context), true);
    assert.equal(leadMatchesRequestContext(lead, null), true);
    assert.equal(leadMatchesRequestContext({ ...lead, user_id: 'user-2' }, { clientId: 'user-1' }), false);
    assert.equal(leadMatchesRequestContext(lead, { clientId: 'user-1' }), true);
});

test('start feedback distinguishes a reused case from a new one (QA-MB-20260925-01-002)', () => {
    assert.equal(getFastTrackStartSuccessMessage({ reused: false }), '24-hour fast-track case created successfully.');
    const reused = getFastTrackStartSuccessMessage({ reused: true });
    assert.match(reused, /^Opened existing Fast Track case/);
    assert.match(reused, /No new 24-hour case was created/);
    assert.doesNotMatch(reused, /created successfully/);
    assert.match(
        getFastTrackStartSuccessMessage({ reused: true, requestedLeadId: 'lead-new' }),
        /stays linked to its original lead/,
    );
});

test('shortcut banner wording follows how the case matched (verifier F8)', () => {
    const cases = [
        activeCase({ id: 'case-request', brokerRequestId: 'request-1', clientId: 'user-9' }),
        activeCase({ id: 'case-lead', leadId: 'lead-1', clientId: 'user-8' }),
        activeCase({ id: 'case-pair' }),
    ];
    assert.equal(findRequestContextCaseMatch(cases, { brokerRequestId: 'request-1' })?.matchedBy, 'broker_request');
    assert.equal(findRequestContextCaseMatch(cases, { brokerRequestId: 'request-x', leadId: 'lead-1' })?.matchedBy, 'lead');
    const pair = findRequestContextCaseMatch(cases, { brokerRequestId: 'request-x', clientId: 'user-1', propertyId: 'property-1' });
    assert.equal(pair?.matchedBy, 'client_property');
    assert.equal(pair?.caseItem.id, 'case-pair');

    assert.equal(getRequestContextCaseHeading('broker_request'), 'This request already has an active 24-hour case');
    assert.match(getRequestContextCaseHeading('lead'), /^This lead already has/);
    const pairHeading = getRequestContextCaseHeading('client_property');
    assert.doesNotMatch(pairHeading, /This request/);
    assert.match(pairHeading, /client already has an active 24-hour case for this property/);
});
