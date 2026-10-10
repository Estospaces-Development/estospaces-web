import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { FastTrackCase } from '@/services/fastTrackService';
import { PAYMENTS_ENABLED } from './launchFlags';

import {
    resolveFastTrackDisplayedCaseId,
    buildFastTrackDocumentDraftStorageKey,
    buildFastTrackDocumentRequestFieldKey,
    buildFastTrackDocumentRequestPayload,
    buildFastTrackSelectionSearchParams,
    buildFastTrackDocumentSearchParams,
    buildFastTrackStageSearchParams,
    buildFastTrackThreadRecipientLabel,
    canStartFastTrackDocumentUpload,
    canUserPrepareFastTrackDocuments,
    canUserConfirmFastTrackHandover,
    canRefreshFastTrackCompletion,
    describeFastTrackWorkspaceFocus,
    describeFastTrackWorkspaceStatus,
    fastTrackCaseMatchesQuery,
    FAST_TRACK_AGREEMENT_PUBLISHED_MESSAGE,
    getFastTrackDecisionGuard,
    FAST_TRACK_DOCUMENTS_PENDING_FOR_VIEWING_MESSAGE,
    FAST_TRACK_EXPIRED_VIEWING_COMPLETION_MESSAGE,
    getFastTrackDocumentItemPermissions,
    getFastTrackDocumentRowPresentation,
    getFastTrackViewingCompletionBlockReason,
    isFastTrackHeldForDocuments,
    getFastTrackDocumentReviewActions,
    getFastTrackFinalDecisionGuard,
    getFastTrackManagerAgreementStatus,
    isFastTrackHistoricalStageForCase,
    isFastTrackUserActionBlockedOnClosedCase,
    isFastTrackDocumentDraftDirty,
    isFastTrackManagerReviewEligible,
    isFastTrackStageUnlocked,
    resolveFastTrackDocumentSearchParam,
    resolveFastTrackDocumentFocusAfterRefresh,
    resolveFastTrackStageSearchParam,
    resolveFastTrackSelectionCaseId,
    resolveFastTrackPendingStageSelection,
    resolveFastTrackStageNavigation,
    resolveFastTrackThreadRecipientId,
    resolveFastTrackVisibleStage,
    shouldDeferFastTrackStageResolution,
    shouldDeferFastTrackSelectionURLSync,
    shouldRemoveFastTrackStaleCaseLink,
    shouldStartDocumentsWhenSelectingStage,
} from './fastTrackWorkspace';

test('completion refresh requires genuine completion and an authorized participant', () => {
    const completed = buildCase({ workspaceFinalStatus: 'completed', stage: 'handover', handover: {
        status: 'completed', completedAt: '2026-09-07T10:00:00Z', completedBy: 'manager-1', confirmedByUser: true,
    } });
    for (const [role, actor] of [['manager', 'manager-1'], ['admin', 'admin-1'], ['user', 'user-1']]) {
        assert.equal(canRefreshFastTrackCompletion(completed, role, actor), true);
    }
    for (const [role, actor] of [['manager', 'other'], ['user', 'other'], ['broker', 'manager-1'], ['admin', '']]) {
        assert.equal(canRefreshFastTrackCompletion(completed, role, actor), false);
    }
    for (const patch of [
        { workspaceFinalStatus: 'active' as const }, { workspaceFinalStatus: 'cancelled' as const },
        { stage: 'documents' as const }, { handover: { ...completed.handover, status: 'ready' as const } },
        { handover: { ...completed.handover, completedAt: '' } },
        { handover: { ...completed.handover, completedBy: ' ' } },
    ]) assert.equal(canRefreshFastTrackCompletion({ ...completed, ...patch }, 'admin', 'admin-1'), false);
});

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

test('agreement publish copy explains that user acceptance unlocks handover', () => {
    assert.equal(
        FAST_TRACK_AGREEMENT_PUBLISHED_MESSAGE,
        'Agreement published. Waiting for the user to sign before handover.',
    );
    assert.deepEqual(getFastTrackManagerAgreementStatus(buildCase({
        agreement: { status: 'sent', paymentStatus: 'not_requested' },
    })), {
        title: 'Awaiting user signature',
        description: 'The agreement is published. Handover unlocks after the user signs it.',
    });
    assert.deepEqual(getFastTrackManagerAgreementStatus(buildCase({
        agreement: { status: 'accepted', paymentStatus: 'not_requested' },
    })), {
        title: 'Agreement accepted',
        description: 'The user has signed the agreement. Continue to the handover stage.',
    });
    assert.deepEqual(getFastTrackManagerAgreementStatus(buildCase({
        workspaceFinalStatus: 'completed',
        finalStatus: 'completed',
        agreement: { status: 'accepted', paymentStatus: 'paid' },
        handover: { status: 'completed' },
    })), {
        title: 'Fast Track completed',
        description: 'The agreement was accepted and the handover has been completed.',
    });
    assert.deepEqual(getFastTrackManagerAgreementStatus(buildCase({
        workspaceFinalStatus: 'cancelled',
        finalStatus: 'rejected',
        agreement: { status: 'sent', paymentStatus: 'not_requested' },
    })), {
        title: 'Fast Track closed',
        description: 'This case is closed. Its agreement history remains available for reference.',
    });
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
    const next = buildFastTrackStageSearchParams(
        new URLSearchParams('case=case-1&section=documents&stage=documents&document=identity&file=preview'),
        'viewing',
        true,
    );

    assert.equal(next.get('case'), 'case-1');
    assert.equal(next.get('section'), 'viewing');
    assert.equal(next.has('stage'), false);
    assert.equal(next.has('document'), false);
    assert.equal(next.has('file'), false);
    assert.equal(next.get('stageHistory'), 'case-1');
    assert.equal(resolveFastTrackStageSearchParam(next), 'viewing');
    assert.equal(resolveFastTrackStageSearchParam(new URLSearchParams('section=bad-stage')), null);
});

