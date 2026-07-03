import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { FastTrackCase } from '@/services/fastTrackService';

import {
    buildFastTrackDocumentDraftStorageKey,
    buildFastTrackSelectionSearchParams,
    buildFastTrackDocumentSearchParams,
    buildFastTrackStageSearchParams,
    buildFastTrackThreadRecipientLabel,
    canUserConfirmFastTrackHandover,
    describeFastTrackWorkspaceFocus,
    describeFastTrackWorkspaceStatus,
    fastTrackCaseMatchesQuery,
    getFastTrackDecisionGuard,
    getFastTrackFinalDecisionGuard,
    isFastTrackDocumentDraftDirty,
    resolveFastTrackDocumentSearchParam,
    resolveFastTrackStageSearchParam,
    resolveFastTrackSelectionCaseId,
    resolveFastTrackThreadRecipientId,
} from './fastTrackWorkspace';

const fastTrackWorkspaceComponent = readFileSync(
    resolve(process.cwd(), 'src/components/fast-track/FastTrackWorkspace.tsx'),
    'utf8',
);

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

test('selection prefers precise linked records over a stale case query param', () => {
    const cases = [
        buildCase({
            caseId: 'stale-case',
            applicationId: 'old-application',
            propertyId: 'property-1',
        }),
        buildCase({
            caseId: 'linked-case',
            applicationId: 'application-live',
            propertyId: 'property-1',
        }),
    ];

    assert.equal(
        resolveFastTrackSelectionCaseId(
            cases,
            new URLSearchParams('case=stale-case&application=application-live'),
            null,
        ),
        'linked-case',
    );
});

test('selection falls back to previous case when the query does not match', () => {
    const cases = [buildCase({ caseId: 'case-a' }), buildCase({ caseId: 'case-b' })];
    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('application=missing'), 'case-b'), 'case-b');
});

test('selection restores case query params after copy-paste casing and whitespace changes', () => {
    const cases = [buildCase({ caseId: 'case-a' }), buildCase({ caseId: 'case-b' })];

    assert.equal(resolveFastTrackSelectionCaseId(cases, new URLSearchParams('case=%20CASE-B%20'), null), 'case-b');
});

test('filtered selection ignores hidden stale case query params', () => {
    const visibleCompletedCases = [
        buildCase({
            caseId: 'completed-case',
            workspaceFinalStatus: 'completed',
        }),
    ];

    assert.equal(
        resolveFastTrackSelectionCaseId(
            visibleCompletedCases,
            new URLSearchParams('case=active-case'),
            'active-case',
        ),
        'completed-case',
    );
});

test('selection search params replace stale case ids when a completed journey is selected', () => {
    const next = buildFastTrackSelectionSearchParams(
        new URLSearchParams('case=active-case&section=documents'),
        'completed-case',
    );

    assert.equal(next.get('case'), 'completed-case');
    assert.equal(next.get('section'), 'documents');
});

test('stage search params preserve manager-selected viewing stage across refresh', () => {
    const next = buildFastTrackStageSearchParams(new URLSearchParams('case=case-1'), 'viewing');

    assert.equal(next.get('case'), 'case-1');
    assert.equal(next.get('section'), 'viewing');
    assert.equal(resolveFastTrackStageSearchParam(next), 'viewing');
    assert.equal(resolveFastTrackStageSearchParam(new URLSearchParams('section=bad-stage')), null);
});

test('document search params preserve selected address row across refresh', () => {
    const next = buildFastTrackDocumentSearchParams(
        new URLSearchParams('case=case-1&section=documents'),
        'address',
    );

    assert.equal(next.get('document'), 'address');
    assert.equal(resolveFastTrackDocumentSearchParam(next, ['identity', 'address']), 'address');
    assert.equal(resolveFastTrackDocumentSearchParam(new URLSearchParams('document=missing'), ['identity', 'address']), null);
});

test('document draft helpers keep notes scoped to role and case', () => {
    assert.equal(
        buildFastTrackDocumentDraftStorageKey('user', ' Case 123 '),
        'fast-track:document-drafts:user:Case%20123',
    );
    assert.equal(buildFastTrackDocumentDraftStorageKey('user', ''), '');
    assert.equal(isFastTrackDocumentDraftDirty({}), false);
    assert.equal(isFastTrackDocumentDraftDirty({ address: '   ' }), false);
    assert.equal(isFastTrackDocumentDraftDirty({ address: 'Council tax bill attached.' }), true);
});

