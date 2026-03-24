export interface ManagerFastTrackSelectionCase {
    caseId: string;
    leadId?: string;
    matchingLead?: { id?: string } | null;
}

const normalize = (value?: string | null) => (typeof value === 'string' ? value.trim() : '');

export const resolveManagerFastTrackSelection = (
    cases: ManagerFastTrackSelectionCase[],
    requestedCaseId?: string | null,
    requestedLeadId?: string | null,
    _previousSelectedCaseId?: string | null,
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
        const requestedLeadCase = cases.find((caseItem) => (
            normalize(caseItem.leadId) === normalizedLeadId
            || normalize(caseItem.matchingLead?.id) === normalizedLeadId
        ));
        if (requestedLeadCase) {
            return requestedLeadCase.caseId;
        }
    }

    return null;
};

export const buildManagerFastTrackSearchParams = (
    current: URLSearchParams,
    selectedCaseId: string,
) => {
    const next = new URLSearchParams(current);
    next.set('case', selectedCaseId);
    next.delete('lead');
    return next;
};
