import type { FastTrackCase, FastTrackStage } from '@/services/fastTrackService';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';

export type FastTrackWorkspaceRole = 'user' | 'manager' | 'admin';

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

export const buildFastTrackStageSearchParams = (
    current: URLSearchParams,
    stage: FastTrackStage,
) => {
    const next = new URLSearchParams(current);
    next.set('section', stage);
    return next;
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
    next.set('section', 'documents');
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
                return fastTrackCase.journeyMode === 'sale'
                    ? 'Offer, memorandum, conveyancing, exchange, and completion stay visible here'
                    : 'We are preparing your next step';
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
                ? fastTrackCase.journeyMode === 'sale'
                    ? 'Your purchase journey moves through offer review, memorandum, solicitor conveyancing, exchange, completion, and keys in one place.'
                    : 'The team will open the next step here. You stay in this journey from start to finish.'
                : fastTrackCase.managerId
                    ? 'This case is assigned. Open documents here so the rest of the journey stays on one page.'
                    : 'Claim the case, then open documents here so the rest of the journey stays on one page.';
    }
};