test('decision guard blocks manager offer actions until prerequisites are satisfied', () => {
    const pendingSaleCase = buildCase({
        journeyMode: 'sale',
        listingType: 'sale',
        stage: 'selected',
        viewing: { status: 'pending' },
    });
    assert.match(
        getFastTrackDecisionGuard(pendingSaleCase, 'approved', '', 'manager') || '',
        /viewing/i,
    );

    const readySaleCase = buildCase({
        journeyMode: 'sale',
        listingType: 'sale',
        stage: 'decision',
        viewing: { status: 'completed' },
    });
    assert.match(
        getFastTrackDecisionGuard(readySaleCase, 'approved', '', 'manager') || '',
        /offer amount/i,
    );
    assert.equal(getFastTrackDecisionGuard(readySaleCase, 'approved', '325000', 'manager'), null);
    assert.equal(getFastTrackDecisionGuard(readySaleCase, 'rejected', '', 'manager'), null);
});

test('final decision guard lets managers approve ready sale offers with amount', () => {
    const readySaleCase = buildCase({
        journeyMode: 'sale',
        listingType: 'sale',
        stage: 'decision',
        viewing: { status: 'completed' },
        decision: {
            mode: 'sale',
            status: 'pending',
            amount: undefined,
            currency: 'GBP',
        },
    });

    assert.equal(getFastTrackFinalDecisionGuard(readySaleCase, 'approved', '325000', 'manager'), null);
    assert.equal(getFastTrackFinalDecisionGuard(readySaleCase, 'rejected', '', 'manager'), null);
});

test('case search matches application and workflow identifiers', () => {
    const fastTrackCase = buildCase({
        caseId: 'case-live-1',
        applicationId: 'ed1c5183-0000-4000-8000-000000000000',
        brokerRequestId: 'request-abc',
        clientName: 'Test User',
    });

    assert.equal(fastTrackCaseMatchesQuery(fastTrackCase, 'APP-ED1C5183'), true);
    assert.equal(fastTrackCaseMatchesQuery(fastTrackCase, 'request-abc'), true);
    assert.equal(fastTrackCaseMatchesQuery(fastTrackCase, 'not-present'), false);
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
    assert.equal(describeFastTrackWorkspaceFocus(agreementCase, 'manager'), 'Publish the agreement');

    const completedCase = buildCase({ workspaceFinalStatus: 'completed' });
    assert.equal(describeFastTrackWorkspaceFocus(completedCase, 'admin'), 'Case finished');
    assert.equal(describeFastTrackWorkspaceStatus(completedCase, 'admin'), 'Every core step was completed inside this workspace.');

    const completedHandoverCase = buildCase({
        stage: 'handover',
        handover: { status: 'completed', confirmedByUser: true },
    });
    assert.equal(describeFastTrackWorkspaceFocus(completedHandoverCase, 'user'), 'Your journey is complete');
    assert.equal(describeFastTrackWorkspaceStatus(completedHandoverCase, 'user'), 'Every step is complete. You can keep this page for records and updates.');
});

test('user handover stays actionable after manager completion until receipt is confirmed', () => {
    const managerCompletedCase = buildCase({
        stage: 'handover',
        workspaceFinalStatus: 'completed',
        finalStatus: 'completed',
        handover: {
            status: 'completed',
            completedAt: '2026-05-05T12:00:00Z',
            completedBy: 'manager-1',
            confirmedByUser: false,
        },
    });

    assert.equal(canUserConfirmFastTrackHandover(managerCompletedCase), true);
    assert.equal(describeFastTrackWorkspaceFocus(managerCompletedCase, 'user'), 'Confirm key handover');
    assert.match(describeFastTrackWorkspaceStatus(managerCompletedCase, 'user'), /Confirm the final handover/i);
    assert.equal(describeFastTrackWorkspaceFocus(managerCompletedCase, 'manager'), 'Case finished');
});

