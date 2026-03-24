export type FastTrackDocStatus = 'pending' | 'verified';

export interface FastTrackDocumentsLike {
    identityProof: FastTrackDocStatus;
    addressProof: FastTrackDocStatus;
}

export interface UserDocumentLike {
    document_category: string;
    status: string;
    file_name?: string | null;
    reject_reason?: string | null;
    reviewed_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface UserVerificationInfoLike {
    has_identity_doc?: boolean;
    has_address_doc?: boolean;
    documents_verified?: boolean;
}

export interface LeadLike {
    status?: string;
    stage?: string;
    dispatch_status?: string;
    matched_at?: string;
    first_response_at?: string;
    response_deadline_at?: string;
    sla_deadline?: string;
    sla_status?: string;
    documents_uploaded?: boolean;
    documents_requested?: boolean;
    documents_verified?: boolean;
}

export interface FastTrackCaseLike {
    finalStatus?: string;
    hoursRemaining?: number;
}

export type FastTrackDocumentReviewStatus = 'missing' | 'uploaded' | 'verified' | 'reupload_required';

export interface FastTrackDocumentItem {
    id: 'identity' | 'address';
    title: string;
    status: FastTrackDocumentReviewStatus;
    statusLabel: string;
    fileName: string | null;
    reason: string | null;
    reviewedAt: string | null;
}

export type FastTrackStartAction =
    | 'resume_existing_case'
    | 'create_case_for_existing_lead'
    | 'create_lead_and_case';

const CLOSED_LEAD_STATUSES = new Set(['closed_won', 'closed_lost', 'cancelled']);
const REUPLOAD_STATUSES = new Set(['reupload_required', 'rejected']);
const REVIEW_PENDING_STATUSES = new Set(['pending', 'under_review']);
const APPROVED_DOCUMENT_STATUSES = new Set(['approved', 'verified']);
const FAST_TRACK_DOCUMENT_META: Array<Pick<FastTrackDocumentItem, 'id' | 'title'>> = [
    { id: 'identity', title: 'Identity proof' },
    { id: 'address', title: 'Address proof' },
];

export const buildCaseKey = (propertyId?: string, clientId?: string) => `${propertyId || ''}::${clientId || ''}`;

export const formatLeadStatus = (value?: string) => {
    if (!value) {
        return 'Lead is active';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatLeadStage = (value?: string) => {
    const normalized = String(value || '').trim();
    if (!normalized) {
        return 'Matching broker';
    }

    return normalized
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const isLeadActive = (lead: LeadLike | null | undefined) => {
    if (!lead) {
        return false;
    }

    if (!lead.status) {
        return true;
    }

    return !CLOSED_LEAD_STATUSES.has(lead.status);
};

export const areVerificationDocumentsApproved = (verificationInfo: UserVerificationInfoLike | null | undefined) =>
    Boolean(verificationInfo?.documents_verified);

export const buildDocumentsFromVerification = (
    verificationInfo: UserVerificationInfoLike | null | undefined,
    existingDocuments: FastTrackDocumentsLike,
): FastTrackDocumentsLike => {
    if (!verificationInfo) {
        return existingDocuments;
    }

    return {
        identityProof: verificationInfo.has_identity_doc ? 'verified' : 'pending',
        addressProof: verificationInfo.has_address_doc ? 'verified' : 'pending',
    };
};

const getDocumentTimestamp = (document: UserDocumentLike) => {
    const candidates = [document.updated_at, document.reviewed_at, document.created_at];

    for (const candidate of candidates) {
        const timestamp = new Date(candidate || '').getTime();
        if (Number.isFinite(timestamp) && timestamp > 0) {
            return timestamp;
        }
    }

    return 0;
};

export const latestDocumentByCategory = <T extends UserDocumentLike>(documents: T[]) => {
    const latest = new Map<string, T>();

    documents.forEach((document) => {
        const existing = latest.get(document.document_category);
        const documentTimestamp = getDocumentTimestamp(document);
        const existingTimestamp = existing ? getDocumentTimestamp(existing) : 0;

        if (
            !existing
            || documentTimestamp > existingTimestamp
            || (documentTimestamp > 0 && documentTimestamp === existingTimestamp)
        ) {
            latest.set(document.document_category, document);
        }
    });

    return latest;
};

export const getLatestFastTrackReviewDocuments = <T extends UserDocumentLike>(documents: T[] = []) => {
    const latest = latestDocumentByCategory(documents);

    return FAST_TRACK_DOCUMENT_META
        .map((meta) => latest.get(meta.id))
        .filter((document): document is T => Boolean(document));
};

export const canCompleteFastTrackVerification = (documents: UserDocumentLike[] = []) => {
    const latest = latestDocumentByCategory(documents);

    return FAST_TRACK_DOCUMENT_META.every((meta) => (
        APPROVED_DOCUMENT_STATUSES.has(String(latest.get(meta.id)?.status || '').toLowerCase())
    ));
};

const toFastTrackDocumentStatus = (
    document: UserDocumentLike | null | undefined,
    fallbackStatus: FastTrackDocStatus,
): FastTrackDocumentReviewStatus => {
    const normalizedStatus = String(document?.status || '').toLowerCase();

    if (normalizedStatus === 'approved' || normalizedStatus === 'verified') {
        return 'verified';
    }

    if (REUPLOAD_STATUSES.has(normalizedStatus)) {
        return 'reupload_required';
    }

    if (document) {
        return 'uploaded';
    }

    if (fallbackStatus === 'verified') {
        return 'verified';
    }

    return 'missing';
};

const fastTrackDocumentStatusLabel = (status: FastTrackDocumentReviewStatus) => {
    switch (status) {
        case 'verified':
            return 'Verified';
        case 'reupload_required':
            return 'Re-upload required';
        case 'uploaded':
            return 'Uploaded';
        default:
            return 'Upload needed';
    }
};

export const buildFastTrackDocumentItems = (
    documents: UserDocumentLike[] = [],
    fallback: FastTrackDocumentsLike = {
        identityProof: 'pending',
        addressProof: 'pending',
    },
): FastTrackDocumentItem[] => {
    const latest = latestDocumentByCategory(documents);

    return FAST_TRACK_DOCUMENT_META.map((meta) => {
        const latestDocument = latest.get(meta.id) || null;
        const status = toFastTrackDocumentStatus(
            latestDocument,
            meta.id === 'identity' ? fallback.identityProof : fallback.addressProof,
        );

        return {
            id: meta.id,
            title: meta.title,
            status,
            statusLabel: fastTrackDocumentStatusLabel(status),
            fileName: latestDocument?.file_name || null,
            reason: latestDocument?.reject_reason || null,
            reviewedAt: latestDocument?.reviewed_at || null,
        };
    });
};

export const buildFastTrackVerificationContent = (items: FastTrackDocumentItem[]) => {
    const verifiedItems = items.filter((item) => item.status === 'verified');
    const uploadedItems = items.filter((item) => item.status === 'uploaded');
    const reuploadItems = items.filter((item) => item.status === 'reupload_required');
    const missingItems = items.filter((item) => item.status === 'missing');

    let verificationLabel = 'Upload needed';
    let documentsLabel = 'Waiting for documents';
    let summary = 'Upload identity and address proof to keep the fast-track case moving.';

    if (verifiedItems.length === items.length && items.length > 0) {
        verificationLabel = 'Verified';
        documentsLabel = 'All required documents approved';
        summary = 'Identity and address proofs are approved for this fast-track case.';
    } else if (reuploadItems.length > 0) {
        const item = reuploadItems[0];
        verificationLabel = 'Action needed';
        documentsLabel = `${item.title} needs replacement`;
        summary = item.reason
            ? `${item.title} needs a re-upload: ${item.reason}`
            : `${item.title} needs a re-upload before the fast-track review can continue.`;
    } else if (uploadedItems.length > 0 && verifiedItems.length > 0) {
        verificationLabel = `${verifiedItems.length}/${items.length} verified`;
        documentsLabel = 'Review in progress';
        summary = 'One document is approved and the remaining upload is still under review.';
    } else if (uploadedItems.length > 0) {
        verificationLabel = 'Under review';
        documentsLabel = 'Uploaded and awaiting review';
        summary = 'Uploaded documents are waiting for the manager to review them.';
    } else if (verifiedItems.length > 0 && missingItems.length > 0) {
        verificationLabel = `${verifiedItems.length}/${items.length} verified`;
        documentsLabel = `${missingItems[0].title} still needed`;
        summary = `${verifiedItems[0].title} is approved. Upload the remaining requested document to continue.`;
    }

    return {
        verificationLabel,
        documentsLabel,
        summary,
        reasonLines: items.map((item) => {
            switch (item.status) {
                case 'verified':
                    return `${item.title}: verified`;
                case 'reupload_required':
                    return item.reason
                        ? `${item.title}: ${item.reason}`
                        : `${item.title}: re-upload requested`;
                case 'uploaded':
                    return `${item.title}: uploaded and waiting for review`;
                default:
                    return `${item.title}: not uploaded yet`;
            }
        }),
    };
};

export const getLeadDeadline = (lead: LeadLike | null | undefined) =>
    lead?.response_deadline_at || lead?.sla_deadline || null;

export const getLeadNeedsReupload = (documents: UserDocumentLike[] = []) => {
    const latest = latestDocumentByCategory(documents);
    return Array.from(latest.values()).some((document) => REUPLOAD_STATUSES.has(String(document.status || '').toLowerCase()));
};

export const resolveLeadStage = (
    lead: LeadLike | null | undefined,
    documents: UserDocumentLike[] = [],
) => {
    const normalizedStage = String(lead?.stage || '').trim();
    if (normalizedStage) {
        return normalizedStage;
    }

    if (lead?.status === 'closed_won') {
        return 'completed';
    }
    if (lead?.status === 'closed_lost' || lead?.status === 'cancelled' || (lead?.sla_status === 'breach' && !lead?.first_response_at)) {
        return 'expired';
    }
    if (lead?.documents_verified) {
        return 'approved';
    }

    const latest = latestDocumentByCategory(documents);
    const latestDocuments = Array.from(latest.values());
    const hasUploadedDocuments = Boolean(lead?.documents_uploaded || latestDocuments.length > 0);
    const hasReviewPending = latestDocuments.some((document) => REVIEW_PENDING_STATUSES.has(String(document.status || '').toLowerCase()));

    if (hasUploadedDocuments && !hasReviewPending) {
        return 'docs_uploaded';
    }
    if (hasUploadedDocuments) {
        return 'under_review';
    }
    if (lead?.documents_requested) {
        return 'docs_requested';
    }
    if (lead?.first_response_at || lead?.matched_at || lead?.dispatch_status === 'broker_matched' || lead?.status === 'broker_responded' || lead?.status === 'viewing_scheduled') {
        return 'broker_matched';
    }

    return 'matching';
};

export const buildDocumentsFromDetails = (
    documents: UserDocumentLike[],
    fallback: FastTrackDocumentsLike,
): FastTrackDocumentsLike => {
    const items = buildFastTrackDocumentItems(documents, fallback);
    const identity = items.find((item) => item.id === 'identity');
    const address = items.find((item) => item.id === 'address');

    return {
        identityProof: identity?.status === 'verified' ? 'verified' : 'pending',
        addressProof: address?.status === 'verified' ? 'verified' : 'pending',
    };
};

export const buildVerificationSummary = (
    verificationInfo: UserVerificationInfoLike | null | undefined,
    matchingLead: LeadLike | null,
    documents: FastTrackDocumentsLike,
) => {
    if (documents.identityProof === 'verified' && documents.addressProof === 'verified') {
        return 'Identity and address verified';
    }

    if (documents.identityProof === 'verified') {
        return 'Identity verified. Waiting for address proof.';
    }

    if (documents.addressProof === 'verified') {
        return 'Address verified. Waiting for identity proof.';
    }

    if (matchingLead?.documents_uploaded || verificationInfo?.has_identity_doc || verificationInfo?.has_address_doc) {
        return 'Files uploaded and awaiting review';
    }

    return 'Awaiting user uploads';
};

export const getFastTrackStartAction = (
    lead: LeadLike | null,
    fastTrackCase: FastTrackCaseLike | null,
): FastTrackStartAction => {
    if (fastTrackCase?.finalStatus === 'in_progress') {
        return 'resume_existing_case';
    }

    if (isLeadActive(lead)) {
        return 'create_case_for_existing_lead';
    }

    return 'create_lead_and_case';
};

export const isFastTrackCaseOverdue = (
    fastTrackCase: FastTrackCaseLike | null | undefined,
) => Boolean(
    fastTrackCase
    && fastTrackCase.finalStatus === 'in_progress'
    && Number(fastTrackCase.hoursRemaining ?? 0) <= 0,
);

export const needsFastTrackCaseAttention = (
    fastTrackCase: FastTrackCaseLike | null | undefined,
) => (
    fastTrackCase?.finalStatus === 'expired'
    || fastTrackCase?.finalStatus === 'rejected'
    || isFastTrackCaseOverdue(fastTrackCase)
);

export const normalizeWorkspaceDocuments = <T>(
    documents: T[] | null | undefined,
    error?: string | null,
) => {
    if (error) {
        return [] as T[];
    }

    return documents || [];
};

export const shouldBlockFastTrackWorkspaceRefresh = (
    lead: LeadLike | null | undefined,
    fastTrackCase: FastTrackCaseLike | null | undefined,
    documents: UserDocumentLike[] = [],
) => !lead && !fastTrackCase && documents.length === 0;
