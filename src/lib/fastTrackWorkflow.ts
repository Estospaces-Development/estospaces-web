export type FastTrackDocStatus = 'pending' | 'verified';

export interface FastTrackDocumentsLike {
    identityProof: FastTrackDocStatus;
    addressProof: FastTrackDocStatus;
}

export interface UserDocumentLike {
    document_category: string;
    status: string;
}

export interface UserVerificationInfoLike {
    has_identity_doc?: boolean;
    has_address_doc?: boolean;
    documents_verified?: boolean;
}

export interface LeadLike {
    status?: string;
    documents_uploaded?: boolean;
}

export interface FastTrackCaseLike {
    finalStatus?: string;
}

export type FastTrackStartAction =
    | 'resume_existing_case'
    | 'create_case_for_existing_lead'
    | 'create_lead_and_case';

const CLOSED_LEAD_STATUSES = new Set(['closed_won', 'closed_lost', 'cancelled']);

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
    if (!areVerificationDocumentsApproved(verificationInfo)) {
        return existingDocuments;
    }

    return {
        identityProof: 'verified',
        addressProof: 'verified',
    };
};

export const latestDocumentByCategory = (documents: UserDocumentLike[]) => {
    const latest = new Map<string, UserDocumentLike>();

    documents.forEach((document) => {
        if (!latest.has(document.document_category)) {
            latest.set(document.document_category, document);
        }
    });

    return latest;
};

export const buildDocumentsFromDetails = (
    documents: UserDocumentLike[],
    fallback: FastTrackDocumentsLike,
): FastTrackDocumentsLike => {
    const latest = latestDocumentByCategory(documents);
    const toStatus = (document?: UserDocumentLike | null) => {
        if (!document) {
            return 'pending' as const;
        }

        return document.status === 'approved' ? 'verified' : 'pending';
    };

    return {
        identityProof: toStatus(latest.get('identity')) || fallback.identityProof,
        addressProof: toStatus(latest.get('address')) || fallback.addressProof,
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

export const normalizeWorkspaceDocuments = <T>(
    documents: T[] | null | undefined,
    error?: string | null,
) => {
    if (error) {
        return [] as T[];
    }

    return documents || [];
};
