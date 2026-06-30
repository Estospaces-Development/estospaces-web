import type { Viewing } from '@/services/bookingsService';
import type { Invoice, Payment } from '@/services/paymentsService';
import type { Contract } from '@/types/booking';
import type { WorkspaceSection } from '@/lib/liveCaseWorkspace';

type MaybeString = string | null | undefined;

type WorkspaceApplication = {
    id: string;
    source?: string;
    createdAt?: string;
    created_at?: string;
    updatedAt?: string;
    updated_at?: string;
    propertyId?: MaybeString;
    property_id?: MaybeString;
    userId?: MaybeString;
    user_id?: MaybeString;
    managerId?: MaybeString;
    manager_id?: MaybeString;
    leadId?: MaybeString;
    lead_id?: MaybeString;
    fastTrackCaseId?: MaybeString;
    fast_track_case_id?: MaybeString;
};

export interface WorkspaceLinkOptions {
    applicationId?: MaybeString;
    viewingId?: MaybeString;
    contractId?: MaybeString;
    paymentId?: MaybeString;
    invoiceId?: MaybeString;
    progressionId?: MaybeString;
    caseId?: MaybeString;
    leadId?: MaybeString;
    propertyId?: MaybeString;
    section?: WorkspaceSection | MaybeString;
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

const getApplicationCreatedAt = (application: WorkspaceApplication) => (
    application.createdAt || application.created_at
);

const getApplicationUpdatedAt = (application: WorkspaceApplication) => (
    application.updatedAt || application.updated_at
);

const getApplicationPropertyId = (application: WorkspaceApplication) => (
    application.propertyId || application.property_id
);

const getApplicationUserId = (application: WorkspaceApplication) => (
    application.userId || application.user_id
);

const getApplicationManagerId = (application: WorkspaceApplication) => (
    application.managerId || application.manager_id
);

const getApplicationLeadId = (application: WorkspaceApplication) => (
    application.leadId || application.lead_id
);

const getApplicationFastTrackCaseId = (application: WorkspaceApplication) => (
    application.fastTrackCaseId || application.fast_track_case_id
);

const pickLatestApplication = <T extends WorkspaceApplication>(applications: T[]) => (
    [...applications].sort((left, right) => (
        toTimestamp(getApplicationUpdatedAt(right) || getApplicationCreatedAt(right)) - toTimestamp(getApplicationUpdatedAt(left) || getApplicationCreatedAt(left))
    ))[0] || null
);

const pickLatestViewing = (viewings: Viewing[]) => (
    [...viewings].sort((left, right) => (
        toTimestamp(right.scheduled_at || right.created_at) - toTimestamp(left.scheduled_at || left.created_at)
    ))[0] || null
);

const isSaleProgressionApplication = (application?: WorkspaceApplication | null) =>
    application?.source === 'sale_progression';

export const findLinkedSaleProgression = <T extends WorkspaceApplication>(
    applications: T[],
    application?: T | null,
    options: WorkspaceLinkOptions = {},
) => {
    if (!application) {
        return null;
    }

    const caseId = normalizeId(options.caseId) || normalizeId(getApplicationFastTrackCaseId(application));
    const leadId = normalizeId(options.leadId) || normalizeId(getApplicationLeadId(application));
    const propertyId = normalizeId(options.propertyId) || normalizeId(getApplicationPropertyId(application));
    const userId = normalizeId(getApplicationUserId(application));
    const managerId = normalizeId(getApplicationManagerId(application));

    const matches = applications.filter((candidate) => {
        if (!isSaleProgressionApplication(candidate)) {
            return false;
        }

        if (caseId && sameId(getApplicationFastTrackCaseId(candidate), caseId)) {
            return true;
        }
        if (leadId && sameId(getApplicationLeadId(candidate), leadId)) {
            return true;
        }
        if (!propertyId || !sameId(getApplicationPropertyId(candidate), propertyId)) {
            return false;
        }

        const userMatches = !userId || sameId(getApplicationUserId(candidate), userId);
        const managerMatches = !managerId || !normalizeId(getApplicationManagerId(candidate)) || sameId(getApplicationManagerId(candidate), managerId);
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
    if (normalizeId(options.progressionId)) {
        searchParams.set('progression', normalizeId(options.progressionId));
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
    if (normalizeId(options.section)) {
        searchParams.set('section', normalizeId(options.section));
    }

    const query = searchParams.toString();
    return query ? `${basePath}?${query}` : basePath;
};

export const resolveFocusedApplication = <T extends WorkspaceApplication>(
    applications: T[],
    options: WorkspaceLinkOptions,
) => {
    if (normalizeId(options.progressionId)) {
        const directProgressionMatch = applications.find((application) => (
            isSaleProgressionApplication(application) && sameId(application.id, options.progressionId)
        ));
        if (directProgressionMatch) {
            return directProgressionMatch;
        }
        return null;
    }

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
        const caseMatches = applications.filter((application) => sameId(getApplicationFastTrackCaseId(application), options.caseId));
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
        const leadMatches = applications.filter((application) => sameId(getApplicationLeadId(application), options.leadId));
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
        const propertyMatches = applications.filter((application) => sameId(getApplicationPropertyId(application), options.propertyId));
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
        const applicationMatch = pickLatestViewing(viewings.filter((viewing) => sameId(viewing.application_id, options.applicationId)));
        if (applicationMatch) {
            return applicationMatch;
        }
    }

    if (normalizeId(options.caseId)) {
        const caseMatch = pickLatestViewing(viewings.filter((viewing) => sameId(viewing.fast_track_case_id, options.caseId)));
        if (caseMatch) {
            return caseMatch;
        }
    }

    if (normalizeId(options.leadId)) {
        const leadMatch = pickLatestViewing(viewings.filter((viewing) => sameId(viewing.lead_id, options.leadId)));
        if (leadMatch) {
            return leadMatch;
        }
    }

    if (normalizeId(options.propertyId)) {
        return pickLatestViewing(viewings.filter((viewing) => sameId(viewing.property_id, options.propertyId)));
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
        return null;
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

export const resolveContractWorkspaceContext = <T extends WorkspaceApplication>(
    contracts: Contract[],
    applications: T[],
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
