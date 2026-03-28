/**
 * Payments Service
 * Fetches and manages payments and invoices from the payment-service backend.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import type { JourneyDeadline } from '@/types/journey';

const PAYMENT_URL = () => getServiceUrl('payment');

export interface Payment {
    id: string;
    user_id: string;
    manager_id?: string | null;
    booking_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    payment_method: string;
    payment_type?: string;
    due_at?: string | null;
    description: string;
    failure_reason?: string;
    refund_amount?: number | null;
    refunded_at?: string | null;
    processed_at?: string | null;
    billing_mode?: 'invoice_tracking';
    payment_record_status?: string;
    refund_status?: string;
    metadata?: string;
    jurisdiction_profile?: string;
    workflow_item_code?: string;
    compliance_status_reason?: string;
    compliance_deadlines?: JourneyDeadline[];
    created_at: string;
    updated_at?: string;
}

export interface Invoice {
    id: string;
    user_id: string;
    manager_id?: string | null;
    payment_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    invoice_number?: string;
    subtotal: number;
    tax_amount: number;
    total_amount: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    issued_date?: string;
    due_date: string;
    payment_type?: string;
    pdf_url?: string;
    paid_at?: string | null;
    billing_mode?: 'invoice_tracking';
    invoice_status?: string;
    metadata?: string;
    jurisdiction_profile?: string;
    workflow_item_code?: string;
    compliance_status_reason?: string;
    compliance_deadlines?: JourneyDeadline[];
    created_at: string;
    updated_at?: string;
}

export interface PaymentMutationResponse {
    message: string;
}

export interface CreatePaymentInput {
    user_id: string;
    booking_id?: string;
    application_id?: string;
    contract_id?: string;
    manager_id?: string;
    amount: number;
    payment_method: string;
    payment_type?: string;
    due_at?: string;
    metadata?: string;
    idempotency_key?: string;
}

export interface CreateInvoiceInput {
    user_id: string;
    payment_id?: string | null;
    application_id?: string;
    contract_id?: string;
    manager_id?: string;
    payment_type?: string;
    line_items: string;
    subtotal: number;
    tax_amount?: number;
    due_date: string;
    currency?: string;
    metadata?: string;
}

const withSuccess = <T>(data: T) => ({ success: true, data });

export async function getPayments(): Promise<{ success: boolean; data: Payment[] }> {
    const data = await apiFetch<Payment[]>(`${PAYMENT_URL()}/api/v1/payments`);
    return withSuccess(Array.isArray(data) ? data : []);
}

export async function getPayment(paymentID: string): Promise<{ success: boolean; data: Payment }> {
    const data = await apiFetch<Payment>(`${PAYMENT_URL()}/api/v1/payments/${paymentID}`);
    return withSuccess(data);
}

export async function getManagerPayments(): Promise<{ success: boolean; data: Payment[] }> {
    const data = await apiFetch<Payment[]>(`${PAYMENT_URL()}/api/v1/manager/payments`);
    return withSuccess(Array.isArray(data) ? data : []);
}

export async function createPayment(input: CreatePaymentInput): Promise<{ success: boolean; data: Payment }> {
    const data = await apiFetch<Payment>(`${PAYMENT_URL()}/api/v1/payments`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return withSuccess(data);
}

export async function confirmPayment(paymentID: string): Promise<{ success: boolean; data: PaymentMutationResponse }> {
    const data = await apiFetch<PaymentMutationResponse>(`${PAYMENT_URL()}/api/v1/payments/${paymentID}/confirm`, {
        method: 'POST',
    });
    return withSuccess(data);
}

export async function refundPayment(
    paymentID: string,
    amount: number,
): Promise<{ success: boolean; data: PaymentMutationResponse }> {
    const data = await apiFetch<PaymentMutationResponse>(`${PAYMENT_URL()}/api/v1/payments/${paymentID}/refund`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
    });
    return withSuccess(data);
}

export async function getInvoices(): Promise<{ success: boolean; data: Invoice[] }> {
    const data = await apiFetch<Invoice[]>(`${PAYMENT_URL()}/api/v1/invoices`);
    return withSuccess(Array.isArray(data) ? data : []);
}

export async function getManagerInvoices(): Promise<{ success: boolean; data: Invoice[] }> {
    const data = await apiFetch<Invoice[]>(`${PAYMENT_URL()}/api/v1/manager/invoices`);
    return withSuccess(Array.isArray(data) ? data : []);
}

export async function getInvoice(invoiceID: string): Promise<{ success: boolean; data: Invoice }> {
    const data = await apiFetch<Invoice>(`${PAYMENT_URL()}/api/v1/invoices/${invoiceID}`);
    return withSuccess(data);
}

export async function createInvoice(input: CreateInvoiceInput): Promise<{ success: boolean; data: Invoice }> {
    const data = await apiFetch<Invoice>(`${PAYMENT_URL()}/api/v1/invoices`, {
        method: 'POST',
        body: JSON.stringify(input),
    });
    return withSuccess(data);
}

export const paymentsService = {
    getPayments,
    getPayment,
    getManagerPayments,
    createPayment,
    confirmPayment,
    refundPayment,
    getInvoices,
    getManagerInvoices,
    getInvoice,
    createInvoice,
};
