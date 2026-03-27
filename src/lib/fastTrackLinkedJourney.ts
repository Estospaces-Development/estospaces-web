import type { Application } from '@/services/applicationsService';
import type { Viewing } from '@/services/bookingsService';
import type { FastTrackCase } from '@/services/fastTrackService';
import type { Invoice, Payment } from '@/services/paymentsService';
import type { SaleProgression } from '@/services/salesService';
import type { Contract } from '@/types/booking';
import { getNextSaleJourneyActions, getSaleJourneySummary } from './saleJourney';
import { isEnglandJurisdiction } from './fastTrackWorkflow';

type MaybeString = string | null | undefined;

type WorkflowLike = {
    property_id?: string;
    user_id?: string;
    manager_id?: string | null;
    lead_id?: string | null;
    fast_track_case_id?: string | null;
    updated_at?: string;
    created_at?: string;
};

export interface FastTrackLinkedJourney {
    application: Application | null;
    viewing: Viewing | null;
    contract: Contract | null;
    saleProgression: SaleProgression | null;
    payments: Payment[];
    invoices: Invoice[];
    primaryHeadline: string;
    primarySummary: string;
    nextStep: string;
}

export const resolveFastTrackPrimaryLaneLabel = (
    journeyType: FastTrackCase['journeyType'],
    linkedJourney: Pick<FastTrackLinkedJourney, 'application' | 'saleProgression'>,
) => {
    if (journeyType === 'buy') {
        if (linkedJourney.saleProgression) {
            return formatLabel(linkedJourney.saleProgression.current_stage);
        }

        if (linkedJourney.application) {
            return formatLabel(linkedJourney.application.status);
        }

        return 'Not created yet';
    }

    if (linkedJourney.application) {
        return formatLabel(linkedJourney.application.status);
    }

    if (linkedJourney.saleProgression) {
        return formatLabel(linkedJourney.saleProgression.current_stage);
    }

    return 'Not created yet';
};

const normalizeId = (value: MaybeString) => String(value || '').trim();

const sameId = (left: MaybeString, right: MaybeString) => {
    const normalizedLeft = normalizeId(left);
    const normalizedRight = normalizeId(right);
    return normalizedLeft !== '' && normalizedLeft === normalizedRight;
};

const toTimestamp = (value?: string | null) => {
    const parsed = value ? new Date(value).getTime() : Number.NaN;
    return Number.isFinite(parsed) ? parsed : 0;
};

const pickLatest = <T extends { updated_at?: string; created_at?: string }>(items: T[]) => (
    [...items].sort((left, right) => (
        toTimestamp(right.updated_at || right.created_at) - toTimestamp(left.updated_at || left.created_at)
    ))[0] || null
);

const pickLatestViewing = (items: Viewing[]) => (
    [...items].sort((left, right) => (
        toTimestamp(right.scheduled_at || right.created_at) - toTimestamp(left.scheduled_at || left.created_at)
    ))[0] || null
);

const matchesFastTrackWorkflow = (record: WorkflowLike, fastTrackCase: FastTrackCase) => (
    sameId(record.fast_track_case_id, fastTrackCase.caseId)
    || sameId(record.lead_id, fastTrackCase.leadId)
    || (
        sameId(record.property_id, fastTrackCase.propertyId)
        && sameId(record.user_id, fastTrackCase.clientId)
        && (
            normalizeId(fastTrackCase.managerId) === ''
            || normalizeId(record.manager_id) === ''
            || sameId(record.manager_id, fastTrackCase.managerId)
        )
    )
);

