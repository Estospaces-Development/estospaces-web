import type { FastTrackCase, FastTrackStage } from '@/services/fastTrackService';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';

export type FastTrackWorkspaceRole = 'user' | 'manager' | 'admin';

export const FAST_TRACK_AGREEMENT_PUBLISHED_MESSAGE = (
    'Agreement published. Waiting for the user to sign before handover.'
);

export const getFastTrackManagerAgreementStatus = (
    fastTrackCase: Pick<FastTrackCase, 'agreement' | 'handover' | 'workspaceFinalStatus'>,
) => {
    const normalizedStatus = String(fastTrackCase.agreement.status || '').trim().toLowerCase();
    const paymentStatus = String(fastTrackCase.agreement.paymentStatus || '').trim().toLowerCase();
    const handoverStatus = String(fastTrackCase.handover.status || '').trim().toLowerCase();

    if (fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return {
            title: 'Fast Track closed',
            description: 'This case is closed. Its agreement history remains available for reference.',
        };
    }

    if (fastTrackCase.workspaceFinalStatus === 'completed' || handoverStatus === 'completed') {
        return {
            title: 'Fast Track completed',
            description: 'The agreement was accepted and the handover has been completed.',
        };
    }

    if (['accepted', 'signed', 'completed'].includes(normalizedStatus)) {
        if (PAYMENTS_ENABLED && paymentStatus === 'requested') {
            return {
                title: 'Agreement accepted',
                description: 'The user has signed. Confirm the requested payment before handover.',
            };
        }

        return {
            title: 'Agreement accepted',
            description: 'The user has signed the agreement. Continue to the handover stage.',
        };
    }

    if (normalizedStatus === 'sent') {
        return {
            title: 'Awaiting user signature',
            description: 'The agreement is published. Handover unlocks after the user signs it.',
        };
    }

    return {
        title: 'Ready to publish',
        description: 'Publish the agreement, then the user must sign it before handover unlocks.',
    };
};

const FAST_TRACK_STAGE_KEYS: FastTrackStage[] = [
    'selected',
    'documents',
    'viewing',
    'decision',
    'agreement',
    'handover',
];

export const isFastTrackCaseComplete = (fastTrackCase: FastTrackCase | null | undefined) => (
    Boolean(fastTrackCase)
    && (
        fastTrackCase?.workspaceFinalStatus === 'completed'
        || fastTrackCase?.finalStatus === 'completed'
        || fastTrackCase?.handover.status === 'completed'
    )
);

export const isFastTrackManagerReviewEligible = (fastTrackCase: FastTrackCase | null | undefined) => {
    if (!fastTrackCase?.managerId || fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return false;
    }

    if (isFastTrackCaseComplete(fastTrackCase)) {
        return true;
    }

    if (['viewing', 'decision', 'agreement', 'handover'].includes(fastTrackCase.stage)) {
        return true;
    }

    if (fastTrackCase.activity.some((item) => String(item.actorRole || '').trim().toLowerCase() === 'manager')) {
        return true;
    }

    if (fastTrackCase.documents.items.some((item) => item.reviewedAt || item.reviewedBy)) {
        return true;
    }

    return Boolean(
        fastTrackCase.viewing.scheduledAt
        || fastTrackCase.viewing.status !== 'pending'
        || fastTrackCase.decision.status !== 'pending'
        || fastTrackCase.agreement.status !== 'pending'
        || fastTrackCase.handover.status !== 'pending'
    );
};

export const canUserConfirmFastTrackHandover = (fastTrackCase: FastTrackCase | null | undefined) => {
    const handoverStatus = String(fastTrackCase?.handover.status || '').trim().toLowerCase();
    return Boolean(
        fastTrackCase
        && !fastTrackCase?.handover.confirmedByUser
        && (handoverStatus === 'ready' || handoverStatus === 'completed'),
    );
};

export const isFastTrackCaseCompleteForRole = (
    fastTrackCase: FastTrackCase | null | undefined,
    role: FastTrackWorkspaceRole,
) => {
    if (role === 'user' && canUserConfirmFastTrackHandover(fastTrackCase)) {
        return false;
    }
    return isFastTrackCaseComplete(fastTrackCase);
};

