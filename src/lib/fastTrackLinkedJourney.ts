import type { Application } from '@/services/applicationsService';
import type { Viewing } from '@/services/bookingsService';
import type { FastTrackCase } from '@/services/fastTrackService';
import type { Invoice, Payment } from '@/services/paymentsService';
import type { SaleProgression } from '@/services/salesService';
import type { Contract } from '@/types/booking';
import { getNextSaleJourneyActions, getSaleJourneySummary } from './saleJourney';

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

const buildRentJourneySummary = (
    application: Application | null,
    viewing: Viewing | null,
    contract: Contract | null,
) => {
    if (contract) {
        const statusLabel = formatLabel(contract.status);
        return {
            primaryHeadline: `Tenancy contract: ${statusLabel}`,
            primarySummary: contract.status === 'active'
                ? 'The tenancy contract is active and the move-in or operational booking flow should now be used.'
                : 'The tenancy contract is now the live record for this fast-track case.',
            nextStep: contract.status === 'draft'
                ? 'Open the contracts workspace to send or sign the tenancy agreement.'
                : 'Open the contracts workspace to continue the signature or activation steps.',
        };
    }

    if (application) {
        const statusLabel = formatLabel(application.status);
        const viewingSummary = viewing
            ? ` A viewing is currently ${formatLabel(viewing.status).toLowerCase()}.`
            : '';

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
            primaryHeadline: `Viewing: ${formatLabel(viewing.status)}`,
            primarySummary: 'The viewing exists, but the tenancy application has not been surfaced yet.',
            nextStep: 'Open the viewings workspace to confirm the appointment and keep the case moving.',
        };
    }

    return {
        primaryHeadline: 'Downstream workflow not started',
        primarySummary: 'No linked application, viewing, or contract has been found for this rent case yet.',
        nextStep: 'Schedule the viewing or open the applications workspace to create the next live record.',
    };
};

const buildBuyJourneySummary = (saleProgression: SaleProgression | null, viewing: Viewing | null) => {
    if (saleProgression) {
        const nextAction = getNextSaleJourneyActions(saleProgression.current_stage)[0];
        return {
            primaryHeadline: `Sale progression: ${formatLabel(saleProgression.current_stage)}`,
            primarySummary: getSaleJourneySummary(saleProgression.current_stage, saleProgression.notes),
            nextStep: nextAction
                ? nextAction.description
                : 'Open the applications workspace to continue the live purchase progression.',
        };
    }

    if (viewing) {
        return {
            primaryHeadline: `Viewing: ${formatLabel(viewing.status)}`,
            primarySummary: 'The viewing is in place, but the offer and sale progression record has not been surfaced yet.',
            nextStep: 'Open the applications workspace to continue into the offer stage.',
        };
    }

    return {
        primaryHeadline: 'Offer workspace not started',
        primarySummary: 'No linked offer or sale progression has been found for this buy case yet.',
        nextStep: 'Open the applications workspace to submit or review the live offer.',
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
        ? buildBuyJourneySummary(saleProgression, viewing)
        : buildRentJourneySummary(application, viewing, contract);

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