const formatLabel = (value?: string | null) => {
    if (!value) {
        return 'Not started';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const normalizeContractStatus = (status?: string | null) => {
    switch (String(status || '').trim()) {
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
            return String(status || '').trim();
    }
};

const getRentFinanceTasks = (payments: Payment[], invoices: Invoice[]) => {
    const paymentTasks = payments.filter((item) => {
        const type = String(item.payment_type || '').toLowerCase();
        return type.includes('deposit') || type.includes('rent');
    });
    const invoiceTasks = invoices.filter((item) => {
        const type = String(item.payment_type || '').toLowerCase();
        return type.includes('deposit') || type.includes('rent');
    });
    const pendingTasks = [
        ...paymentTasks.filter((item) => ['pending', 'failed'].includes(String(item.status || '').toLowerCase())),
        ...invoiceTasks.filter((item) => ['draft', 'open', 'uncollectible'].includes(String(item.status || '').toLowerCase())),
    ];

    return {
        paymentTasks,
        invoiceTasks,
        pendingTasks,
    };
};

const buildRentJourneySummary = (
    application: Application | null,
    viewing: Viewing | null,
    contract: Contract | null,
    payments: Payment[],
    invoices: Invoice[],
    jurisdiction?: string,
) => {
    const contractStatus = normalizeContractStatus(contract?.status);
    const rentFinanceTasks = getRentFinanceTasks(payments, invoices);
    const englandJourney = isEnglandJurisdiction(jurisdiction);

    if (contract && rentFinanceTasks.pendingTasks.length > 0) {
        return {
            primaryHeadline: 'Deposit and first-rent tasks',
            primarySummary: 'The tenancy agreement is in place, but deposit protection and first-rent tasks still need to clear before the tenancy is fully active.',
            nextStep: 'Open the billing workspace to clear deposit or first-rent tasks and finish the move-in handoff.',
        };
    }

    if (contract) {
        const statusLabel = formatLabel(contractStatus || contract.status);
        return {
            primaryHeadline: contractStatus === 'active'
                ? 'Active tenancy'
                : `Tenancy agreement: ${statusLabel}`,
            primarySummary: contractStatus === 'active'
                ? 'The tenancy agreement is fully signed and no rent or deposit blockers are left on this fast-track case.'
                : contractStatus === 'pending_user_signature'
                    ? 'The tenancy agreement is ready and is waiting for the tenant signature.'
                    : contractStatus === 'pending_manager_signature'
                        ? 'The tenant has signed and the manager countersignature is the final contract step.'
                        : 'The tenancy agreement is now the live record for this fast-track case.',
            nextStep: contractStatus === 'draft'
                ? 'Open the contracts workspace to issue the tenancy agreement.'
                : contractStatus === 'pending_user_signature'
                    ? 'Open the contracts workspace to chase the tenant signature.'
                    : contractStatus === 'pending_manager_signature'
                        ? 'Open the contracts workspace to countersign and unlock billing tasks.'
                        : 'Open the contracts or billing workspace to continue the tenancy handoff.',
        };
    }

    if (application) {
        const normalizedStatus = String(application.status || '').trim();
        const statusLabel = formatLabel(normalizedStatus);
        const viewingSummary = viewing
            ? ` A viewing is currently ${formatLabel(viewing.status).toLowerCase()}.`
            : '';

        if (normalizedStatus === 'right_to_rent_pending') {
            return {
                primaryHeadline: englandJourney ? 'Right to Rent pending' : 'Compliance checks pending',
                primarySummary: englandJourney
                    ? 'Referencing is underway and the England Right to Rent check still needs to be cleared before approval.'
                    : 'Referencing and jurisdiction-specific compliance checks are still being cleared before approval.',
                nextStep: 'Open the applications workspace to finish the outstanding compliance checks and move the case to approval.',
            };
        }

        if (normalizedStatus === 'referencing' || normalizedStatus === 'under_review' || normalizedStatus === 'submitted') {
            return {
                primaryHeadline: englandJourney ? 'Referencing and Right to Rent' : 'Referencing and compliance',
                primarySummary: englandJourney
                    ? `The tenancy case is in post-viewing checks, covering references and England Right to Rent evidence.${viewingSummary}`.trim()
                    : `The tenancy case is in post-viewing checks, covering references and jurisdiction-specific compliance.${viewingSummary}`.trim(),
                nextStep: 'Open the applications workspace to review references, compliance evidence, and the approval decision.',
            };
        }

        if (normalizedStatus === 'approved' || normalizedStatus === 'ready_for_contract') {
            return {
                primaryHeadline: 'Approved for tenancy agreement',
                primarySummary: 'Referencing and compliance are cleared, so the tenancy agreement and signature stage should now begin.',
                nextStep: 'Open the contracts workspace to draft the tenancy agreement and begin signatures.',
            };
        }

        return {
            primaryHeadline: `Application: ${statusLabel}`,
            primarySummary: `The tenancy application is the main downstream record for this case.${viewingSummary}`.trim(),
            nextStep: application.status === 'approved'
                ? 'Create or open the tenancy contract from the contracts workspace.'
                : 'Open the applications workspace to review the live tenancy application.',
        };
    }

    if (viewing) {
        return {
            primaryHeadline: viewing.status === 'completed'
                ? (englandJourney ? 'Referencing and Right to Rent' : 'Referencing and compliance')
                : `Viewing: ${formatLabel(viewing.status)}`,
            primarySummary: viewing.status === 'completed'
                ? (englandJourney
                    ? 'The viewing is complete, so the next regulated rent step is referencing and the England Right to Rent check.'
                    : 'The viewing is complete, so the next regulated rent step is referencing and jurisdiction-specific compliance review.')
                : 'The viewing exists, but the tenancy application has not been surfaced yet.',
            nextStep: viewing.status === 'completed'
                ? 'Open the applications workspace to continue referencing and approval.'
                : 'Open the viewings workspace to confirm the appointment and keep the case moving.',
        };
    }

    return {
        primaryHeadline: 'Downstream workflow not started',
        primarySummary: 'No linked application, viewing, or contract has been found for this rent case yet.',
        nextStep: 'Schedule the viewing or open the applications workspace to create the next live record.',
    };
};

const buildBuyJourneySummary = (
    saleProgression: SaleProgression | null,
    viewing: Viewing | null,
    application: Application | null,
) => {
    if (saleProgression) {
        const nextAction = getNextSaleJourneyActions(saleProgression.current_stage)[0];
        const headlineByStage: Record<SaleProgression['current_stage'], string> = {
            offer_submitted: 'Proof of funds / MIP and offer',
            offer_under_review: 'Offer under review',
            offer_accepted: 'Offer accepted',
            sale_agreed: 'Sale agreed',
            memorandum_issued: 'Memorandum issued',
            conveyancing: 'Conveyancing milestones',
            exchange: 'Exchange',
            completion: 'Completion',
        };
        return {
            primaryHeadline: headlineByStage[saleProgression.current_stage] || `Sale progression: ${formatLabel(saleProgression.current_stage)}`,
            primarySummary: getSaleJourneySummary(saleProgression.current_stage, saleProgression.notes),
            nextStep: nextAction
                ? nextAction.description
                : 'Open the applications workspace to continue the live purchase progression.',
        };
    }

    if (application && viewing?.status === 'completed') {
        return {
            primaryHeadline: 'Proof of funds / MIP',
            primarySummary: 'The viewing is complete, and the buyer now needs affordability evidence before the offer and sale-agreed stages continue.',
            nextStep: 'Open the applications workspace to record proof of funds, the MIP, and the live offer.',
        };
    }

    if (viewing) {
        return {
            primaryHeadline: viewing.status === 'completed' ? 'Proof of funds / MIP' : `Viewing: ${formatLabel(viewing.status)}`,
            primarySummary: viewing.status === 'completed'
                ? 'The viewing is complete, but the offer and sale progression record has not been surfaced yet.'
                : 'The viewing is in place, but the offer and sale progression record has not been surfaced yet.',
            nextStep: viewing.status === 'completed'
                ? 'Open the applications workspace to continue into proof of funds, MIP, and the offer stage.'
                : 'Open the viewings workspace to confirm or manage the appointment first.',
        };
    }

    if (application) {
        return {
            primaryHeadline: 'Viewing not scheduled',
            primarySummary: 'The purchase case is live, but a real viewing still needs to be booked before proof of funds, MIP, and offer work begins.',
            nextStep: 'Open the viewings workspace to book or manage the appointment first.',
        };
    }

    return {
        primaryHeadline: 'Viewing not scheduled',
        primarySummary: 'No viewing or sale progression has been linked to this buy case yet.',
        nextStep: 'Open the viewings workspace to book the next live appointment.',
    };
};

export const formatWorkflowStatusLabel = formatLabel;

export const resolveFastTrackLinkedJourney = (
    fastTrackCase: FastTrackCase,
    input: {
        applications?: Application[];
        viewings?: Viewing[];
        contracts?: Contract[];
        saleProgressions?: SaleProgression[];
        payments?: Payment[];
        invoices?: Invoice[];
    },
): FastTrackLinkedJourney => {
    const applications = (input.applications || []).filter((item) => matchesFastTrackWorkflow(item, fastTrackCase));
    const application = pickLatest(applications);

    const viewings = (input.viewings || []).filter((item) => (
        matchesFastTrackWorkflow(item, fastTrackCase)
        || (application ? sameId(item.application_id, application.id) : false)
    ));
    const viewing = pickLatestViewing(viewings);

    const contracts = (input.contracts || []).filter((item) => (
        sameId(item.fast_track_case_id, fastTrackCase.caseId)
        || (application ? sameId(item.application_id, application.id) : false)
    ));
    const contract = pickLatest(contracts);

    const saleProgressions = (input.saleProgressions || []).filter((item) => matchesFastTrackWorkflow(item, fastTrackCase));
    const saleProgression = pickLatest(saleProgressions);

    const payments = (input.payments || [])
        .filter((item) => (
            (application ? sameId(item.application_id, application.id) : false)
            || (contract ? sameId(item.contract_id, contract.id) : false)
        ))
        .sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at));

    const invoices = (input.invoices || [])
        .filter((item) => (
            (application ? sameId(item.application_id, application.id) : false)
            || (contract ? sameId(item.contract_id, contract.id) : false)
        ))
        .sort((left, right) => toTimestamp(right.created_at) - toTimestamp(left.created_at));

    const summary = fastTrackCase.journeyType === 'buy'
        ? buildBuyJourneySummary(saleProgression, viewing, application)
        : buildRentJourneySummary(application, viewing, contract, payments, invoices, fastTrackCase.jurisdiction);

    return {
        application,
        viewing,
        contract,
        saleProgression,
        payments,
        invoices,
        primaryHeadline: summary.primaryHeadline,
        primarySummary: summary.primarySummary,
        nextStep: summary.nextStep,
    };
};
