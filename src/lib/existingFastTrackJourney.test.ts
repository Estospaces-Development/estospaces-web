import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    describeExistingFastTrackJourney,
    findActiveJourneyForProperty,
    formatJourneyStartedLabel,
    isExistingJourneyOverdue,
    resolveSelectedHomeFastTrackActionLabel,
} from '@/lib/existingFastTrackJourney';

const NOW = Date.parse('2026-09-24T21:50:00Z');

// Shape of the reused July case from QA-MB-20260925-01-002.
const julyCase = (overrides: Record<string, unknown> = {}) => ({
    caseId: 'case-95979976',
    propertyId: 'property-selected',
    stage: 'viewing' as const,
    journeyMode: 'rent' as const,
    submittedAt: '2026-07-02T12:00:00Z',
    expiresAt: '2026-07-03T12:00:00Z',
    hoursRemaining: 0,
    overdue: false,
    workspaceFinalStatus: 'active' as const,
    finalStatus: 'in_progress' as const,
    brokerRequestId: undefined as string | undefined,
    leadId: 'lead-9c92cce6',
    ...overrides,
});

test('reused July case is described as the existing, overdue journey (QA-MB-20260925-01-002 user side)', () => {
    const summary = describeExistingFastTrackJourney(julyCase(), {
        brokerRequestId: 'request-september',
        leadId: 'lead-c7753b2b',
    }, NOW);

    assert.equal(summary.heading, 'Your existing 24-hour journey');
    assert.equal(summary.startedLabel, 'Started 2 Jul 2026');
    assert.equal(summary.stageLabel, 'Viewing');
    assert.equal(summary.overdue, true);
    assert.equal(summary.timingLabel, 'Deadline passed');
    assert.equal(summary.linkLabel, 'Started separately from this agent request');
    assert.equal(summary.summary, 'Started 2 Jul 2026 · Viewing stage · Deadline passed · Started separately from this agent request');
    assert.match(summary.notice, /existing journey/);
    assert.match(summary.notice, /no new 24-hour clock has started/i);
    assert.doesNotMatch(`${summary.summary} ${summary.notice}`, /new 24-hour (case|journey) (was )?(created|started)|24h left/i);
});

test('existing journey link reflects the request or lead it belongs to', () => {
    assert.equal(
        describeExistingFastTrackJourney(julyCase({ brokerRequestId: 'request-1' }), { brokerRequestId: 'request-1' }, NOW).linkLabel,
        'Linked to this agent request',
    );
    assert.equal(
        describeExistingFastTrackJourney(julyCase(), { leadId: 'lead-new' }, NOW).linkLabel,
        'Linked to an earlier enquiry',
    );
    assert.equal(describeExistingFastTrackJourney(julyCase(), { leadId: 'lead-9c92cce6' }, NOW).linkLabel, null);
    assert.equal(
        describeExistingFastTrackJourney(julyCase({ brokerRequestId: 'request-1' }), {}, NOW).linkLabel,
        'Linked to your agent request',
    );
});

test('a case still inside its window shows hours left and no overdue flag', () => {
    const summary = describeExistingFastTrackJourney(julyCase({
        stage: 'documents',
        submittedAt: '2026-09-24T20:00:00Z',
        expiresAt: '2026-09-25T20:00:00Z',
        hoursRemaining: 22,
    }), {}, NOW);
    assert.equal(summary.overdue, false);
    assert.equal(summary.timingLabel, '22h left');
    assert.equal(summary.stageLabel, 'Documents');
    assert.match(summary.notice, /No new 24-hour clock has started/);
});

test('overdue uses the server flag or a passed deadline, and never for finished cases', () => {
    assert.equal(isExistingJourneyOverdue(julyCase({ overdue: true, expiresAt: undefined }), NOW), true);
    assert.equal(isExistingJourneyOverdue(julyCase({ expiresAt: '2026-09-25T00:00:00Z' }), NOW), false);
    assert.equal(isExistingJourneyOverdue(julyCase({ workspaceFinalStatus: 'completed', finalStatus: 'completed' }), NOW), false);
    assert.equal(formatJourneyStartedLabel(''), null);
    assert.equal(describeExistingFastTrackJourney(julyCase({ stage: 'decision', journeyMode: 'sale' }), {}, NOW).stageLabel, 'Offer');
});

test('selected-home CTA says continue when the user already has an active case for that home', () => {
    const cases = [
        julyCase({ propertyId: 'property-other' }),
        julyCase({ caseId: 'case-done', workspaceFinalStatus: 'completed', finalStatus: 'completed' }),
        julyCase(),
    ];
    const existing = findActiveJourneyForProperty(cases, 'property-selected');
    assert.equal(existing?.caseId, 'case-95979976');
    assert.equal(findActiveJourneyForProperty(cases, 'property-none'), null);
    assert.equal(findActiveJourneyForProperty(cases, null), null);

    assert.equal(resolveSelectedHomeFastTrackActionLabel({ existingCase: existing, hasSelectedProperty: true }), 'Continue existing 24-hour journey');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ linkedCaseId: 'case-1', existingCase: existing, hasSelectedProperty: true }), 'Continue in fast-track');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ existingCase: null, hasSelectedProperty: true }), 'Request fast-track for selected home');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ hasSelectedProperty: false }), 'Open matched agent request');
});

test('user entry points render the existing-journey state', () => {
    const root = process.cwd();
    const widget = readFileSync(resolve(root, 'src/components/dashboard/BrokerRequestWidget.tsx'), 'utf8');
    const modal = readFileSync(resolve(root, 'src/components/dashboard/PropertyFastTrackModal.tsx'), 'utf8');
    const timeline = readFileSync(resolve(root, 'src/components/dashboard/ApplicationTimelineWidget.tsx'), 'utf8');

    assert.match(widget, /findActiveJourneyForProperty\(existingJourneyCases, selectedPropertyId\)/);
    assert.match(widget, /existingSelectedHomeJourneySummary\.notice/);
    assert.match(widget, /&case=\$\{existingSelectedHomeJourney\.caseId\}/);
    assert.match(modal, /existingJourney\.notice/);
    assert.match(modal, /existingJourney\.summary/);
    assert.match(modal, /Continue your existing journey for this home\./);
    assert.match(modal, /return existingJourney\.timingLabel/);
    assert.match(timeline, /Continue existing 24-hour journey/);
    assert.doesNotMatch(timeline, /'Continue 24-hour journey'/);
});
