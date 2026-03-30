import type { Application } from '@/contexts/ApplicationsContext';
import type { Viewing } from '@/services/bookingsService';
import type { Invoice, Payment } from '@/services/paymentsService';
import type { Contract } from '@/types/booking';

type MaybeString = string | null | undefined;

export interface WorkspaceLinkOptions {
    applicationId?: MaybeString;
    viewingId?: MaybeString;
    contractId?: MaybeString;
    paymentId?: MaybeString;
    invoiceId?: MaybeString;
    caseId?: MaybeString;
    leadId?: MaybeString;
    propertyId?: MaybeString;
}

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

const pickLatestApplication = (applications: Application[]) => (
    [...applications].sort((left, right) => (
        toTimestamp(right.updatedAt || right.createdAt) - toTimestamp(left.updatedAt || left.createdAt)
    ))[0] || null
);

const isSaleProgressionApplication = (application?: Application | null) =>
    application?.source === 'sale_progression';

export const findLinkedSaleProgression = (
    applications: Application[],
    application?: Application | null,
    options: WorkspaceLinkOptions = {},
) => {
    if (!application) {
        return null;
    }

    const caseId = normalizeId(options.caseId) || normalizeId(application.fastTrackCaseId);
    const leadId = normalizeId(options.leadId) || normalizeId(application.leadId);
    const propertyId = normalizeId(options.propertyId) || normalizeId(application.propertyId);
    const userId = normalizeId(application.userId);
    const managerId = normalizeId(application.managerId);

    const matches = applications.filter((candidate) => {
        if (!isSaleProgressionApplication(candidate)) {
            return false;
        }

        if (caseId && sameId(candidate.fastTrackCaseId, caseId)) {
            return true;
        }
        if (leadId && sameId(candidate.leadId, leadId)) {
            return true;
        }
        if (!propertyId || !sameId(candidate.propertyId, propertyId)) {
            return false;
        }

        const userMatches = !userId || sameId(candidate.userId, userId);
        const managerMatches = !managerId || !normalizeId(candidate.managerId) || sameId(candidate.managerId, managerId);
        return userMatches && managerMatches;
    });

    return pickLatestApplication(matches);
};

export const buildWorkspacePath = (basePath: string, options: WorkspaceLinkOptions) => {
    const searchParams = new URLSearchParams();

    if (normalizeId(options.applicationId)) {
        searchParams.set('application', normalizeId(options.applicationId));
    }
    if (normalizeId(options.viewingId)) {
        searchParams.set('viewing', normalizeId(options.viewingId));
    }
    if (normalizeId(options.contractId)) {
        searchParams.set('contract', normalizeId(options.contractId));
    }
    if (normalizeId(options.paymentId)) {
        searchParams.set('payment', normalizeId(options.paymentId));
    }
    if (normalizeId(options.invoiceId)) {
        searchParams.set('invoice', normalizeId(options.invoiceId));
    }
    if (normalizeId(options.caseId)) {
        searchParams.set('case', normalizeId(options.caseId));
    }
    if (normalizeId(options.leadId)) {
        searchParams.set('lead', normalizeId(options.leadId));
    }
    if (normalizeId(options.propertyId)) {
        searchParams.set('property', normalizeId(options.propertyId));
    }

    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
};

export const resolveFocusedApplication = (
    applications: Application[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.applicationId)) {
        const directMatch = applications.find((application) => sameId(application.id, options.applicationId));
        if (directMatch) {
            if (!isSaleProgressionApplication(directMatch)) {
                return findLinkedSaleProgression(applications, directMatch, options) || directMatch;
            }
            return directMatch;
        }
    }

    if (normalizeId(options.caseId)) {
        const caseMatches = applications.filter((application) => sameId(application.fastTrackCaseId, options.caseId));
        const saleProgressionMatch = pickLatestApplication(caseMatches.filter((application) => isSaleProgressionApplication(application)));
        if (saleProgressionMatch) {
            return saleProgressionMatch;
        }
        const caseMatch = pickLatestApplication(caseMatches);
        if (caseMatch) {
            return caseMatch;
        }
    }

    if (normalizeId(options.leadId)) {
        const leadMatches = applications.filter((application) => sameId(application.leadId, options.leadId));
        const saleProgressionMatch = pickLatestApplication(leadMatches.filter((application) => isSaleProgressionApplication(application)));
        if (saleProgressionMatch) {
            return saleProgressionMatch;
        }
        const leadMatch = pickLatestApplication(leadMatches);
        if (leadMatch) {
            return leadMatch;
        }
    }

    if (normalizeId(options.propertyId)) {
        const propertyMatches = applications.filter((application) => sameId(application.propertyId, options.propertyId));
        const saleProgressionMatch = pickLatestApplication(propertyMatches.filter((application) => isSaleProgressionApplication(application)));
        if (saleProgressionMatch) {
            return saleProgressionMatch;
        }
        return pickLatestApplication(propertyMatches);
    }

    return null;
};

