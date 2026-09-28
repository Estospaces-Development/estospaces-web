// Reconciles a shared case-file document link with the Fast Track review of the
// same document record, so the two manager surfaces never disagree and a
// document already approved (or a closed case) does not invite another review.

type FastTrackItemLike = {
    status?: unknown;
    documentRecordId?: unknown;
    document_record_id?: unknown;
};

type FastTrackCaseLike = {
    workspaceFinalStatus?: unknown;
    finalStatus?: unknown;
    documents?: { items?: unknown };
} | null | undefined;

// Legacy 'expired' is not closed: booking moves it back to in_progress on the next write.
const CLOSED_FINAL_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

const PENDING_LINK_STATUSES = new Set(['uploaded', 'linked']);

const text = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export const getFastTrackApprovedDocumentRecordIds = (fastTrackCase: FastTrackCaseLike): Set<string> => {
    const items = Array.isArray(fastTrackCase?.documents?.items) ? fastTrackCase.documents.items as FastTrackItemLike[] : [];
    const ids = new Set<string>();
    for (const item of items) {
        const recordId = String(item?.documentRecordId || item?.document_record_id || '').trim();
        if (recordId && text(item?.status) === 'approved') {
            ids.add(recordId);
        }
    }
    return ids;
};

export const isFastTrackCaseClosed = (fastTrackCase: FastTrackCaseLike): boolean => {
    if (!fastTrackCase) {
        return false;
    }
    const workspaceStatus = text(fastTrackCase.workspaceFinalStatus);
    return (Boolean(workspaceStatus) && workspaceStatus !== 'active') || CLOSED_FINAL_STATUSES.has(text(fastTrackCase.finalStatus));
};

export const getCaseFileDocumentReviewState = ({
    linkStatus,
    documentId,
    fastTrackApprovedIds,
    caseClosed,
}: {
    linkStatus: string | null | undefined;
    documentId: string | null | undefined;
    fastTrackApprovedIds: Set<string>;
    caseClosed: boolean;
}) => {
    const status = text(linkStatus) || 'uploaded';
    // Sync runs Fast Track -> case file only, so a Fast Track approval may only
    // fill in a link that has no case-file decision yet. A later case-file
    // decision (re-upload, rejected, under review) always wins.
    const approvedInFastTrack = PENDING_LINK_STATUSES.has(status) && fastTrackApprovedIds.has(String(documentId || '').trim());
    const effectiveStatus = approvedInFastTrack ? 'approved' : status;
    return {
        effectiveStatus,
        approvedInFastTrack,
        canApprove: !caseClosed && effectiveStatus !== 'approved',
        canChangeReview: !caseClosed,
    };
};

// Fast Track replacement requests live on the Fast Track case, not as case-file
// requests, so they are added to the case file's open request count.
export const countFastTrackReplacementRequests = (fastTrackCase: FastTrackCaseLike): number => {
    if (!fastTrackCase || isFastTrackCaseClosed(fastTrackCase)) {
        return 0;
    }
    const items = Array.isArray(fastTrackCase.documents?.items) ? fastTrackCase.documents.items as FastTrackItemLike[] : [];
    return items.filter((item) => ['reupload_needed', 'reupload_required'].includes(text(item?.status))).length;
};
