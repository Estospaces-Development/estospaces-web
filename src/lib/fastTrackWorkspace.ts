import type { FastTrackCase } from '@/services/fastTrackService';

export type FastTrackWorkspaceRole = 'user' | 'manager' | 'admin';

export const resolveFastTrackSelectionCaseId = (
    cases: FastTrackCase[],
    params: URLSearchParams,
    previous: string | null,
) => {
    if (cases.length === 0) {
        return null;
    }

    const requestedCaseId = params.get('case');
    if (requestedCaseId && cases.some((item) => item.caseId === requestedCaseId)) {
        return requestedCaseId;
    }

    const matchByField = (
        requestedValue: string | null,
        selector: (item: FastTrackCase) => string | undefined,
    ) => {
        if (!requestedValue) {
            return null;
        }
        const match = cases.find((item) => selector(item) === requestedValue);
        return match?.caseId || null;
    };

    const fallbacks = [
        matchByField(params.get('lead'), (item) => item.leadId),
        matchByField(params.get('property'), (item) => item.propertyId),
        matchByField(params.get('application'), (item) => item.applicationId),
        matchByField(params.get('viewing'), (item) => item.viewingId),
        matchByField(params.get('contract'), (item) => item.contractId),
        matchByField(params.get('payment') || params.get('invoice'), (item) => item.paymentId),
    ];

    const matchedFallback = fallbacks.find(Boolean);
    if (matchedFallback) {
        return matchedFallback;
    }

    if (previous && cases.some((item) => item.caseId === previous)) {
        return previous;
    }

    return cases[0].caseId;
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
        return 'Case chat';
    }
    if (role === 'user') {
        return fastTrackCase.managerId ? 'Case manager' : 'Case team';
    }
    return fastTrackCase.clientName || 'Client';
};

export const describeFastTrackWorkspaceFocus = (
    fastTrackCase: FastTrackCase,
    role: FastTrackWorkspaceRole,
) => {
    if (fastTrackCase.workspaceFinalStatus === 'completed') {
        return 'Case finished';
    }
    if (fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return 'Case closed';
    }

    switch (fastTrackCase.stage) {
        case 'documents':
            return role === 'user' ? 'Upload the core files' : 'Review the uploaded files';
        case 'viewing':
            return role === 'user' ? 'Confirm the viewing plan' : 'Set or update the viewing';
        case 'decision':
            return role === 'user'
                ? 'Wait for the outcome'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Record the offer result'
                    : 'Record the application result';
        case 'agreement':
            if (role === 'user') {
                return 'Accept the agreement';
            }
            return fastTrackCase.agreement.paymentStatus === 'requested' || fastTrackCase.agreement.paymentStatus === 'paid'
                ? 'Confirm payment and move to handover'
                : 'Publish the agreement';
        case 'handover':
            return role === 'user' ? 'Confirm receipt' : 'Finish handover';
        default:
            if (role === 'user') {
                return 'Wait for the case to start';
            }
            return fastTrackCase.managerId ? 'Start documents' : 'Claim and start';
    }
};

export const describeFastTrackWorkspaceStatus = (
    fastTrackCase: FastTrackCase,
    role: FastTrackWorkspaceRole,
) => {
    if (fastTrackCase.workspaceFinalStatus === 'completed') {
        return 'Every core step was completed inside this workspace.';
    }
    if (fastTrackCase.workspaceFinalStatus === 'cancelled') {
        return 'The live case ended here and no further action is needed.';
    }

    switch (fastTrackCase.stage) {
        case 'documents':
            return role === 'user'
                ? 'Upload each core file here. Review notes, previews, and replacements stay on the same page.'
                : 'Preview every uploaded file, approve it, or request one replacement on the same page.';
        case 'viewing':
            return role === 'user'
                ? 'The schedule, change request, and confirmation all stay here.'
                : 'Scheduling, rescheduling, skip, and completion all happen in this one lane.';
        case 'decision':
            return role === 'user'
                ? 'You will see the live result here as soon as it is recorded.'
                : fastTrackCase.journeyMode === 'sale'
                    ? 'Offer decisions stay on this page. No handoff to another purchase screen is needed.'
                    : 'Application decisions stay on this page. No handoff to another review screen is needed.';
        case 'agreement':
            return role === 'user'
                ? 'Agreement acceptance and payment confirmation stay inside this case.'
                : 'Agreement publishing and payment confirmation stay inside this case.';
        case 'handover':
            return role === 'user'
                ? 'Confirm the final handover here to close the case.'
                : 'Mark the case ready, confirm the final note, and complete it here.';
        default:
            return role === 'user'
                ? 'The team will open the next step here. You stay in this workspace from start to finish.'
                : 'Claim the case if needed, then open documents here so the rest of the journey stays on one page.';
    }
};
