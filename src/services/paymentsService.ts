/**
 * Payments Service
 * Fetches and manages payments and invoices from the payment-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const PAYMENT_URL = () => getServiceUrl('payment');

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Payment {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    payment_method: string;
    description: string;
    created_at: string;
}

export interface Invoice {
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
    due_date: string;
    created_at: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get payments for the current user
 */
export async function getPayments(): Promise<{ success: boolean; data: Payment[] }> {
    return apiFetch<{ success: boolean; data: Payment[] }>(`${PAYMENT_URL()}/api/v1/payments`);
}

/**
 * Get invoices for the current user
 */
export async function getInvoices(): Promise<{ success: boolean; data: Invoice[] }> {
    return apiFetch<{ success: boolean; data: Invoice[] }>(`${PAYMENT_URL()}/api/v1/invoices`);
}

export const paymentsService = {
    getPayments,
    getInvoices,
};
