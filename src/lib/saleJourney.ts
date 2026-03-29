export type SaleJourneyStage =
    | 'viewing_completed'
    | 'buyer_qualification'
    | 'offer'
    | 'offer_submitted'
    | 'offer_under_review'
    | 'offer_accepted'
    | 'sale_agreed'
    | 'memorandum_issued'
    | 'conveyancing'
    | 'exchange'
    | 'completion';

type ApplicationRecordLike = {
    source?: string;
    status?: string | null;
    liveStage?: string | null;
    live_stage?: string | null;
};

export interface SaleJourneyAction {
    status: string;
    label: string;
    description: string;
}

export const isSaleProgressionRecord = (application?: ApplicationRecordLike | null) =>
    application?.source === 'sale_progression';

export const resolveSaleJourneyDisplayStage = (application?: ApplicationRecordLike | null): SaleJourneyStage | null => {
    if (!application) {
        return null;
    }

    const liveStage = String(application.liveStage || application.live_stage || '').trim();
    switch (liveStage) {
        case 'buyer_qualification':
            return 'buyer_qualification';
        case 'offer':
            return 'offer';
        case 'viewing_completed':
            return 'viewing_completed';
        case 'sale_agreed':
            return 'sale_agreed';
        case 'memorandum':
            return 'memorandum_issued';
        case 'conveyancing':
            return 'conveyancing';
        case 'exchange':
            return 'exchange';
        case 'completion':
            return 'completion';
    }

    switch (String(application.status || '').trim()) {
        case 'viewing_completed':
            return 'viewing_completed';
        case 'offer_submitted':
            return 'offer_submitted';
        case 'offer_under_review':
        case 'under_review':
            return 'offer_under_review';
        case 'offer_accepted':
            return 'offer_accepted';
        case 'sale_agreed':
        case 'approved':
            return 'sale_agreed';
        case 'memorandum_issued':
            return 'memorandum_issued';
        case 'conveyancing':
            return 'conveyancing';
        case 'exchange':
            return 'exchange';
        case 'completed':
            return 'completion';
        default:
            return null;
    }
};

export const getSaleJourneyStageLabel = (input?: string | ApplicationRecordLike | null) => {
    const stage = typeof input === 'string'
        ? (input as SaleJourneyStage)
        : resolveSaleJourneyDisplayStage(input);

    switch (stage) {
        case 'viewing_completed':
            return 'Viewing completed';
        case 'buyer_qualification':
            return 'Buyer qualification';
        case 'offer':
            return 'Offer ready';
        case 'offer_submitted':
            return 'Offer submitted';
        case 'offer_under_review':
            return 'Offer under review';
        case 'offer_accepted':
            return 'Offer accepted';
        case 'sale_agreed':
            return 'Sale agreed';
        case 'memorandum_issued':
            return 'Memorandum issued';
        case 'conveyancing':
            return 'Conveyancing';
        case 'exchange':
            return 'Exchange';
        case 'completion':
            return 'Completion';
        default:
            return 'Purchase journey';
    }
};

export const getSaleJourneyProgress = (input?: string | ApplicationRecordLike | null) => {
    const stage = typeof input === 'string'
        ? (input as SaleJourneyStage)
        : resolveSaleJourneyDisplayStage(input);

    switch (stage) {
        case 'viewing_completed':
            return 28;
        case 'buyer_qualification':
            return 40;
        case 'offer':
            return 52;
        case 'offer_submitted':
            return 60;
        case 'offer_under_review':
            return 68;
        case 'offer_accepted':
        case 'sale_agreed':
            return 78;
        case 'memorandum_issued':
            return 86;
        case 'conveyancing':
            return 92;
        case 'exchange':
            return 97;
        case 'completion':
            return 100;
        default:
            return 20;
    }
};

export const canWithdrawApplicationRecord = (application?: ApplicationRecordLike | null) => {
    if (!application) {
        return false;
    }

    if (isSaleProgressionRecord(application)) {
        return false;
    }

    const status = String(application.status || '').trim();
    return !['withdrawn', 'approved', 'rejected', 'completed'].includes(status);
};

export const saleProgressionStageForStatus = (status: string): SaleJourneyStage | null => {
    switch (String(status || '').trim()) {
        case 'offer_submitted':
            return 'offer_submitted';
        case 'offer_under_review':
        case 'under_review':
            return 'offer_under_review';
        case 'offer_accepted':
            return 'offer_accepted';
        case 'sale_agreed':
        case 'approved':
            return 'sale_agreed';
        case 'memorandum_issued':
            return 'memorandum_issued';
        case 'conveyancing':
            return 'conveyancing';
        case 'exchange':
            return 'exchange';
        case 'completed':
            return 'completion';
        default:
            return null;
    }
};

export const getNextSaleJourneyActions = (status: string): SaleJourneyAction[] => {
    switch (String(status || '').trim()) {
        case 'offer_submitted':
            return [
                {
                    status: 'offer_under_review',
                    label: 'Start Offer Review',
                    description: 'Move this purchase into active offer review.',
                },
            ];
        case 'offer_under_review':
            return [
                {
                    status: 'offer_accepted',
                    label: 'Accept Offer',
                    description: 'Confirm the offer has been accepted by the manager.',
                },
            ];
        case 'offer_accepted':
            return [
                {
                    status: 'sale_agreed',
                    label: 'Mark Sale Agreed',
                    description: 'Record that the purchase is agreed in principle.',
                },
            ];
        case 'sale_agreed':
            return [
                {
                    status: 'memorandum_issued',
                    label: 'Issue Memorandum',
                    description: 'Move the case into memorandum and legal preparation.',
                },
            ];
        case 'memorandum_issued':
            return [
                {
                    status: 'conveyancing',
                    label: 'Start Conveyancing',
                    description: 'Track the legal and document checks as now underway.',
                },
            ];
        case 'conveyancing':
            return [
                {
                    status: 'exchange',
                    label: 'Mark Exchange',
                    description: 'Show that the purchase is now approaching completion.',
                },
            ];
        case 'exchange':
            return [
                {
                    status: 'completed',
                    label: 'Complete Sale',
                    description: 'Close the journey once the purchase handover is complete.',
                },
            ];
        default:
            return [];
    }
};

export const getSaleJourneySummary = (status: string, journeySummary?: string) => {
    if (journeySummary && journeySummary.trim()) {
        return journeySummary.trim();
    }

    switch (String(status || '').trim()) {
        case 'viewing_completed':
            return 'The viewing is complete and the next regulated step is buyer qualification, proof of funds or MIP, and AML review.';
        case 'buyer_qualification':
            return 'Verify proof of funds or MIP, then clear AML before the offer lane opens.';
        case 'offer':
            return 'Buyer qualification and AML are complete, so the offer can now be recorded and reviewed.';
        case 'offer_under_review':
            return 'The purchase offer is under review and waiting for a manager decision.';
        case 'offer_accepted':
            return 'The offer is accepted and the sale can move toward an agreed deal.';
        case 'sale_agreed':
            return 'The deal is agreed in principle and the memorandum stage is next.';
        case 'memorandum_issued':
            return 'The sale memorandum is issued and legal follow-up can begin.';
        case 'conveyancing':
            return 'Legal work, searches, and supporting documents are actively in progress.';
        case 'exchange':
            return 'Exchange is underway and the sale is approaching final completion.';
        case 'completed':
            return 'The purchase journey is complete and the property handover is done.';
        default:
            return 'The selected property is in the live purchase workflow.';
    }
};
