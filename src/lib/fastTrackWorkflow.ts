import { PAYMENTS_ENABLED } from '@/lib/launchFlags';

export type FastTrackDocStatus = 'pending' | 'uploaded' | 'reupload_required' | 'verified';

export interface FastTrackDocumentsLike {
    identityProof: FastTrackDocStatus;
    addressProof: FastTrackDocStatus;
}

export interface UserDocumentLike {
    document_category: string;
    status: string;
    lead_id?: string | null;
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
    backendCurrentStep?: string;
    currentStep?: string;
    finalStatus?: string;
    workspaceFinalStatus?: string;
    hoursRemaining?: number;
    overdue?: boolean;
    submittedAt?: string | null;
    expiresAt?: string | null;
    journeyType?: 'rent' | 'buy';
    jurisdiction?: string;
    liveStage?: string;
    documentPhase?: FastTrackDocumentPhase;
    documentPhaseReason?: string;
}

export interface FastTrackLinkedJourneyLike {
    application?: { status?: string | null; liveStage?: string | null } | null;
    viewing?: { status?: string | null } | null;
    contract?: { status?: string | null; liveStage?: string | null } | null;
    saleProgression?: { current_stage?: string | null; status?: string | null; liveStage?: string | null } | null;
    payments?: Array<{ status?: string | null; payment_type?: string | null }>;
    invoices?: Array<{ status?: string | null; payment_type?: string | null }>;
    liveStage?: string | null;
}

export type FastTrackDocumentPhase =
    | 'not_requested'
    | 'waiting_for_upload'
    | 'uploaded_under_review'
    | 'replacement_required'
    | 'verified';

export type CanonicalFastTrackStep =
    | 'property_selected'
    | 'documents_requested'
    | 'documents_verified'
    | 'viewing_scheduled'
    | 'viewing_completed'
    | 'application_in_review'
    | 'ready_for_contract'
    | 'completed';

export const FAST_TRACK_STEP_SEQUENCE: CanonicalFastTrackStep[] = [
    'property_selected',
    'documents_requested',
    'documents_verified',
    'viewing_scheduled',
    'viewing_completed',
    'application_in_review',
    'ready_for_contract',
    'completed',
];

export const FAST_TRACK_STEP_META: Record<CanonicalFastTrackStep, { label: string; description: string }> = {
    property_selected: {
        label: 'Property selected',
        description: 'A specific property is now linked to the live fast-track case.',
    },
    documents_requested: {
        label: 'Documents requested',
        description: 'The client has been asked to upload identity and address documents for review.',
    },
    documents_verified: {
        label: 'Documents verified',
        description: 'Verification documents are approved and the case is ready for viewing logistics.',
    },
    viewing_scheduled: {
        label: 'Viewing scheduled',
        description: 'A real viewing appointment is booked from the linked lead and appointments flow.',
    },
    viewing_completed: {
        label: 'Viewing completed',
        description: 'The viewing is complete and the downstream review can now continue.',
    },
    application_in_review: {
        label: 'Application in review',
        description: 'The broker and manager are reviewing the linked rent or sale decision next.',
    },
    ready_for_contract: {
        label: 'Ready for contract',
        description: 'The rent journey is ready for a tenancy agreement or the sale journey is at final approval readiness.',
    },
    completed: {
        label: 'Completed',
        description: 'The fast-track workflow is fully complete and the linked deal is locked in.',
    },
};

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

export const isActiveFastTrackCase = (
    fastTrackCase: FastTrackCaseLike | null | undefined,
) => (
    fastTrackCase?.workspaceFinalStatus === 'active'
    || fastTrackCase?.finalStatus === 'in_progress'
);

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

export const normalizeComplianceJurisdiction = (value?: string | null) => {
    switch (String(value || '').trim().toLowerCase()) {
        case 'scotland':
            return 'scotland';
        case 'wales':
            return 'wales';
        case 'northern ireland':
        case 'northern_ireland':
        case 'ni':
            return 'northern_ireland';
        case 'england':
        default:
            return 'england';
    }
};

export const isEnglandJurisdiction = (value?: string | null) => normalizeComplianceJurisdiction(value) === 'england';

