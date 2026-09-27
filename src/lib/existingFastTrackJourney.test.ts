import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
    describeExistingFastTrackJourney,
    describeRequestEntryJourney,
    findActiveJourneyForProperty,
    findRequestEntryJourney,
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
    // A linked case whose status is not loaded yet gets a neutral label.
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ linkedCaseId: 'case-1', hasSelectedProperty: true }), 'Open linked 24-hour journey');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({
        linkedCaseId: 'case-1',
        existingCase: existing,
        entryJourney: describeRequestEntryJourney(existing!, {}, NOW),
        hasSelectedProperty: true,
    }), 'Continue existing 24-hour journey');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({
        linkedCaseId: 'case-1',
        entryJourney: { actionLabel: 'View completed 24-hour journey' },
        hasSelectedProperty: true,
    }), 'View completed 24-hour journey');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ existingCase: null, hasSelectedProperty: true }), 'Request fast-track for selected home');
    assert.equal(resolveSelectedHomeFastTrackActionLabel({ hasSelectedProperty: false }), 'Open matched agent request');
});

test('user entry points render the existing-journey state', () => {
    const root = process.cwd();
    const widget = readFileSync(resolve(root, 'src/components/dashboard/BrokerRequestWidget.tsx'), 'utf8');
    const modal = readFileSync(resolve(root, 'src/components/dashboard/PropertyFastTrackModal.tsx'), 'utf8');
    const timeline = readFileSync(resolve(root, 'src/components/dashboard/ApplicationTimelineWidget.tsx'), 'utf8');

    assert.match(widget, /existingSelectedHomeJourneySummary\.text/);
    assert.match(widget, /describeRequestEntryJourney\(existingSelectedHomeJourney/);
    assert.match(widget, /&case=\$\{existingSelectedHomeJourney\.caseId\}/);
    assert.match(modal, /existingJourney\.notice/);
    assert.match(modal, /existingJourney\.summary/);
    assert.match(modal, /Continue your existing journey for this home\./);
    assert.match(modal, /return existingJourney\.timingLabel/);
    assert.match(timeline, /linkedJourney\?\.actionLabel \|\| 'Open linked 24-hour journey'/);
    assert.match(timeline, /primaryActionSummary: linkedJourney\?\.text/);
    assert.match(timeline, /findRequestEntryJourney\(fastTrackCases, \{ linkedCaseId: request\.selected_fast_track_case_id \}\)/);
    assert.match(timeline, /item\.primaryActionSummary/);
    assert.match(widget, /findRequestEntryJourney\(existingJourneyCases, \{ linkedCaseId: linkedFastTrackCaseId, propertyId: selectedPropertyId \}\)/);
    assert.match(widget, /requestIsMatched && \(selectedPropertyId \|\| linkedFastTrackCaseId\)/);
    assert.doesNotMatch(widget, /Continue your 24-hour journey/);
    const workspace = readFileSync(resolve(root, 'src/components/fast-track/FastTrackWorkspace.tsx'), 'utf8');
    assert.match(workspace, /return role === 'user' \? 'Deadline passed' : 'Overdue';/);
    assert.doesNotMatch(workspace, /'Needs attention'/);
    assert.doesNotMatch(timeline, /'Continue 24-hour journey'/);
});

test('request linked to a reused older case resolves that case and describes it (verifier N1)', () => {
    // The manager started from a new request; the service reused the July case
    // and linked it to the request, so selected_fast_track_case_id points at it.
    const cases = [
        julyCase({ caseId: 'case-new-home', propertyId: 'property-other' }),
        julyCase({ brokerRequestId: 'request-september' }),
    ];
    const linked = findRequestEntryJourney(cases, { linkedCaseId: 'case-95979976', propertyId: 'property-other' });
    assert.equal(linked?.caseId, 'case-95979976');
    const summary = describeExistingFastTrackJourney(linked!, { brokerRequestId: 'request-september' }, NOW);
    assert.equal(summary.summary, 'Started 2 Jul 2026 · Viewing stage · Deadline passed · Linked to this agent request');
    assert.match(summary.notice, /deadline has passed and no new 24-hour clock has started/);

    assert.equal(findRequestEntryJourney(cases, { linkedCaseId: 'case-unknown', propertyId: 'property-selected' }), null);
    assert.equal(findRequestEntryJourney(cases, { propertyId: 'property-other' })?.caseId, 'case-new-home');
});

test('linked closed cases are described as finished, never as a live journey (verifier F-1)', () => {
    const closedCases = [
        { name: 'completed', overrides: { workspaceFinalStatus: 'completed', finalStatus: 'completed', stage: 'handover' }, state: 'completed', label: 'Completed', action: 'View completed 24-hour journey', notice: 'This 24-hour journey is complete.' },
        { name: 'cancelled', overrides: { workspaceFinalStatus: 'cancelled', finalStatus: 'rejected' }, state: 'closed', label: 'Closed', action: 'View closed 24-hour journey', notice: 'This 24-hour journey was closed and is no longer active.' },
        { name: 'rejected (legacy)', overrides: { workspaceFinalStatus: undefined, finalStatus: 'rejected' }, state: 'closed', label: 'Closed', action: 'View closed 24-hour journey', notice: 'This 24-hour journey was closed and is no longer active.' },
        { name: 'withdrawn/unknown', overrides: { workspaceFinalStatus: 'withdrawn', finalStatus: 'withdrawn' }, state: 'closed', label: 'Closed', action: 'View closed 24-hour journey', notice: 'This 24-hour journey was closed and is no longer active.' },
    ];
    for (const item of closedCases) {
        const linked = findRequestEntryJourney([julyCase({ brokerRequestId: 'request-september', ...item.overrides })], { linkedCaseId: 'case-95979976' });
        assert.ok(linked, `${item.name}: the linked case is still found so its state can be shown`);
        const described = describeRequestEntryJourney(linked, { brokerRequestId: 'request-september' }, NOW);
        assert.equal(described.state, item.state, item.name);
        assert.equal(described.actionLabel, item.action, item.name);
        assert.equal(described.summary, `Started 2 Jul 2026 · ${item.label} · Linked to this agent request`, item.name);
        assert.equal(described.notice, item.notice, item.name);
        assert.doesNotMatch(described.text, /no new 24-hour clock|existing journey|In progress|Deadline passed|stage/i, item.name);
    }
});

test('an expired case the backend still treats as active reads as a continuable journey past its deadline', () => {
    // The mapper turns final_status "expired" into workspaceFinalStatus "active"
    // (see fastTrackStartContract.test.ts), matching the backend, which reuses it.
    const described = describeRequestEntryJourney(julyCase({ overdue: true }), { brokerRequestId: 'request-september' }, NOW);
    assert.equal(described.state, 'active');
    assert.equal(described.actionLabel, 'Continue existing 24-hour journey');
    assert.match(described.summary, /Deadline passed/);
    assert.match(described.notice, /deadline has passed and no new 24-hour clock has started/);
});

test('property fallback never returns a closed case, but a linked lookup does', () => {
    const completed = julyCase({ workspaceFinalStatus: 'completed', finalStatus: 'completed' });
    assert.equal(findRequestEntryJourney([completed], { propertyId: 'property-selected' }), null);
    assert.equal(findRequestEntryJourney([completed], { linkedCaseId: 'case-95979976' })?.caseId, 'case-95979976');
});

test('user workspace masthead subtitle carries the start date (verifier F-2)', () => {
    const workspace = readFileSync(resolve(process.cwd(), 'src/components/fast-track/FastTrackWorkspace.tsx'), 'utf8');
    assert.match(workspace, /import \{ formatJourneyStartedLabel \} from '@\/lib\/existingFastTrackJourney';/);
    assert.match(workspace, /this home in one guided journey\.`,\s*formatJourneyStartedLabel\(selectedCase\.submittedAt\),\s*\]\.filter\(Boolean\)\.join\(' · '\)/);
    assert.match(workspace, /subtitle=\{selectedCaseSubtitle\}/);
});
