import {
    buildFastTrackDocumentItems,
    buildDocumentsFromDetails,
    FastTrackDocumentsLike,
    UserDocumentLike,
} from './fastTrackWorkflow';

export interface UserFastTrackSelectionCase {
    caseId: string;
    leadId?: string | null;
}

export interface UserFastTrackDocumentItem {
    id: 'identity' | 'address';
    title: string;
    status: 'not_requested' | 'requested' | 'uploaded' | 'verified' | 'reupload_required';
    statusLabel: string;
    fileName: string | null;
    reason: string | null;
    reviewedAt: string | null;
    hint: string;
    uploadType: 'identity' | 'address';
    actionLabel: string;
}

const normalize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

export const resolveUserFastTrackSelection = (
    cases: UserFastTrackSelectionCase[],
    requestedCaseId?: string | null,
    requestedLeadId?: string | null,
    previousSelectedCaseId?: string | null,
) => {
    if (cases.length === 0) {
        return null;
    }

    const normalizedCaseId = normalize(requestedCaseId);
    if (normalizedCaseId) {
        const requestedCase = cases.find((caseItem) => caseItem.caseId === normalizedCaseId);
        if (requestedCase) {
            return requestedCase.caseId;
        }
    }

    const normalizedLeadId = normalize(requestedLeadId);
    if (normalizedLeadId) {
        const requestedLeadCase = cases.find((caseItem) => normalize(caseItem.leadId) === normalizedLeadId);
        if (requestedLeadCase) {
            return requestedLeadCase.caseId;
        }
    }

    const normalizedPreviousSelection = normalize(previousSelectedCaseId);
    if (normalizedPreviousSelection && cases.some((caseItem) => caseItem.caseId === normalizedPreviousSelection)) {
        return normalizedPreviousSelection;
    }

    return cases[0].caseId;
};

export const buildUserFastTrackDocumentItems = (
    documents: FastTrackDocumentsLike,
    userDocuments: UserDocumentLike[] = [],
    options: {
        requestActive?: boolean;
    } = {},
): UserFastTrackDocumentItem[] => {
    const requestActive = options.requestActive ?? true;
    const resolvedDocuments = buildDocumentsFromDetails(userDocuments, documents);
    const items = buildFastTrackDocumentItems(userDocuments, resolvedDocuments);

    return items.map((item) => ({
        ...item,
        hint: item.id === 'identity'
            ? 'Passport, driver licence, or national ID'
            : 'Bank statement, utility bill, or tenancy proof',
        uploadType: item.id,
        actionLabel: item.status === 'reupload_required'
            ? 'Upload replacement'
            : item.status === 'missing'
                ? (requestActive ? 'Upload now' : 'Waiting for request')
                : 'Replace file',
        status: item.status === 'missing'
            ? (requestActive ? 'requested' : 'not_requested')
            : item.status,
        statusLabel: item.status === 'missing'
            ? (requestActive ? 'Requested' : 'Not requested')
            : item.statusLabel,
    }));
};

export const getOutstandingDocumentNames = (items: UserFastTrackDocumentItem[]) =>
    items
        .filter((item) => item.status !== 'verified' && item.status !== 'not_requested')
        .map((item) => item.title);