export const normalizeCanonicalFastTrackStep = (value?: string | null): CanonicalFastTrackStep => {
    switch (String(value || '').trim()) {
        case 'property_selected':
            return 'property_selected';
        case 'documents':
        case 'documents_requested':
            return 'documents_requested';
        case 'documents_verified':
            return 'documents_verified';
        case 'viewing_scheduled':
            return 'viewing_scheduled';
        case 'viewing_completed':
            return 'viewing_completed';
        case 'referencing':
        case 'right_to_rent_or_national_compliance':
        case 'buyer_qualification':
        case 'offer':
        case 'sale_agreed':
        case 'memorandum':
        case 'conveyancing':
        case 'exchange':
        case 'application_in_review':
            return 'application_in_review';
        case 'approval':
        case 'tenancy_pack_issued':
        case 'signatures_pending':
        case 'deposit_and_first_rent':
        case 'ready_for_contract':
            return 'ready_for_contract';
        case 'active_tenancy':
        case 'completion':
        case 'completed':
            return 'completed';
        case 'owner_approval':
        case 'legal_check':
            return 'application_in_review';
        case 'payment_ready':
            return 'ready_for_contract';
        default:
            return 'property_selected';
    }
};

export const hasFastTrackReachedCompletion = (
    fastTrackCase?: Pick<FastTrackCaseLike, 'backendCurrentStep' | 'currentStep' | 'finalStatus'> | null,
) => (
    normalizeCanonicalFastTrackStep(fastTrackCase?.backendCurrentStep || fastTrackCase?.currentStep) === 'completed'
    || String(fastTrackCase?.finalStatus || '').trim() === 'completed'
);

export const normalizeFastTrackDocumentPhase = (
    value?: string | null,
    currentStep?: string | null,
): FastTrackDocumentPhase => {
    switch (String(value || '').trim()) {
        case 'waiting_for_upload':
            return 'waiting_for_upload';
        case 'uploaded_under_review':
            return 'uploaded_under_review';
        case 'replacement_required':
            return 'replacement_required';
        case 'verified':
            return 'verified';
        case 'not_requested':
            return 'not_requested';
        default: {
            const normalizedStep = normalizeCanonicalFastTrackStep(currentStep);
            if (normalizedStep === 'documents_verified' || getFastTrackStepIndex(normalizedStep) > getFastTrackStepIndex('documents_verified')) {
                return 'verified';
            }
            if (normalizedStep === 'documents_requested') {
                return 'waiting_for_upload';
            }
            return 'not_requested';
        }
    }
};

export const getFastTrackStepIndex = (step?: string | null) =>
    FAST_TRACK_STEP_SEQUENCE.indexOf(normalizeCanonicalFastTrackStep(step));

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

    if (verificationInfo.documents_verified) {
        return {
            identityProof: 'verified',
            addressProof: 'verified',
        };
    }

    return existingDocuments;
};

export const shouldReuseCaseVerificationDocuments = (
    fastTrackCase: Pick<FastTrackCaseLike, 'finalStatus' | 'documentPhase' | 'liveStage'> & { currentStep?: string | null },
) => {
    if (fastTrackCase.finalStatus && fastTrackCase.finalStatus !== 'in_progress') {
        return true;
    }

    const currentStep = fastTrackCase.liveStage || fastTrackCase.currentStep;
    const normalizedStep = normalizeCanonicalFastTrackStep(currentStep);
    const normalizedPhase = normalizeFastTrackDocumentPhase(fastTrackCase.documentPhase, currentStep);

    return normalizedStep !== 'property_selected' || normalizedPhase !== 'not_requested';
};

export const buildCaseDocumentsFromVerification = (
    fastTrackCase: Pick<FastTrackCaseLike, 'finalStatus' | 'documentPhase' | 'liveStage'> & { currentStep?: string | null },
    verificationInfo: UserVerificationInfoLike | null | undefined,
    existingDocuments: FastTrackDocumentsLike,
): FastTrackDocumentsLike => (
    shouldReuseCaseVerificationDocuments(fastTrackCase)
        ? buildDocumentsFromVerification(verificationInfo, existingDocuments)
        : existingDocuments
);

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