export const resolveFastTrackSelectionCaseId = (
    cases: FastTrackCase[],
    params: URLSearchParams,
    previous: string | null,
) => {
    if (cases.length === 0) {
        return null;
    }

    const normalizeSelectionValue = (value: string | null | undefined) => (
        String(value || '').trim().toLowerCase()
    );

    const matchByField = (
        requestedValue: string | null,
        selector: (item: FastTrackCase) => string | undefined,
    ) => {
        const normalizedRequestedValue = normalizeSelectionValue(requestedValue);
        if (!normalizedRequestedValue) {
            return null;
        }
        const match = cases.find((item) => normalizeSelectionValue(selector(item)) === normalizedRequestedValue);
        return match?.caseId || null;
    };

    const recordMatches = [
        matchByField(params.get('application'), (item) => item.applicationId),
        matchByField(params.get('viewing'), (item) => item.viewingId),
        matchByField(params.get('contract'), (item) => item.contractId),
        matchByField(params.get('payment') || params.get('invoice'), (item) => item.paymentId),
    ];
    const matchedRecord = recordMatches.find(Boolean);
    if (matchedRecord) {
        return matchedRecord;
    }

    const requestedCaseId = normalizeSelectionValue(params.get('case'));
    if (requestedCaseId) {
        const match = cases.find((item) => normalizeSelectionValue(item.caseId) === requestedCaseId);
        if (match) {
            return match.caseId;
        }
    }

    const fallbacks = [
        matchByField(params.get('lead'), (item) => item.leadId),
        matchByField(params.get('property'), (item) => item.propertyId),
    ];

    const matchedFallback = fallbacks.find(Boolean);
    if (matchedFallback) {
        return matchedFallback;
    }

    const previousCaseId = normalizeSelectionValue(previous);
    if (previousCaseId) {
        const match = cases.find((item) => normalizeSelectionValue(item.caseId) === previousCaseId);
        if (match) {
            return match.caseId;
        }
    }

    return cases[0].caseId;
};

export const buildFastTrackSelectionSearchParams = (
    current: URLSearchParams,
    selectedCaseId: string,
) => {
    const next = new URLSearchParams(current);
    next.set('case', selectedCaseId.trim());
    return next;
};

export const resolveFastTrackStageSearchParam = (params: URLSearchParams): FastTrackStage | null => {
    const requestedStage = String(params.get('section') || params.get('stage') || '').trim().toLowerCase();
    if (FAST_TRACK_STAGE_KEYS.includes(requestedStage as FastTrackStage)) {
        return requestedStage as FastTrackStage;
    }
    return null;
};

export const isFastTrackHistoricalStageForCase = (
    params: URLSearchParams,
    caseId: string | null | undefined,
) => {
    const historicalCaseId = String(params.get('stageHistory') || '').trim().toLowerCase();
    const selectedCaseId = String(caseId || '').trim().toLowerCase();
    return historicalCaseId !== '' && historicalCaseId === selectedCaseId;
};

export const buildFastTrackStageSearchParams = (
    current: URLSearchParams,
    stage: FastTrackStage,
    preserveHistoricalStage = false,
) => {
    const next = new URLSearchParams(current);
    next.set('section', stage);
    next.delete('stage');
    const selectedCaseId = String(next.get('case') || '').trim();
    if (preserveHistoricalStage && selectedCaseId) {
        next.set('stageHistory', selectedCaseId);
    } else {
        next.delete('stageHistory');
    }
    if (stage !== 'documents') {
        next.delete('document');
        next.delete('file');
    }
    return next;
};

export const resolveFastTrackPendingStageSelection = (
    pendingSelection: { caseId: string; stage: FastTrackStage } | null,
    selectedCaseId: string | null | undefined,
    requestedStage: FastTrackStage | null,
) => {
    const pendingCaseId = String(pendingSelection?.caseId || '').trim().toLowerCase();
    const selected = String(selectedCaseId || '').trim().toLowerCase();
    const appliesToSelectedCase = Boolean(pendingSelection && pendingCaseId && pendingCaseId === selected);

    if (!appliesToSelectedCase || !pendingSelection) {
        return {
            requestedStage,
            awaitingURLSync: false,
        };
    }

    return {
        requestedStage: pendingSelection.stage,
        awaitingURLSync: requestedStage !== pendingSelection.stage,
    };
};

export const shouldStartDocumentsWhenSelectingStage = (
    fastTrackCase: Pick<FastTrackCase, 'stage' | 'workspaceFinalStatus' | 'managerId'> | null | undefined,
    role: FastTrackWorkspaceRole,
    requestedStage: FastTrackStage,
) => Boolean(
    role === 'manager'
    && requestedStage === 'documents'
    && fastTrackCase?.stage === 'selected'
    && fastTrackCase?.workspaceFinalStatus === 'active'
    && fastTrackCase?.managerId
);