test('historical stage markers stay scoped to the case that created them', () => {
    const historical = buildFastTrackStageSearchParams(
        new URLSearchParams('case=case-1&section=decision'),
        'viewing',
        true,
    );
    assert.equal(isFastTrackHistoricalStageForCase(historical, 'case-1'), true);

    const switched = buildFastTrackSelectionSearchParams(historical, 'case-2');
    assert.equal(isFastTrackHistoricalStageForCase(switched, 'case-2'), false);
});

test('pending stage selection remains authoritative until the URL confirms the click', () => {
    const pendingViewing = { caseId: 'case-1', stage: 'viewing' as const };

    assert.deepEqual(
        resolveFastTrackPendingStageSelection(pendingViewing, 'case-1', 'documents'),
        { requestedStage: 'viewing', awaitingURLSync: true },
    );
    assert.deepEqual(
        resolveFastTrackPendingStageSelection(pendingViewing, 'case-1', 'viewing'),
        { requestedStage: 'viewing', awaitingURLSync: false },
    );
    assert.deepEqual(
        resolveFastTrackPendingStageSelection(pendingViewing, 'case-2', 'documents'),
        { requestedStage: 'documents', awaitingURLSync: false },
    );

    const delayedSync = resolveFastTrackPendingStageSelection(
        pendingViewing,
        'case-1',
        'documents',
    );
    const delayedSyncParams = buildFastTrackStageSearchParams(
        new URLSearchParams('case=case-1&section=documents'),
        delayedSync.requestedStage ?? 'viewing',
        delayedSync.awaitingURLSync,
    );
    assert.equal(delayedSyncParams.get('stageHistory'), 'case-1');

    const readinessRegressed = buildCase({
        stage: 'documents',
        documents: {
            identityProof: 'pending',
            addressProof: 'pending',
            items: [],
            allUploaded: false,
            allApproved: false,
        },
    });
    assert.deepEqual(resolveFastTrackStageNavigation(readinessRegressed, 'viewing'), {
        visibleStage: 'documents',
        shouldReplaceStageParam: true,
    });
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

test('document focus does not overwrite an in-flight stage selection', () => {
    const next = buildFastTrackDocumentSearchParams(
        new URLSearchParams('case=case-1&section=viewing&stage=viewing'),
        'identity',
    );

    assert.equal(next.get('section'), 'viewing');
    assert.equal(next.get('stage'), 'viewing');
    assert.equal(next.get('document'), 'identity');
});

test('manager selecting documents on an assigned selected case starts document collection', () => {
    const selectedCase = buildCase({
        stage: 'selected',
        workspaceFinalStatus: 'active',
        managerId: 'manager-1',
    });

    assert.equal(shouldStartDocumentsWhenSelectingStage(selectedCase, 'manager', 'documents'), true);
    assert.equal(shouldStartDocumentsWhenSelectingStage(selectedCase, 'user', 'documents'), false);
    assert.equal(shouldStartDocumentsWhenSelectingStage(selectedCase, 'manager', 'viewing'), false);
    assert.equal(
        shouldStartDocumentsWhenSelectingStage(
            buildCase({ stage: 'documents', workspaceFinalStatus: 'active', managerId: 'manager-1' }),
            'manager',
            'documents',
        ),
        false,
    );
    assert.equal(
        shouldStartDocumentsWhenSelectingStage(
            buildCase({ stage: 'selected', workspaceFinalStatus: 'cancelled', managerId: 'manager-1' }),
            'manager',
            'documents',
        ),
        false,
    );
    assert.equal(
        shouldStartDocumentsWhenSelectingStage(
            buildCase({ stage: 'selected', workspaceFinalStatus: 'active', managerId: undefined }),
            'manager',
            'documents',
        ),
        false,
    );
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
    assert.equal(
        describeFastTrackWorkspaceFocus(agreementCase, 'manager'),
        PAYMENTS_ENABLED ? 'Confirm payment and move to handover' : 'Publish the agreement',
    );

    const completedCase = buildCase({ workspaceFinalStatus: 'completed' });
    assert.equal(describeFastTrackWorkspaceFocus(completedCase, 'admin'), 'Case finished');
    assert.equal(describeFastTrackWorkspaceStatus(completedCase, 'admin'), 'Every core step was completed inside this workspace.');

    const completedHandoverCase = buildCase({
        stage: 'handover',
        handover: { status: 'completed', confirmedByUser: true },
    });
    assert.equal(describeFastTrackWorkspaceFocus(completedHandoverCase, 'user'), 'Your journey is complete');
    assert.equal(describeFastTrackWorkspaceStatus(completedHandoverCase, 'user'), 'Every step is complete. You can keep this page for records and updates.');

    const assignedSelectedCase = buildCase({ stage: 'selected', managerId: 'manager-1' });
    assert.equal(describeFastTrackWorkspaceFocus(assignedSelectedCase, 'manager'), 'Start documents');
    assert.doesNotMatch(describeFastTrackWorkspaceStatus(assignedSelectedCase, 'manager'), /Claim/i);

    const unassignedSelectedCase = buildCase({ stage: 'selected', managerId: undefined });
    assert.equal(describeFastTrackWorkspaceFocus(unassignedSelectedCase, 'manager'), 'Claim and start');
    assert.match(describeFastTrackWorkspaceStatus(unassignedSelectedCase, 'manager'), /Claim the case/i);
});

test('manager review eligibility waits for assignment and manager interaction', () => {
    assert.equal(isFastTrackManagerReviewEligible(buildCase({ managerId: undefined })), false);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({ managerId: 'manager-1', stage: 'selected' })), false);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({ managerId: 'manager-1', stage: 'documents' })), false);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({ managerId: 'manager-1', stage: 'viewing' })), true);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({ managerId: 'manager-1', workspaceFinalStatus: 'completed' })), true);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({
        managerId: 'manager-1',
        stage: 'selected',
        activity: [{ id: 'activity-1', type: 'case_updated', message: 'Manager responded', actorRole: 'manager', createdAt: '2026-07-07T00:00:00Z' }],
    })), true);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({
        managerId: 'manager-1',
        stage: 'selected',
        documents: {
            identityProof: 'verified',
            addressProof: 'pending',
            allUploaded: false,
            allApproved: false,
            items: [{ id: 'identity', label: 'Identity', status: 'approved', reviewedAt: '2026-07-07T00:00:00Z' }],
        },
    })), true);
    assert.equal(isFastTrackManagerReviewEligible(buildCase({
        managerId: 'manager-1',
        stage: 'documents',
        workspaceFinalStatus: 'cancelled',
    })), false);
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