export const filterDocumentsForLead = <T extends UserDocumentLike>(
    documents: T[] = [],
    leadID?: string | null,
) => {
    const normalizedLeadID = String(leadID || '').trim();
    if (!normalizedLeadID) {
        return [] as T[];
    }

    return documents.filter((document) => String(document.lead_id || '').trim() === normalizedLeadID);
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

    if (fallbackStatus === 'reupload_required') {
        return 'reupload_required';
    }

    if (fallbackStatus === 'uploaded') {
        return 'uploaded';
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
    let summary = 'Upload identity and legal compliance evidence to keep the fast-track case moving.';

    if (verifiedItems.length === items.length && items.length > 0) {
        verificationLabel = 'Verified';
        documentsLabel = 'All required documents approved';
        summary = 'Identity and legal compliance evidence is approved for this fast-track case.';
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

export const deriveLiveFastTrackDocumentPhase = (
    documents: UserDocumentLike[] = [],
    fallback: FastTrackDocumentsLike = {
        identityProof: 'pending',
        addressProof: 'pending',
    },
    options: {
        currentStep?: string | null;
        backendPhase?: string | null;
    } = {},
): FastTrackDocumentPhase => {
    const latest = latestDocumentByCategory(documents);
    const latestDocuments = Array.from(latest.values());
    const normalizedStep = normalizeCanonicalFastTrackStep(options.currentStep);
    const backendPhase = normalizeFastTrackDocumentPhase(options.backendPhase, normalizedStep);
    const liveDocuments = buildDocumentsFromDetails(documents, fallback);
    const documentsVerified = (
        liveDocuments.identityProof === 'verified'
        && liveDocuments.addressProof === 'verified'
    );

    if (
        documentsVerified
        || backendPhase === 'verified'
        || normalizedStep === 'documents_verified'
        || getFastTrackStepIndex(normalizedStep) > getFastTrackStepIndex('documents_verified')
    ) {
        return 'verified';
    }

    if (latestDocuments.some((document) => REUPLOAD_STATUSES.has(String(document.status || '').toLowerCase()))) {
        return 'replacement_required';
    }

    if (latestDocuments.length > 0) {
        return 'uploaded_under_review';
    }

    if (backendPhase === 'waiting_for_upload' || normalizedStep === 'documents_requested') {
        return 'waiting_for_upload';
    }

    return 'not_requested';
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
    if (canCompleteFastTrackVerification(documents)) {
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

export const canRequestLeadDocuments = (
    lead: LeadLike | null | undefined,
    documents: UserDocumentLike[] = [],
) => {
    const stage = resolveLeadStage(lead, documents);

    return Boolean(
        lead
        && stage
        && !CLOSED_LEAD_STATUSES.has(String(lead.status || '').toLowerCase())
        && ['matching', 'broker_matched'].includes(stage)
        && !lead.documents_requested
        && !lead.documents_uploaded
        && !lead.documents_verified
    );
};

export const buildDocumentsFromDetails = (
    documents: UserDocumentLike[],
    fallback: FastTrackDocumentsLike,
): FastTrackDocumentsLike => {
    const items = buildFastTrackDocumentItems(documents, fallback);
    const identity = items.find((item) => item.id === 'identity');
    const address = items.find((item) => item.id === 'address');
    const toStoredStatus = (item: FastTrackDocumentItem | undefined): FastTrackDocStatus => {
        switch (item?.status) {
            case 'verified':
                return 'verified';
            case 'reupload_required':
                return 'reupload_required';
            case 'uploaded':
                return 'uploaded';
            default:
                return 'pending';
        }
    };

    return {
        identityProof: toStoredStatus(identity),
        addressProof: toStoredStatus(address),
    };
};

export const deriveLiveFastTrackCurrentStep = (
    currentStep: string | null | undefined,
    documents: UserDocumentLike[] = [],
    fallback: FastTrackDocumentsLike = {
        identityProof: 'pending',
        addressProof: 'pending',
    },
    options: {
        finalStatus?: string | null;
        journeyType?: 'rent' | 'buy';
        jurisdiction?: string | null;
        linkedJourney?: FastTrackLinkedJourneyLike | null;
        liveStage?: string | null;
    } = {},
): CanonicalFastTrackStep => {
    const normalizedStep = normalizeCanonicalFastTrackStep(options.liveStage || options.linkedJourney?.liveStage || currentStep);
    const liveDocuments = buildDocumentsFromDetails(documents, fallback);
    const documentsVerified = (
        liveDocuments.identityProof === 'verified'
        && liveDocuments.addressProof === 'verified'
    );
    const journeyType = options.journeyType === 'buy' ? 'buy' : 'rent';
    const linkedJourney = options.linkedJourney || null;
    const viewingStatus = String(linkedJourney?.viewing?.status || '').trim().toLowerCase();
    const viewingCheckpointStep = viewingStatus === 'completed'
        ? 'viewing_completed'
        : ['pending', 'confirmed', 'rescheduled'].includes(viewingStatus)
            ? 'viewing_scheduled'
            : null;
    const hasCompletedViewingCheckpoint = (
        viewingStatus === 'completed'
        || getFastTrackStepIndex(normalizedStep) >= getFastTrackStepIndex('viewing_completed')
    );

    if (String(options.finalStatus || '').trim() === 'completed' || normalizedStep === 'completed') {
        return 'completed';
    }

    const hasPendingRentFinanceTasks = PAYMENTS_ENABLED && ((linkedJourney?.payments || []).some((payment) => {
        const type = String(payment.payment_type || '').toLowerCase();
        const status = String(payment.status || '').toLowerCase();
        return (type.includes('deposit') || type.includes('rent')) && ['pending', 'failed'].includes(status);
    }) || (linkedJourney?.invoices || []).some((invoice) => {
        const type = String(invoice.payment_type || '').toLowerCase();
        const status = String(invoice.status || '').toLowerCase();
        return (type.includes('deposit') || type.includes('rent')) && ['draft', 'open', 'uncollectible'].includes(status);
    }));

    const normalizedContractStatus = (() => {
        switch (String(linkedJourney?.contract?.status || '').trim()) {
            case 'pending_user':
                return 'pending_user_signature';
            case 'pending_manager':
                return 'pending_manager_signature';
            case 'sent':
                return 'draft';
            case 'signed':
                return 'active';
            case 'expired':
                return 'terminated';
            default:
                return String(linkedJourney?.contract?.status || '').trim();
        }
    })();

    if (normalizedContractStatus) {
        if (normalizedContractStatus === 'active' && !hasPendingRentFinanceTasks) {
            return 'completed';
        }

        if (
            normalizedContractStatus === 'draft'
            || normalizedContractStatus === 'pending_user_signature'
            || normalizedContractStatus === 'pending_manager_signature'
            || normalizedContractStatus === 'active'
        ) {
            return 'ready_for_contract';
        }
    }

    const saleProgressionStage = String(linkedJourney?.saleProgression?.liveStage || linkedJourney?.saleProgression?.current_stage || '').trim();
    const saleProgressionStatus = String(linkedJourney?.saleProgression?.status || '').trim();
    if (saleProgressionStage || saleProgressionStatus) {
        if (saleProgressionStatus === 'completed' || saleProgressionStage === 'completion') {
            return 'completed';
        }

        return 'application_in_review';
    }

    const rawApplicationStatus = String(linkedJourney?.application?.liveStage || linkedJourney?.application?.status || '').trim();
    switch (rawApplicationStatus) {
        case 'viewing_scheduled':
        case 'viewing_completed':
            if (viewingCheckpointStep) {
                return viewingCheckpointStep;
            }
            return rawApplicationStatus === 'viewing_completed' ? 'viewing_completed' : 'viewing_scheduled';
        case 'approved':
        case 'ready_for_contract':
            if (journeyType === 'rent' && hasCompletedViewingCheckpoint) {
                return 'ready_for_contract';
            }
            if (journeyType === 'buy' && hasCompletedViewingCheckpoint) {
                return 'application_in_review';
            }
            break;
        case 'referencing':
        case 'right_to_rent_pending':
            if (journeyType === 'rent' && hasCompletedViewingCheckpoint) {
                return 'application_in_review';
            }
            break;
        case 'completed':
            return 'completed';
        default:
            break;
    }

    if (viewingCheckpointStep) {
        return viewingCheckpointStep;
    }

    if (
        documentsVerified
        && (
            normalizedStep === 'property_selected'
            || normalizedStep === 'documents_requested'
        )
    ) {
        return 'documents_verified';
    }

    return normalizedStep;
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

    if (
        matchingLead?.documents_uploaded
        || documents.identityProof === 'uploaded'
        || documents.addressProof === 'uploaded'
        || documents.identityProof === 'reupload_required'
        || documents.addressProof === 'reupload_required'
    ) {
        return 'Files uploaded and awaiting review';
    }

    if (matchingLead?.documents_requested) {
        return 'Documents requested. Waiting for user uploads.';
    }

    return 'Documents not requested yet';
};

export const getFastTrackStartAction = (
    lead: LeadLike | null,
    fastTrackCase: FastTrackCaseLike | null,
): FastTrackStartAction => {
    if (isActiveFastTrackCase(fastTrackCase)) {
        return 'resume_existing_case';
    }

    if (isLeadActive(lead)) {
        return 'create_case_for_existing_lead';
    }

    return 'create_lead_and_case';
};

const FAST_TRACK_WINDOW_MS = 24 * 60 * 60 * 1000;
const MS_PER_HOUR = 60 * 60 * 1000;

const toTimestamp = (value?: string | null) => {
    if (!value) {
        return null;
    }

    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
};

const getFastTrackExplicitDeadlineTimestamp = (
    fastTrackCase: FastTrackCaseLike,
) => toTimestamp(fastTrackCase.expiresAt);

const getFastTrackSubmittedDeadlineTimestamp = (
    fastTrackCase: FastTrackCaseLike,
) => {
    const submittedAt = toTimestamp(fastTrackCase.submittedAt);
    return submittedAt === null ? null : submittedAt + FAST_TRACK_WINDOW_MS;
};

export const getFastTrackCaseRemainingHours = (
    fastTrackCase: FastTrackCaseLike | null | undefined,
    now = Date.now(),
) => {
    if (!fastTrackCase) {
        return null;
    }

    const explicitDeadline = getFastTrackExplicitDeadlineTimestamp(fastTrackCase);
    if (explicitDeadline !== null) {
        return Math.max(0, Math.ceil((explicitDeadline - now) / MS_PER_HOUR));
    }

    if (typeof fastTrackCase.hoursRemaining === 'number' && Number.isFinite(fastTrackCase.hoursRemaining) && fastTrackCase.hoursRemaining > 0) {
        return fastTrackCase.hoursRemaining;
    }

    const submittedDeadline = getFastTrackSubmittedDeadlineTimestamp(fastTrackCase);
    if (submittedDeadline !== null) {
        return Math.max(0, Math.ceil((submittedDeadline - now) / MS_PER_HOUR));
    }

    if (typeof fastTrackCase.hoursRemaining === 'number' && Number.isFinite(fastTrackCase.hoursRemaining)) {
        return Math.max(0, fastTrackCase.hoursRemaining);
    }

    return null;
};

export const isFastTrackCaseOverdue = (
    fastTrackCase: FastTrackCaseLike | null | undefined,
    now = Date.now(),
) => {
    if (!fastTrackCase || !isActiveFastTrackCase(fastTrackCase)) {
        return false;
    }

    const explicitDeadline = getFastTrackExplicitDeadlineTimestamp(fastTrackCase);
    if (explicitDeadline !== null) {
        return explicitDeadline <= now;
    }

    if (typeof fastTrackCase.hoursRemaining === 'number' && Number.isFinite(fastTrackCase.hoursRemaining) && fastTrackCase.hoursRemaining > 0) {
        return false;
    }

    const submittedDeadline = getFastTrackSubmittedDeadlineTimestamp(fastTrackCase);
    if (submittedDeadline !== null) {
        return submittedDeadline <= now;
    }

    if (typeof fastTrackCase.hoursRemaining === 'number' && Number.isFinite(fastTrackCase.hoursRemaining)) {
        return fastTrackCase.hoursRemaining <= 0;
    }

    return Boolean(fastTrackCase.overdue);
};

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