export const resolveFastTrackVisibleStage = (
    fastTrackCase: FastTrackCase | null | undefined,
    activeStageOverride: FastTrackStage | null,
): FastTrackStage => {
    if (!fastTrackCase) {
        return 'selected';
    }

    if (activeStageOverride && isFastTrackStageUnlocked(fastTrackCase, activeStageOverride)) {
        return activeStageOverride;
    }

    return fastTrackCase.stage;
};

export const shouldDeferFastTrackStageResolution = (
    requestedCaseId: string | null | undefined,
    selectedCaseId: string | null | undefined,
) => {
    const requested = String(requestedCaseId || '').trim().toLowerCase();
    const selected = String(selectedCaseId || '').trim().toLowerCase();
    return requested !== '' && requested !== selected;
};

export const shouldRemoveFastTrackStaleCaseLink = ({
    requestedCaseId,
    loading,
    requestedCaseIsAvailable,
    requestedCaseLookupPending,
    requestedCaseLookupMissed,
}: {
    requestedCaseId: string | null | undefined;
    loading: boolean;
    requestedCaseIsAvailable: boolean;
    requestedCaseLookupPending: boolean;
    requestedCaseLookupMissed: boolean;
}) => Boolean(
    String(requestedCaseId || '').trim()
    && !loading
    && !requestedCaseIsAvailable
    && !requestedCaseLookupPending
    && requestedCaseLookupMissed
);

export const shouldDeferFastTrackSelectionURLSync = ({
    requestedCaseId,
    requestedCaseIsAvailable,
    requestedCaseLookupMissed,
}: {
    requestedCaseId: string | null | undefined;
    requestedCaseIsAvailable: boolean;
    requestedCaseLookupMissed: boolean;
}) => Boolean(
    String(requestedCaseId || '').trim()
    && !requestedCaseIsAvailable
    && !requestedCaseLookupMissed
);

export const isFastTrackStageUnlocked = (
    fastTrackCase: FastTrackCase | null | undefined,
    targetStage: FastTrackStage,
) => {
    if (!fastTrackCase) {
        return false;
    }

    if (fastTrackCase.workspaceFinalStatus === 'completed') {
        return true;
    }

    const currentStageIndex = FAST_TRACK_STAGE_KEYS.indexOf(fastTrackCase.stage);
    const targetStageIndex = FAST_TRACK_STAGE_KEYS.indexOf(targetStage);
    if (targetStageIndex <= currentStageIndex) {
        return true;
    }

    if (targetStage === 'documents') {
        return fastTrackCase.workspaceFinalStatus === 'active';
    }

    const viewingStatus = String(fastTrackCase.viewing.status || '').trim().toLowerCase();
    if (targetStage === 'viewing') {
        return fastTrackCase.documents.allApproved
            || Boolean(fastTrackCase.viewingId || fastTrackCase.viewing.scheduledAt)
            || ['scheduled', 'change_requested', 'completed', 'skipped'].includes(viewingStatus);
    }

    if (targetStage === 'decision') {
        return viewingStatus === 'completed' || viewingStatus === 'skipped';
    }

    const decisionStatus = String(fastTrackCase.decision.status || '').trim().toLowerCase();
    if (targetStage === 'agreement') {
        return decisionStatus === 'approved' || decisionStatus === 'accepted';
    }

    const agreementStatus = String(fastTrackCase.agreement.status || '').trim().toLowerCase();
    const paymentStatus = String(fastTrackCase.agreement.paymentStatus || '').trim().toLowerCase();
    const handoverStatus = String(fastTrackCase.handover.status || '').trim().toLowerCase();
    return (
        ['ready', 'completed'].includes(handoverStatus)
        || (
            ['accepted', 'signed', 'completed'].includes(agreementStatus)
            && (!PAYMENTS_ENABLED || paymentStatus !== 'requested')
        )
    );
};