test('fast-track document preview opens a modal only from explicit preview actions', () => {
    assert.match(
        fastTrackWorkspaceComponent,
        /const canPreview = Boolean\(selectedFile \|\| item\.documentRecordId \|\| item\.fileUrl\)/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /if \(selectedFile\) \{/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /setPreviewItemId\(uploadedItem\.id\);\s*setPreviewModalOpen\(true\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /toast\.success\(`\$\{item\.label\} uploaded and visible to your manager\.`\);/,
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
    assert.match(
        fastTrackWorkspaceComponent,
        /<iframe\s*(key|src)=\{previewUrl\}/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /If your browser blocks the inline PDF viewer/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /<object/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /window\.requestAnimationFrame\(\(\) => revealPreviewSection\(\)\)/,
    );
});

test('fast-track document open uses a full external viewer while preview stays in-app', () => {
    assert.match(
        fastTrackWorkspaceComponent,
        /const externalWindow = openInNewTab \? window\.open\('about:blank', '_blank'\) : null/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /externalWindow\.location\.href = url;/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /const openedWindow = window\.open\(url, '_blank', 'noopener,noreferrer'\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /window\.location\.assign\(url\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /const handleRailOpen = useCallback\(async \(item: FastTrackDocumentItem\) => \{\s*await ensureDocumentPreview\(item, \{ openInNewTab: true, busyAction: 'open' \}\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /ensureDocumentPreview\(item, \{ openInNewTab: true, busyAction: 'open' \}\)/,
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
        /onClick=\{\(\) => void handleRailOpen\(item\)\}\s*busy=\{isPreviewActionBusy\(item\.id, 'open'\)\}\s*disabled=\{!canPreview\}\s*ariaLabel=\{`Open \$\{item\.label\}`\}/,
    );
    assert.doesNotMatch(
        fastTrackWorkspaceComponent,
        /ensureDocumentPreview\(item, \{ openInSameTab: true, busyAction: 'open' \}\)/,
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
        /const handleDocumentFocus = useCallback\(\(documentId: string\) => \{[\s\S]*?\}, \[replaceDocumentFocusUrl\]\);/,
    )?.[0] || '';

    assert.match(fastTrackWorkspaceComponent, /const replaceDocumentFocusUrl = useCallback\(\(documentId: string\) => \{/);
    assert.doesNotMatch(fastTrackWorkspaceComponent, /pendingPointerDocumentFocusRef/);
    assert.doesNotMatch(fastTrackWorkspaceComponent, /restoreDocumentFocusScroll/);
    assert.match(
        fastTrackWorkspaceComponent,
        /setSearchParams\(\s*\(previous\) => buildFastTrackDocumentSearchParams\(previous, documentId\),\s*\{ replace: true, preventScrollReset: true \},/,
    );
    assert.doesNotMatch(fastTrackWorkspaceComponent, /window\.history\.replaceState/);
    assert.match(focusHandler, /replaceDocumentFocusUrl\(documentId\)/);
    assert.match(
        fastTrackWorkspaceComponent,
        /data-fast-track-document-focus-trigger/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onClick=\{\(event\) => \{\s*event\.stopPropagation\(\);\s*handleDocumentFocus\(item\.id\);/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /onClick=\{\(event\) => \{\s*if \(shouldIgnoreDocumentCardFocus\(event\.target\)\)/,
    );
    assert.match(
        fastTrackWorkspaceComponent,
        /\{ preventScrollReset: true \}/,
    );
});

test('fast-track cancel case uses an in-app confirmation dialog', () => {
    assert.doesNotMatch(fastTrackWorkspaceComponent, /window\.confirm/);
    assert.match(fastTrackWorkspaceComponent, /aria-label="Close fast-track case confirmation"/);
    assert.match(fastTrackWorkspaceComponent, /Closing retains the case history and uploaded documents/);
    assert.match(
        fastTrackWorkspaceComponent,
        /role !== 'user' && selectedCase\.workspaceFinalStatus === 'active'/,
    );
});

test('stage availability follows the exact Fast Track business events', () => {
    const selected = buildCase();
    assert.equal(isFastTrackStageUnlocked(selected, 'selected'), true);
    assert.equal(isFastTrackStageUnlocked(selected, 'documents'), true);
    assert.equal(isFastTrackStageUnlocked(selected, 'viewing'), false);

    const partialDocuments = buildCase({
        stage: 'documents',
        documents: {
            identityProof: 'verified',
            addressProof: 'pending',
            items: [],
            allUploaded: false,
            allApproved: false,
        },
    });
    assert.equal(isFastTrackStageUnlocked(partialDocuments, 'viewing'), false);

    const approvedDocuments = buildCase({
        stage: 'viewing',
        documents: {
            identityProof: 'verified',
            addressProof: 'verified',
            items: [],
            allUploaded: true,
            allApproved: true,
        },
        viewing: { status: 'pending' },
    });
    assert.equal(isFastTrackStageUnlocked(approvedDocuments, 'viewing'), true);
    assert.equal(isFastTrackStageUnlocked(approvedDocuments, 'decision'), false);

    const scheduledViewing = buildCase({
        stage: 'viewing',
        viewingId: 'viewing-1',
        viewing: { status: 'scheduled', scheduledAt: '2026-08-14T10:00:00Z' },
    });
    assert.equal(isFastTrackStageUnlocked(scheduledViewing, 'viewing'), true);
    assert.equal(isFastTrackStageUnlocked(scheduledViewing, 'decision'), false);

    for (const status of ['completed', 'skipped'] as const) {
        const viewingFinished = buildCase({
            stage: 'decision',
            viewing: { status },
        });
        assert.equal(isFastTrackStageUnlocked(viewingFinished, 'decision'), true);
        assert.equal(isFastTrackStageUnlocked(viewingFinished, 'agreement'), false);
    }

    const approvedDecision = buildCase({
        stage: 'agreement',
        viewing: { status: 'completed' },
        decision: { mode: 'rent', status: 'approved' },
    });
    assert.equal(isFastTrackStageUnlocked(approvedDecision, 'agreement'), true);
    assert.equal(isFastTrackStageUnlocked(approvedDecision, 'handover'), false);

    const sentAgreement = buildCase({
        stage: 'agreement',
        decision: { mode: 'rent', status: 'approved' },
        agreement: { status: 'sent', paymentStatus: 'not_requested' },
    });
    assert.equal(isFastTrackStageUnlocked(sentAgreement, 'handover'), false);

    const acceptedAgreement = buildCase({
        stage: 'handover',
        decision: { mode: 'rent', status: 'approved' },
        agreement: { status: 'accepted', paymentStatus: 'not_requested' },
    });
    assert.equal(isFastTrackStageUnlocked(acceptedAgreement, 'handover'), true);
    assert.equal(isFastTrackStageUnlocked(acceptedAgreement, 'documents'), true);

    const paymentOutstanding = buildCase({
        stage: 'agreement',
        decision: { mode: 'rent', status: 'approved' },
        agreement: { status: 'accepted', paymentStatus: 'requested' },
    });
    assert.equal(isFastTrackStageUnlocked(paymentOutstanding, 'handover'), !PAYMENTS_ENABLED);

    const completed = buildCase({ workspaceFinalStatus: 'completed' });
    assert.equal(isFastTrackStageUnlocked(completed, 'handover'), true);
});

test('stage resolution waits for a newly requested case instead of rewriting its section', () => {
    assert.equal(shouldDeferFastTrackStageResolution('case-b', 'case-a'), true);
    assert.equal(shouldDeferFastTrackStageResolution(' CASE-B ', 'case-b'), false);
    assert.equal(shouldDeferFastTrackStageResolution(null, 'case-a'), false);
});

test('stale-case recovery preserves a deep link until deferred lookup has definitely missed', () => {
    const unresolved = {
        requestedCaseId: 'case-b',
        loading: false,
        requestedCaseIsAvailable: false,
        requestedCaseLookupPending: false,
        requestedCaseLookupMissed: false,
    };
    assert.equal(shouldRemoveFastTrackStaleCaseLink(unresolved), false);
    assert.equal(shouldRemoveFastTrackStaleCaseLink({
        ...unresolved,
        requestedCaseLookupPending: true,
    }), false);
    assert.equal(shouldRemoveFastTrackStaleCaseLink({
        ...unresolved,
        requestedCaseIsAvailable: true,
    }), false);
    assert.equal(shouldRemoveFastTrackStaleCaseLink({
        ...unresolved,
        requestedCaseLookupMissed: true,
    }), true);
});

test('case URL synchronization waits for a deferred deep-link lookup', () => {
    const unresolved = {
        requestedCaseId: 'case-b',
        requestedCaseIsAvailable: false,
        requestedCaseLookupMissed: false,
    };
    assert.equal(shouldDeferFastTrackSelectionURLSync(unresolved), true);
    assert.equal(shouldDeferFastTrackSelectionURLSync({
        ...unresolved,
        requestedCaseIsAvailable: true,
    }), false);
    assert.equal(shouldDeferFastTrackSelectionURLSync({
        ...unresolved,
        requestedCaseLookupMissed: true,
    }), false);
    assert.equal(shouldDeferFastTrackSelectionURLSync({
        ...unresolved,
        requestedCaseId: null,
    }), false);
});

test('stage navigation clamps future URLs and follows a polled backend progression', () => {
    const selected = buildCase({ stage: 'selected' });
    assert.deepEqual(resolveFastTrackStageNavigation(selected, 'agreement'), {
        visibleStage: 'selected',
        shouldReplaceStageParam: true,
    });

    const documents = buildCase({ stage: 'documents' });
    assert.deepEqual(resolveFastTrackStageNavigation(documents, 'documents', 'selected'), {
        visibleStage: 'documents',
        shouldReplaceStageParam: false,
    });

    const appointmentScheduled = buildCase({
        stage: 'viewing',
        viewingId: 'viewing-1',
        viewing: { status: 'scheduled', scheduledAt: '2026-08-14T10:00:00Z' },
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentScheduled, 'documents', 'documents'), {
        visibleStage: 'viewing',
        shouldReplaceStageParam: true,
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentScheduled, 'selected', 'documents'), {
        visibleStage: 'selected',
        shouldReplaceStageParam: false,
    });

    const appointmentCompleted = buildCase({
        stage: 'decision',
        viewingId: 'viewing-1',
        viewing: { status: 'completed', scheduledAt: '2026-08-14T10:00:00Z' },
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentCompleted, 'viewing'), {
        visibleStage: 'decision',
        shouldReplaceStageParam: true,
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentCompleted, 'viewing', null, true), {
        visibleStage: 'viewing',
        shouldReplaceStageParam: false,
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentCompleted, 'viewing', 'viewing'), {
        visibleStage: 'decision',
        shouldReplaceStageParam: true,
    });
    assert.deepEqual(resolveFastTrackStageNavigation(appointmentCompleted, 'viewing', 'decision'), {
        visibleStage: 'viewing',
        shouldReplaceStageParam: false,
    });
});

test('user can open and prepare documents before manager review starts', () => {
    const unassignedCase = buildCase({
        stage: 'selected',
        workspaceFinalStatus: 'active',
        managerId: undefined,
        activity: [],
    });

    assert.equal(resolveFastTrackVisibleStage(unassignedCase, null), 'selected');
    assert.equal(resolveFastTrackVisibleStage(unassignedCase, 'documents'), 'documents');
    assert.equal(canUserPrepareFastTrackDocuments(unassignedCase), true);
    assert.equal(
        resolveFastTrackVisibleStage(
            buildCase({ stage: 'documents', managerId: undefined, activity: [] }),
            null,
        ),
        'documents',
    );
    assert.equal(
        canUserPrepareFastTrackDocuments(buildCase({ workspaceFinalStatus: 'cancelled' })),
        false,
    );
    assert.equal(
        canUserPrepareFastTrackDocuments(buildCase({ workspaceFinalStatus: 'completed' })),
        false,
    );
});

for (const [stage, allowed] of [
    ['selected', true],
    ['documents', true],
    ['viewing', false],
    ['decision', false],
    ['agreement', false],
    ['handover', false],
] as const) {
    test(`user document upload eligibility at ${stage} matches the booking stage contract`, () => {
        assert.equal(canUserPrepareFastTrackDocuments(buildCase({ stage, workspaceFinalStatus: 'active' })), allowed);
        assert.equal(canUserPrepareFastTrackDocuments(buildCase({ stage, workspaceFinalStatus: 'completed' })), false);
        assert.equal(canUserPrepareFastTrackDocuments(buildCase({ stage, workspaceFinalStatus: 'cancelled' })), false);
    });
}

test('user cannot prepare documents without a selected case', () => {
    assert.equal(canUserPrepareFastTrackDocuments(null), false);
    assert.equal(canUserPrepareFastTrackDocuments(undefined), false);
});

test('manager document actions do not offer duplicate approval', () => {
    assert.deepEqual(getFastTrackDocumentReviewActions('uploaded', true), {
        canApprove: true,
        canRequestReplacement: true,
    });
    assert.deepEqual(getFastTrackDocumentReviewActions('approved', true), {
        canApprove: false,
        canRequestReplacement: true,
    });
    assert.deepEqual(getFastTrackDocumentReviewActions('reupload_needed', true), {
        canApprove: false,
        canRequestReplacement: false,
    });
    assert.deepEqual(getFastTrackDocumentReviewActions('pending', false), {
        canApprove: false,
        canRequestReplacement: false,
    });
});

test('replacement document upload accepts a corrected file with the original filename', () => {
    const requestedReplacement = {
        documentRecordId: 'document-record-1',
        fileUrl: 'https://media.example/documents/address-old.pdf',
        fileName: 'address.pdf',
        status: 'reupload_needed' as const,
    };
    const correctedScan = { name: 'address.pdf', size: 4096, lastModified: 1786543200000 };

    assert.equal(
        canStartFastTrackDocumentUpload(requestedReplacement, correctedScan, false),
        true,
    );
    assert.equal(
        canStartFastTrackDocumentUpload(requestedReplacement, correctedScan, true),
        false,
    );
});

test('requested document remains uploadable and request payload requires a future deadline', () => {
    const requestedDocument = {
        status: 'requested' as const,
        documentRecordId: undefined,
        fileUrl: undefined,
        fileName: undefined,
    };
    const file = { name: 'passport.pdf', size: 4096, lastModified: 1786543200000 };
    assert.equal(canStartFastTrackDocumentUpload(requestedDocument, file, false), true);

    const now = Date.parse('2026-08-21T08:00:00.000Z');
    assert.deepEqual(
        buildFastTrackDocumentRequestPayload(' identity ', ' Please upload a current passport. ', '2026-08-21T14:00:00.000Z', now),
        {
            payload: {
                document_id: 'identity',
                reason: 'Please upload a current passport.',
                due_at: '2026-08-21T14:00:00.000Z',
            },
            error: null,
        },
    );
    assert.match(buildFastTrackDocumentRequestPayload('identity', '', '2026-08-21T14:00:00.000Z', now).error || '', /reason/i);
    assert.match(buildFastTrackDocumentRequestPayload('identity', 'Needed', '2026-08-21T07:59:00.000Z', now).error || '', /future/i);
    assert.equal(buildFastTrackDocumentRequestFieldKey('case-one', 'identity'), 'case-one:identity');
});

test('document focus remains switchable after upload refresh and polling replacements', () => {
    const uploadedAddressParams = new URLSearchParams('case=case-1&document=address');
    let focus = resolveFastTrackDocumentFocusAfterRefresh(
        uploadedAddressParams,
        null,
        ['identity', 'address'],
    );
    assert.equal(focus, 'address');

    const clickedIdentityParams = buildFastTrackDocumentSearchParams(uploadedAddressParams, 'identity');
    focus = resolveFastTrackDocumentFocusAfterRefresh(
        clickedIdentityParams,
        focus,
        ['identity', 'address'],
    );
    assert.equal(focus, 'identity');

    focus = resolveFastTrackDocumentFocusAfterRefresh(
        clickedIdentityParams,
        focus,
        [...['identity', 'address']],
    );
    assert.equal(focus, 'identity');

    const clickedAddressAgain = buildFastTrackDocumentSearchParams(clickedIdentityParams, 'address');
    focus = resolveFastTrackDocumentFocusAfterRefresh(
        clickedAddressAgain,
        focus,
        [...['identity', 'address']],
    );
    assert.equal(focus, 'address');
});

test('a linked Fast Track case that is not yet confirmed never renders a different case', () => {
    // Foreign or still-loading link: the auto-selected own case must not be displayed.
    assert.equal(resolveFastTrackDisplayedCaseId({
        requestedCaseId: 'foreign-case',
        requestedCaseIsAvailable: false,
        requestedCaseLookupMissed: false,
        selectedCaseId: 'own-case',
    }), null);

    // Link resolved to an accessible case: display the selection.
    assert.equal(resolveFastTrackDisplayedCaseId({
        requestedCaseId: 'own-case',
        requestedCaseIsAvailable: true,
        requestedCaseLookupMissed: false,
        selectedCaseId: 'own-case',
    }), 'own-case');

    // Missing (404) link is stripped and recovered by the existing notice flow.
    assert.equal(resolveFastTrackDisplayedCaseId({
        requestedCaseId: 'deleted-case',
        requestedCaseIsAvailable: false,
        requestedCaseLookupMissed: true,
        selectedCaseId: 'own-case',
    }), 'own-case');

    // No link at all: ordinary selection.
    assert.equal(resolveFastTrackDisplayedCaseId({
        requestedCaseId: null,
        requestedCaseIsAvailable: false,
        requestedCaseLookupMissed: false,
        selectedCaseId: 'own-case',
    }), 'own-case');
});

// QA-MB-20260923-01-006: review controls follow case state + role, not file status alone.
test('users never receive document review permissions on any case state', () => {
    for (const workspaceFinalStatus of ['active', 'completed', 'cancelled'] as const) {
        for (const stage of ['documents', 'viewing', 'decision'] as const) {
            const fastTrackCase = buildCase({ workspaceFinalStatus, stage, viewing: { status: 'pending' } });
            for (const status of ['uploaded', 'approved'] as const) {
                const permissions = getFastTrackDocumentItemPermissions(fastTrackCase, 'user', status, true);
                const label = [workspaceFinalStatus, stage, status].join('/');
                assert.equal(permissions.canApprove, false, label);
                assert.equal(permissions.canRequestReplacement, false, label);
            }
        }
    }
});

test('closed cases give managers and admins no document review permissions', () => {
    for (const workspaceFinalStatus of ['completed', 'cancelled'] as const) {
        const fastTrackCase = buildCase({ workspaceFinalStatus, stage: 'documents' });
        for (const role of ['manager', 'admin'] as const) {
            assert.deepEqual(getFastTrackDocumentItemPermissions(fastTrackCase, role, 'uploaded', true), {
                canUpload: false,
                canApprove: false,
                canRequestReplacement: false,
            });
        }
    }
});

test('a manager whose verification was rejected or revoked gets no review permissions on any case', () => {
    for (const stage of ['documents', 'viewing'] as const) {
        const fastTrackCase = buildCase({ stage, viewing: { status: 'pending' } });
        assert.deepEqual(getFastTrackDocumentItemPermissions(fastTrackCase, 'manager', 'uploaded', true, true), {
            canUpload: false,
            canApprove: false,
            canRequestReplacement: false,
        });
        // The flag is only about managers: admins keep reviewing, and without it managers do too.
        assert.equal(getFastTrackDocumentItemPermissions(fastTrackCase, 'admin', 'uploaded', true, true).canRequestReplacement, true);
        assert.equal(getFastTrackDocumentItemPermissions(fastTrackCase, 'manager', 'uploaded', true, false).canRequestReplacement, true);
    }
});

test('manager review permissions mirror the booking stage rules', () => {
    const documentsStage = buildCase({ stage: 'documents' });
    assert.deepEqual(getFastTrackDocumentItemPermissions(documentsStage, 'manager', 'uploaded', true), {
        canUpload: false,
        canApprove: true,
        canRequestReplacement: true,
    });
    assert.equal(getFastTrackDocumentItemPermissions(documentsStage, 'manager', 'uploaded', false).canApprove, false);

    const viewingUnscheduled = buildCase({ stage: 'viewing', viewing: { status: 'pending' } });
    assert.deepEqual(getFastTrackDocumentItemPermissions(viewingUnscheduled, 'admin', 'approved', true), {
        canUpload: false,
        canApprove: false,
        canRequestReplacement: true,
    });

    const viewingScheduled = buildCase({ stage: 'viewing', viewing: { status: 'scheduled', scheduledAt: '2026-10-01T10:00:00Z' } });
    assert.deepEqual(getFastTrackDocumentItemPermissions(viewingScheduled, 'manager', 'approved', true), {
        canUpload: false,
        canApprove: false,
        canRequestReplacement: false,
    });
});

test('users upload only while an open case is collecting documents', () => {
    assert.equal(getFastTrackDocumentItemPermissions(buildCase({ stage: 'documents' }), 'user', 'pending', false).canUpload, true);
    assert.equal(getFastTrackDocumentItemPermissions(buildCase({ stage: 'viewing' }), 'user', 'pending', false).canUpload, false);
    assert.equal(
        getFastTrackDocumentItemPermissions(buildCase({ stage: 'documents', workspaceFinalStatus: 'cancelled' }), 'user', 'pending', false).canUpload,
        false,
    );
});

test('closed cases block user workflow actions except confirming a completed handover', () => {
    const cancelled = buildCase({ workspaceFinalStatus: 'cancelled' });
    const completed = buildCase({ workspaceFinalStatus: 'completed', stage: 'handover' });
    for (const action of ['upload_document', 'review_document', 'confirm_viewing', 'request_viewing_change', 'confirm_agreement', 'confirm_handover']) {
        assert.equal(isFastTrackUserActionBlockedOnClosedCase(cancelled, action), true, action);
    }
    for (const action of ['upload_document', 'review_document', 'confirm_viewing', 'confirm_agreement']) {
        assert.equal(isFastTrackUserActionBlockedOnClosedCase(completed, action), true, action);
    }
    assert.equal(isFastTrackUserActionBlockedOnClosedCase(completed, 'confirm_handover'), false);
    assert.equal(isFastTrackUserActionBlockedOnClosedCase(buildCase(), 'confirm_viewing'), false);
});

// Verifier F2: document rows show users no reviewer copy or review note field.
test('document row presentation never gives users reviewer copy or a review note field', () => {
    for (const workspaceFinalStatus of ['active', 'completed', 'cancelled'] as const) {
        for (const stage of ['documents', 'viewing', 'decision', 'handover'] as const) {
            const fastTrackCase = buildCase({ workspaceFinalStatus, stage, viewing: { status: 'pending' } });
            for (const status of ['pending', 'uploaded', 'approved', 'reupload_needed'] as const) {
                const hasFile = status !== 'pending';
                const permissions = getFastTrackDocumentItemPermissions(fastTrackCase, 'user', status, hasFile);
                const presentation = getFastTrackDocumentRowPresentation({
                    role: 'user',
                    workspaceFinalStatus,
                    canUpload: permissions.canUpload,
                    canReview: permissions.canApprove || permissions.canRequestReplacement,
                    hasFile,
                });
                const label = [workspaceFinalStatus, stage, status].join('/');
                assert.doesNotMatch(presentation.guidance, /review/i, label);
                assert.notEqual(presentation.noteField, 'review', label);
                if (!permissions.canUpload) {
                    assert.equal(presentation.noteField, null, label);
                }
            }
        }
    }

    const closed = getFastTrackDocumentRowPresentation({
        role: 'user', workspaceFinalStatus: 'cancelled', canUpload: false, canReview: false, hasFile: true,
    });
    assert.match(closed.guidance, /closed/i);
    const upload = getFastTrackDocumentRowPresentation({
        role: 'user', workspaceFinalStatus: 'active', canUpload: true, canReview: false, hasFile: false,
    });
    assert.equal(upload.noteField, 'upload');
});

test('document row presentation gives reviewers the note field only when they can review a file', () => {
    assert.equal(getFastTrackDocumentRowPresentation({
        role: 'manager', workspaceFinalStatus: 'active', canUpload: false, canReview: true, hasFile: true,
    }).noteField, 'review');
    assert.equal(getFastTrackDocumentRowPresentation({
        role: 'manager', workspaceFinalStatus: 'active', canUpload: false, canReview: true, hasFile: false,
    }).noteField, null);
    const closedReviewer = getFastTrackDocumentRowPresentation({
        role: 'admin', workspaceFinalStatus: 'completed', canUpload: false, canReview: false, hasFile: true,
    });
    assert.equal(closedReviewer.noteField, null);
    assert.doesNotMatch(closedReviewer.guidance, /leave one short note/i);
});

// Verifier F1(d): appointment completion is not offered while the linked case awaits documents.
test('linked appointment completion is blocked until Fast Track documents are approved', () => {
    const pendingItems = [
        { id: 'identity', label: 'Identity', status: 'approved' },
        { id: 'address', label: 'Address', status: 'uploaded' },
    ] as FastTrackCase['documents']['items'];
    const approvedItems = pendingItems.map((item) => ({ ...item, status: 'approved' as const }));
    const withItems = (items: FastTrackCase['documents']['items'], workspaceFinalStatus: FastTrackCase['workspaceFinalStatus'] = 'active') =>
        buildCase({ workspaceFinalStatus, documents: { ...buildCase().documents, items } });

    assert.equal(getFastTrackViewingCompletionBlockReason(withItems(pendingItems)), FAST_TRACK_DOCUMENTS_PENDING_FOR_VIEWING_MESSAGE);
    assert.equal(getFastTrackViewingCompletionBlockReason(withItems(approvedItems)), null);
    assert.equal(getFastTrackViewingCompletionBlockReason(withItems(pendingItems, 'cancelled')), null);
    assert.equal(getFastTrackViewingCompletionBlockReason(null), null);
    assert.doesNotMatch(FAST_TRACK_DOCUMENTS_PENDING_FOR_VIEWING_MESSAGE, /\bboth\b|\btwo\b/i);
    assert.equal(
        getFastTrackViewingCompletionBlockReason({ ...withItems(pendingItems), finalStatus: 'expired' }),
        FAST_TRACK_EXPIRED_VIEWING_COMPLETION_MESSAGE,
    );
});

// Round 6 (P3-2): mirror the booking documents hold in the stage tabs.
test('a held case with later progress keeps decision, agreement and handover locked', () => {
    const heldDocuments = {
        identityProof: 'verified' as const,
        addressProof: 'reupload_required' as const,
        items: [
            { id: 'identity', label: 'Identity', status: 'approved' as const },
            { id: 'address', label: 'Address', status: 'reupload_needed' as const },
        ],
        allUploaded: false,
        allApproved: false,
    };
    const held = buildCase({
        stage: 'documents',
        documents: heldDocuments,
        viewing: { status: 'completed' },
        decision: { mode: 'rent', status: 'approved' },
        agreement: { status: 'accepted', paymentStatus: 'paid' },
        handover: { status: 'ready' },
    });
    assert.equal(isFastTrackHeldForDocuments(held), true);
    for (const stage of ['decision', 'agreement', 'handover'] as const) {
        assert.equal(isFastTrackStageUnlocked(held, stage), false, stage);
    }
    assert.equal(isFastTrackStageUnlocked(held, 'documents'), true);

    const heldWithAppointment = buildCase({
        stage: 'documents',
        documents: heldDocuments,
        viewingId: 'viewing-1',
        viewing: { status: 'scheduled', scheduledAt: '2026-10-01T10:00:00Z' },
    });
    assert.equal(isFastTrackStageUnlocked(heldWithAppointment, 'viewing'), true);

    const approved = buildCase({
        stage: 'agreement',
        documents: { ...heldDocuments, items: heldDocuments.items.map((item) => ({ ...item, status: 'approved' as const })), allApproved: true },
        viewing: { status: 'completed' },
        decision: { mode: 'rent', status: 'approved' },
        agreement: { status: 'accepted', paymentStatus: 'not_requested' },
    });
    assert.equal(isFastTrackHeldForDocuments(approved), false);
    assert.equal(isFastTrackStageUnlocked(approved, 'handover'), true);

    assert.equal(isFastTrackHeldForDocuments(buildCase({ workspaceFinalStatus: 'completed', documents: heldDocuments })), false);
});

test('expired viewing completion copy says the case can be revived', () => {
    assert.match(FAST_TRACK_EXPIRED_VIEWING_COMPLETION_MESSAGE, /revive/i);
    assert.doesNotMatch(FAST_TRACK_EXPIRED_VIEWING_COMPLETION_MESSAGE, /closed/i);
});