export const resolveFocusedViewing = (
    viewings: Viewing[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.viewingId)) {
        const directMatch = viewings.find((viewing) => sameId(viewing.id, options.viewingId));
        if (directMatch) {
            return directMatch;
        }
    }

    if (normalizeId(options.applicationId)) {
        const applicationMatch = viewings.find((viewing) => sameId(viewing.application_id, options.applicationId));
        if (applicationMatch) {
            return applicationMatch;
        }
    }

    if (normalizeId(options.caseId)) {
        const caseMatch = viewings.find((viewing) => sameId(viewing.fast_track_case_id, options.caseId));
        if (caseMatch) {
            return caseMatch;
        }
    }

    if (normalizeId(options.leadId)) {
        const leadMatch = viewings.find((viewing) => sameId(viewing.lead_id, options.leadId));
        if (leadMatch) {
            return leadMatch;
        }
    }

    if (normalizeId(options.propertyId)) {
        return viewings.find((viewing) => sameId(viewing.property_id, options.propertyId)) || null;
    }

    return null;
};

export const resolveFocusedContract = (
    contracts: Contract[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.contractId)) {
        const directMatch = contracts.find((contract) => sameId(contract.id, options.contractId));
        if (directMatch) {
            return directMatch;
        }
    }

    if (normalizeId(options.applicationId)) {
        const applicationMatch = contracts.find((contract) => sameId(contract.application_id, options.applicationId));
        if (applicationMatch) {
            return applicationMatch;
        }
    }

    if (normalizeId(options.caseId)) {
        const caseMatch = contracts.find((contract) => sameId(contract.fast_track_case_id, options.caseId));
        if (caseMatch) {
            return caseMatch;
        }
    }

    if (normalizeId(options.leadId)) {
        const leadMatch = contracts.find((contract) => sameId(contract.lead_id, options.leadId));
        if (leadMatch) {
            return leadMatch;
        }
    }

    if (normalizeId(options.propertyId)) {
        return contracts.find((contract) => sameId(contract.property_id, options.propertyId)) || null;
    }

    return null;
};

export const resolveFocusedPayment = (
    payments: Payment[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.paymentId)) {
        const directMatch = payments.find((payment) => sameId(payment.id, options.paymentId));
        if (directMatch) {
            return directMatch;
        }
    }

    if (normalizeId(options.applicationId)) {
        const applicationMatch = payments.find((payment) => sameId(payment.application_id, options.applicationId));
        if (applicationMatch) {
            return applicationMatch;
        }
    }

    if (normalizeId(options.contractId)) {
        const contractMatch = payments.find((payment) => sameId(payment.contract_id, options.contractId));
        if (contractMatch) {
            return contractMatch;
        }
    }

    return null;
};

export const resolveFocusedInvoice = (
    invoices: Invoice[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.invoiceId)) {
        const directMatch = invoices.find((invoice) => sameId(invoice.id, options.invoiceId));
        if (directMatch) {
            return directMatch;
        }
    }

    if (normalizeId(options.paymentId)) {
        const paymentMatch = invoices.find((invoice) => sameId(invoice.payment_id, options.paymentId));
        if (paymentMatch) {
            return paymentMatch;
        }
    }

    if (normalizeId(options.applicationId)) {
        const applicationMatch = invoices.find((invoice) => sameId(invoice.application_id, options.applicationId));
        if (applicationMatch) {
            return applicationMatch;
        }
    }

    if (normalizeId(options.contractId)) {
        const contractMatch = invoices.find((invoice) => sameId(invoice.contract_id, options.contractId));
        if (contractMatch) {
            return contractMatch;
        }
    }

    return null;
};

export const resolveContractWorkspaceContext = (
    contracts: Contract[],
    applications: Application[],
    options: WorkspaceLinkOptions,
) => {
    const application = resolveFocusedApplication(applications, options);
    const contract = resolveFocusedContract(contracts, {
        ...options,
        applicationId: normalizeId(options.applicationId) || application?.id,
    });

    return {
        application,
        contract,
    };
};

export const resolvePaymentsWorkspaceContext = (
    payments: Payment[],
    invoices: Invoice[],
    options: WorkspaceLinkOptions,
) => {
    const payment = resolveFocusedPayment(payments, options);
    const invoice = resolveFocusedInvoice(invoices, {
        ...options,
        paymentId: normalizeId(options.paymentId) || payment?.id,
    });

    return {
        payment,
        invoice,
    };
};