export const resolveFastTrackStageNavigation = (
    fastTrackCase: FastTrackCase | null | undefined,
    requestedStage: FastTrackStage | null,
    previousBackendStage: FastTrackStage | null = null,
    preserveHistoricalStage = false,
) => {
    if (!fastTrackCase) {
        return {
            visibleStage: 'selected' as FastTrackStage,
            shouldReplaceStageParam: false,
        };
    }

    const currentStageIndex = FAST_TRACK_STAGE_KEYS.indexOf(fastTrackCase.stage);
    const requestedStageIndex = requestedStage
        ? FAST_TRACK_STAGE_KEYS.indexOf(requestedStage)
        : -1;
    const staleStageOnFreshLoad = previousBackendStage === null
        && requestedStage !== null
        && !preserveHistoricalStage
        && requestedStageIndex < currentStageIndex;
    const stageAdvancedWhileOpen = Boolean(
        previousBackendStage
        && previousBackendStage !== fastTrackCase.stage
        && requestedStage === previousBackendStage,
    );
    const stageAfterProgress = staleStageOnFreshLoad || stageAdvancedWhileOpen
        ? fastTrackCase.stage
        : requestedStage;
    const visibleStage = resolveFastTrackVisibleStage(fastTrackCase, stageAfterProgress);

    return {
        visibleStage,
        shouldReplaceStageParam: requestedStage !== null && requestedStage !== visibleStage,
    };
};

export const canUserPrepareFastTrackDocuments = (
    fastTrackCase: Pick<FastTrackCase, 'workspaceFinalStatus'> | null | undefined,
) => fastTrackCase?.workspaceFinalStatus === 'active';

export const canStartFastTrackDocumentUpload = (
    item: Pick<FastTrackCase['documents']['items'][number], 'status' | 'documentRecordId' | 'fileName' | 'fileUrl'>,
    file: Pick<File, 'name' | 'size' | 'lastModified'> | null | undefined,
    uploadInFlight: boolean,
) => Boolean(
    file
    && !uploadInFlight
    && ['pending', 'requested', 'uploaded', 'reupload_needed', 'approved'].includes(item.status),
);

export const buildFastTrackDocumentRequestFieldKey = (
    caseId: string,
    documentId: string,
) => `${caseId.trim()}:${documentId.trim()}`;

export const buildFastTrackDocumentRequestPayload = (
    documentId: string,
    reason: string,
    dueAtValue: string,
    now = Date.now(),
) => {
    const normalizedDocumentId = documentId.trim();
    const normalizedReason = reason.trim();
    if (!normalizedDocumentId) {
        return { payload: null, error: 'Choose a document to request.' };
    }
    if (!normalizedReason) {
        return { payload: null, error: 'Add a reason for this document request.' };
    }
    if ([...normalizedReason].length > 500) {
        return { payload: null, error: 'Keep the document request reason to 500 characters or fewer.' };
    }

    const dueAtTimestamp = Date.parse(dueAtValue);
    if (!Number.isFinite(dueAtTimestamp)) {
        return { payload: null, error: 'Choose a valid deadline for this document request.' };
    }
    if (dueAtTimestamp <= now) {
        return { payload: null, error: 'Choose a future deadline for this document request.' };
    }

    return {
        payload: {
            document_id: normalizedDocumentId,
            reason: normalizedReason,
            due_at: new Date(dueAtTimestamp).toISOString(),
        },
        error: null,
    };
};

export const formatFastTrackDocumentRequestInputValue = (value?: string) => {
    const timestamp = Date.parse(String(value || ''));
    if (!Number.isFinite(timestamp)) {
        return '';
    }
    const date = new Date(timestamp);
    const localTimestamp = new Date(timestamp - date.getTimezoneOffset() * 60_000);
    return localTimestamp.toISOString().slice(0, 16);
};

export const getFastTrackDocumentReviewActions = (
    status: FastTrackCase['documents']['items'][number]['status'],
    hasAttachedFile: boolean,
) => ({
    canApprove: hasAttachedFile && status === 'uploaded',
    canRequestReplacement: hasAttachedFile && (status === 'uploaded' || status === 'approved'),
});

export const resolveFastTrackDocumentSearchParam = (
    params: URLSearchParams,
    validDocumentIds: string[] = [],
) => {
    const requestedDocument = String(params.get('document') || params.get('file') || '').trim().toLowerCase();
    if (!requestedDocument) {
        return null;
    }
    if (validDocumentIds.length === 0) {
        return requestedDocument;
    }
    const match = validDocumentIds.find((id) => String(id || '').trim().toLowerCase() === requestedDocument);
    return match || null;
};

export const resolveFastTrackDocumentFocusAfterRefresh = (
    params: URLSearchParams,
    previousFocusId: string | null,
    validDocumentIds: string[],
) => {
    const requestedDocumentId = resolveFastTrackDocumentSearchParam(params, validDocumentIds);
    if (requestedDocumentId) {
        return requestedDocumentId;
    }
    if (previousFocusId && validDocumentIds.includes(previousFocusId)) {
        return previousFocusId;
    }
    return validDocumentIds[0] || null;
};

