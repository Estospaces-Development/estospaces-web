import test from 'node:test';
import assert from 'node:assert/strict';

import type { Application } from '@/contexts/ApplicationsContext';
import type { Viewing } from '@/services/bookingsService';
import type { Invoice, Payment } from '@/services/paymentsService';
import type { Contract } from '@/types/booking';
import {
    buildWorkspacePath,
    resolveContractWorkspaceContext,
    resolveFocusedApplication,
    resolveFocusedContract,
    resolveFocusedInvoice,
    resolveFocusedPayment,
    resolveFocusedViewing,
    resolvePaymentsWorkspaceContext,
} from './workspaceLinks';

const applications: Application[] = [
    {
        id: 'application-1',
        propertyId: 'property-1',
        leadId: 'lead-1',
        fastTrackCaseId: 'case-1',
        status: 'under_review',
        createdAt: '2026-03-25T08:00:00Z',
    },
    {
        id: 'application-2',
        propertyId: 'property-2',
        leadId: 'lead-2',
        fastTrackCaseId: 'case-2',
        status: 'approved',
        createdAt: '2026-03-25T09:00:00Z',
    },
];

const viewings: Viewing[] = [
    {
        id: 'viewing-1',
        property_id: 'property-1',
        user_id: 'user-1',
        manager_id: 'manager-1',
        lead_id: 'lead-1',
        fast_track_case_id: 'case-1',
        application_id: 'application-1',
        scheduled_at: '2026-03-26T09:00:00Z',
        duration_minutes: 30,
        viewing_type: 'in_person',
        status: 'confirmed',
        created_at: '2026-03-25T08:15:00Z',
    },
];

const contracts: Contract[] = [
    {
        id: 'contract-1',
        application_id: 'application-1',
        lead_id: 'lead-1',
        fast_track_case_id: 'case-1',
        property_id: 'property-1',
        manager_id: 'manager-1',
        user_id: 'user-1',
        status: 'pending_user_signature',
        created_at: '2026-03-25T10:00:00Z',
        updated_at: '2026-03-25T10:05:00Z',
    },
];

const payments: Payment[] = [
    {
        id: 'payment-1',
        user_id: 'user-1',
        application_id: 'application-1',
        contract_id: 'contract-1',
        amount: 1200,
        currency: 'GBP',
        status: 'pending',
        payment_method: 'card',
        payment_type: 'holding_deposit',
        description: 'Holding deposit',
        created_at: '2026-03-25T10:15:00Z',
    },
];

const invoices: Invoice[] = [
    {
        id: 'invoice-1',
        user_id: 'user-1',
        payment_id: 'payment-1',
        application_id: 'application-1',
        contract_id: 'contract-1',
        invoice_number: 'INV-1',
        subtotal: 1200,
        tax_amount: 0,
        total_amount: 1200,
        currency: 'GBP',
        status: 'open',
        due_date: '2026-03-30',
        created_at: '2026-03-25T10:20:00Z',
    },
];

test('buildWorkspacePath only includes the available workflow ids', () => {
    const path = buildWorkspacePath('/user/applications', {
        applicationId: 'application-1',
        caseId: 'case-1',
        propertyId: 'property-1',
    });

    assert.equal(path, '/user/applications?application=application-1&case=case-1&property=property-1');
});

test('buildWorkspacePath includes payment and invoice ids when present', () => {
    const path = buildWorkspacePath('/user/dashboard/payments', {
        paymentId: 'payment-1',
        invoiceId: 'invoice-1',
        applicationId: 'application-1',
    });

    assert.equal(path, '/user/dashboard/payments?application=application-1&payment=payment-1&invoice=invoice-1');
});

test('resolveFocusedApplication prefers a direct application match before case fallback', () => {
    const focused = resolveFocusedApplication(applications, {
        applicationId: 'application-2',
        caseId: 'case-1',
    });

    assert.equal(focused?.id, 'application-2');
});

test('resolveFocusedViewing can focus a viewing from the linked application id', () => {
    const focused = resolveFocusedViewing(viewings, {
        applicationId: 'application-1',
    });

    assert.equal(focused?.id, 'viewing-1');
});

test('resolveFocusedContract falls back to the fast-track case id when the direct contract id is absent', () => {
    const focused = resolveFocusedContract(contracts, {
        caseId: 'case-1',
    });

    assert.equal(focused?.id, 'contract-1');
});

test('resolveContractWorkspaceContext can focus a linked contract from a legacy case route', () => {
    const legacyContracts: Contract[] = [
        {
            id: 'contract-legacy',
            application_id: 'application-2',
            property_id: 'property-2',
            manager_id: 'manager-2',
            user_id: 'user-2',
            status: 'active',
            created_at: '2026-03-25T11:00:00Z',
            updated_at: '2026-03-25T11:00:00Z',
        },
    ];

    const context = resolveContractWorkspaceContext(legacyContracts, applications, {
        caseId: 'case-2',
        leadId: 'lead-2',
        propertyId: 'property-2',
    });

    assert.equal(context.application?.id, 'application-2');
    assert.equal(context.contract?.id, 'contract-legacy');
});

test('resolveFocusedPayment prefers direct payment ids before linked application fallback', () => {
    const focused = resolveFocusedPayment(payments, {
        paymentId: 'payment-1',
        applicationId: 'application-2',
    });

    assert.equal(focused?.id, 'payment-1');
});

test('resolveFocusedInvoice can find the linked invoice from the payment id', () => {
    const focused = resolveFocusedInvoice(invoices, {
        paymentId: 'payment-1',
    });

    assert.equal(focused?.id, 'invoice-1');
});

test('resolvePaymentsWorkspaceContext keeps payment and invoice aligned in the same journey', () => {
    const context = resolvePaymentsWorkspaceContext(payments, invoices, {
        applicationId: 'application-1',
        contractId: 'contract-1',
    });

    assert.equal(context.payment?.id, 'payment-1');
    assert.equal(context.invoice?.id, 'invoice-1');
});