test('fast-track document preview opens a modal for selected and uploaded files', () => {
    assert.match(
        fastTrackWorkspaceComponent,
        /const canPreview = Boolean\(selectedFile \|\| item\.documentRecordId \|\| item\.fileUrl\)/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /if \(selectedFile\) \{/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /setPreviewItemId\(uploadedItem\.id\);\s*setPreviewModalOpen\(true\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onClick=\{\(\) => void ensureDocumentPreview\(previewItem, \{ openInModal: true, busyAction: 'preview' \}\)\}/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /const previewLoading = isPreviewDocumentBusy\(previewItem\.id\) && !previewUrl && !previewError/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /Loading document preview\.\.\./,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /aria-label="Zoom out document preview"/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /aria-label="Zoom in document preview"/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /<iframe/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /window\.requestAnimationFrame\(\(\) => revealPreviewSection\(\)\)/,
    );
});

test('manager completed-case document open stays in the in-app preview modal', () => {
    assert.match(
        fastTrackWorkspaceComponent,
        /const handleRailOpen = useCallback\(async \(item: FastTrackDocumentItem\) => \{\s*await ensureDocumentPreview\(item, \{ openInModal: true, busyAction: 'open' \}\);/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /handleRailDownload/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onClick=\{\(\) => void handleRailOpen\(activeDocument\)\}/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /ariaLabel=\{`Open \$\{activeDocument\.label\} from core files`\}/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onClick=\{\(\) => void ensureDocumentPreview\(item, \{ openInModal: true, busyAction: 'open' \}\)\}\s*busy=\{isPreviewActionBusy\(item\.id, 'open'\)\}\s*disabled=\{!canPreview\}\s*ariaLabel=\{`Open \$\{item\.label\}`\}/,
    );
});

test('document preview busy state is scoped to the clicked action', () => {
    assert.match(
        fastTrackWorkspaceComponent,
        /type FastTrackDocumentPreviewAction = 'preview' \| 'open' \| 'download' \| 'auto'/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /const documentPreviewBusyKey = \(/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /const isPreviewActionBusy = useCallback\(/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /setPreviewBusyKey\(\(current\) => current \?\? busyKey\)/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /busy=\{isPreviewActionBusy\(item\.id, 'preview'\)\}/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /busy=\{isPreviewActionBusy\(item\.id, 'open'\)\}/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /busy=\{previewBusyItemId === item\.id\}/,
    );
});

test('document row focus is single-click and does not reset scroll position', () => {
    const focusHandler = fastTrackWorkspaceComponent.match(
        /const handleDocumentFocus = useCallback\(\(documentId: string\) => \{[\s\S]*?\}, \[replaceDocumentFocusUrl, restoreDocumentFocusScroll\]\);/,
    )?.[0] || '';

    assert.match(fastTrackWorkspaceComponent, /const replaceDocumentFocusUrl = useCallback\(\(documentId: string\) => \{/);
    assert.match(fastTrackWorkspaceComponent, /const pendingPointerDocumentFocusRef = useRef<string \| null>\(null\)/);
    assert.match(fastTrackWorkspaceComponent, /const restoreDocumentFocusScroll = useCallback\(\(scrollX: number, scrollY: number\) => \{/);
    assert.match(fastTrackWorkspaceComponent, /window\.scrollTo\(\{ left: scrollX, top: scrollY, behavior: 'auto' \}\)/);
    assert.match(fastTrackWorkspaceComponent, /window\.requestAnimationFrame\(\(\) => \{\s*restore\(\);\s*window\.requestAnimationFrame\(restore\);/);
    assert.match(fastTrackWorkspaceComponent, /window\.setTimeout\(restore, 80\)/);
    assert.match(
        fastTrackWorkspaceComponent,
        /buildFastTrackDocumentSearchParams\(\s*new URLSearchParams\(window\.location\.search\),\s*documentId,/,
    );
    assert.match(fastTrackWorkspaceComponent, /window\.history\.replaceState\(window\.history\.state, '', nextUrl\)/);
    assert.match(focusHandler, /replaceDocumentFocusUrl\(documentId\)/);
    assert.match(focusHandler, /restoreDocumentFocusScroll\(previousScrollX, previousScrollY\)/);
    assert.doesNotMatch(focusHandler, /setSearchParams\(/);
    assert.match(
        fastTrackWorkspaceComponent,
        /data-fast-track-document-focus-trigger/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onPointerDown=\{\(event\) => \{\s*if \(event\.button === 0\) \{\s*event\.preventDefault\(\);\s*pendingPointerDocumentFocusRef\.current = item\.id;\s*handleDocumentFocus\(item\.id\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /if \(pendingPointerDocumentFocusRef\.current === item\.id\) \{\s*pendingPointerDocumentFocusRef\.current = null;\s*return;/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onPointerDownCapture=\{\(event\) => \{/,
    );
});

test('fast-track cancel case uses an in-app confirmation dialog', () => {
    assert.doesNotMatch(fastTrackWorkspaceComponent, /window\.confirm/);
    assert.match(fastTrackWorkspaceComponent, /aria-label="Cancel fast-track case confirmation"/);
});