export const buildFastTrackDocumentSearchParams = (
    current: URLSearchParams,
    documentId: string,
) => {
    const next = new URLSearchParams(current);
    next.set('document', documentId.trim());
    if (!next.get('section')) {
        next.set('section', 'documents');
    }
    const selectedCaseId = String(next.get('case') || '').trim();
    if (selectedCaseId) {
        next.set('stageHistory', selectedCaseId);
    } else {
        next.delete('stageHistory');
    }
    return next;
};

export const buildFastTrackDocumentDraftStorageKey = (
    role: FastTrackWorkspaceRole,
    caseId?: string | null,
) => {
    const normalizedCaseId = String(caseId || '').trim();
    if (!normalizedCaseId) {
        return '';
    }
    return `fast-track:document-drafts:${role}:${encodeURIComponent(normalizedCaseId)}`;
};

export const isFastTrackDocumentDraftDirty = (
    notes: Record<string, string | null | undefined>,
) => Object.values(notes).some((value) => String(value || '').trim() !== '');

export const getFastTrackDecisionGuard = (
    fastTrackCase: FastTrackCase,
    outcome: 'approved' | 'rejected',
    amount: string | number | null | undefined,
    role: FastTrackWorkspaceRole,
) => {
    if (role === 'user') {
        return null;
    }

    const viewingStatus = String(fastTrackCase.viewing.status || '').trim().toLowerCase();
    const stageIndex = FAST_TRACK_STAGE_KEYS.indexOf(fastTrackCase.stage);
    const decisionStageIndex = FAST_TRACK_STAGE_KEYS.indexOf('decision');
    const viewingReady = viewingStatus === 'completed'
        || viewingStatus === 'skipped'
        || stageIndex >= decisionStageIndex;
    if (!viewingReady) {
        return 'Complete or skip the viewing before recording an outcome.';
    }

    const numericAmount = typeof amount === 'number'
        ? amount
        : Number(String(amount || '').trim());
    if (fastTrackCase.journeyMode === 'sale' && outcome === 'approved' && (!Number.isFinite(numericAmount) || numericAmount <= 0)) {
        return 'Enter a valid offer amount before approving.';
    }

    return null;
};

export const getFastTrackFinalDecisionGuard = (
    fastTrackCase: FastTrackCase,
    outcome: 'approved' | 'rejected',
    amount: string | number | null | undefined,
    role: FastTrackWorkspaceRole,
) => getFastTrackDecisionGuard(fastTrackCase, outcome, amount, role);

export const fastTrackCaseMatchesQuery = (
    fastTrackCase: FastTrackCase,
    query: string,
) => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }

    const compactQuery = normalizedQuery.replace(/[^a-z0-9]/g, '');
    const compactQueryWithoutAppPrefix = compactQuery.startsWith('app')
        ? compactQuery.slice(3)
        : compactQuery;
    const queryTokens = [normalizedQuery, compactQuery, compactQueryWithoutAppPrefix]
        .filter(Boolean);

    return [
        fastTrackCase.propertyTitle,
        fastTrackCase.clientName,
        fastTrackCase.caseId,
        fastTrackCase.applicationId,
        fastTrackCase.leadId,
        fastTrackCase.viewingId,
        fastTrackCase.contractId,
        fastTrackCase.paymentId,
        fastTrackCase.brokerRequestId,
        fastTrackCase.propertyId,
        fastTrackCase.managerId,
    ].some((source) => {
        const normalizedSource = String(source || '').toLowerCase();
        const compactSource = normalizedSource.replace(/[^a-z0-9]/g, '');
        return queryTokens.some((token) => (
            normalizedSource.includes(token)
            || compactSource.includes(token)
        ));
    });
};

export const resolveFastTrackThreadRecipientId = (
    role: FastTrackWorkspaceRole,
    currentUserId: string | undefined,
    fastTrackCase: FastTrackCase | null,
) => {
    if (!fastTrackCase) {
        return null;
    }

    const currentId = String(currentUserId || '').trim();
    if (role === 'user') {
        const managerId = String(fastTrackCase.managerId || '').trim();
        if (!managerId || managerId === currentId) {
            return null;
        }
        return managerId;
    }

    const clientId = String(fastTrackCase.clientId || '').trim();
    if (!clientId || clientId === currentId) {
        return null;
    }
    return clientId;
};

export const buildFastTrackThreadRecipientLabel = (
    role: FastTrackWorkspaceRole,
    fastTrackCase: FastTrackCase | null,
) => {
    if (!fastTrackCase) {
        return role === 'user' ? 'Messages' : 'Case chat';
    }
    if (role === 'user') {
        return fastTrackCase.managerId ? 'Your helper' : 'Support team';
    }
    return fastTrackCase.clientName || 'Client';
};

export const describeFastTrackWorkspaceFocus = (
    fastTrackCase: FastTrackCase,
    role: FastTrackWorkspaceRole,
) => {
    if (isFastTrackCaseCompleteForRole(fastTrackCase, role)) {
        return role === 'user' ? 'Your journey is complete' : 'Case finished';
    }
    if (fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return role === 'user' ? 'This journey is closed' : 'Case closed';
    }

    switch (fastTrackCase.stage) {
        case 'documents':
            return role === 'user' ? 'Upload the core files' : 'Review the uploaded files';
        case 'viewing':
            return role === 'user' ? 'Check or change your viewing' : 'Set or update the viewing';
        case 'decision':
            return role === 'user'
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'Check the latest offer update'
                    : 'Check the latest decision update'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Record the offer result'
                    : 'Record the application result';
        case 'agreement':
            if (role === 'user') {
                return fastTrackCase.journeyMode === 'sale'
                    ? 'Review the memorandum, solicitor conveyancing, and exchange plan'
                    : 'Read and sign the agreement';
            }
            if (fastTrackCase.journeyMode === 'sale') {
                return 'Prepare legal memorandum, conveyancing, exchange, and completion';
            }
            return PAYMENTS_ENABLED && (fastTrackCase.agreement.paymentStatus === 'requested' || fastTrackCase.agreement.paymentStatus === 'paid')
                ? 'Confirm payment and move to handover'
                : 'Publish the agreement';
        case 'handover':
            return role === 'user'
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'Track completion and final keys'
                    : 'Confirm key handover'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Finish sale completion and key handover'
                    : 'Finish handover';
        default:
            if (role === 'user') {
                return 'Prepare your documents now';
            }
            return fastTrackCase.managerId ? 'Start documents' : 'Claim and start';
    }
};

export const describeFastTrackWorkspaceStatus = (
    fastTrackCase: FastTrackCase,
    role: FastTrackWorkspaceRole,
) => {
    if (isFastTrackCaseCompleteForRole(fastTrackCase, role)) {
        return role === 'user'
            ? 'Every step is complete. You can keep this page for records and updates.'
            : 'Every core step was completed inside this workspace.';
    }
    if (fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return role === 'user'
            ? 'This journey ended here and no further action is needed.'
            : 'The live case ended here and no further action is needed.';
    }

    switch (fastTrackCase.stage) {
        case 'documents':
            return role === 'user'
                ? 'Share each required document here. Extra notes and previews are available only when you need them.'
                : 'Preview every uploaded file, approve it, or request one replacement on the same page.';
        case 'viewing':
            return role === 'user'
                ? 'Your viewing time, any change request, and the final confirmation all stay here.'
                : 'Scheduling, rescheduling, skip, and completion all happen in this one lane.';
        case 'decision':
            return role === 'user'
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'You will see the latest offer update here as soon as it is recorded.'
                    : 'You will see the latest decision here as soon as it is recorded.'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Offer decisions stay on this page. No handoff to another purchase screen is needed.'
                    : 'Application decisions stay on this page. No handoff to another review screen is needed.';
        case 'agreement':
            return role === 'user'
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'The legal path stays here: memorandum, solicitor conveyancing, exchange, and completion before final keys.'
                    : 'Signing and handover preparation stay in this one place.'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Keep the memorandum, solicitor conveyancing, exchange, and completion checks inside this case before handover.'
                    : 'Agreement publishing and handover preparation stay inside this case.';
        case 'handover':
            return role === 'user'
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'Completion and key handover happen after the legal memorandum, conveyancing, and exchange steps are ready.'
                    : 'Confirm the final handover here to close your journey.'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Only finish handover after offer acceptance, memorandum, solicitor conveyancing, exchange, and completion are ready.'
                    : 'Mark the case ready, confirm the final note, and complete it here.';
        default:
            return role === 'user'
                ? 'You can open Share your documents now, upload identity and address evidence, and switch between both files while your manager prepares the review.'
                : fastTrackCase.managerId
                    ? 'This case is assigned. Open documents here so the rest of the journey stays on one page.'
                    : 'Claim the case, then open documents here so the rest of the journey stays on one page.';
    }
};
