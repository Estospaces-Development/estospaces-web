/**
 * Bookings Service
 * Fetches and manages bookings, viewings, and contracts from the booking-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import { Contract, ContractTemplate } from '@/types/booking';

const BOOKING_URL = () => getServiceUrl('booking');

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Booking {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    check_in_date: string;
    check_out_date: string;
    guest_count: number;
    total_amount: number;
    currency: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    created_at: string;
}

export interface Viewing {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    scheduled_at: string;
    duration_minutes: number;
    viewing_type: 'in_person' | 'virtual';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
    user_notes?: string;
    manager_notes?: string;
    created_at: string;
    // UI-mapped fields
    property?: {
        title: string;
        address_line_1: string;
        price: number;
        listing_type: string;
        image_urls: string[];
    };
    agent?: {
        name: string;
        phone: string;
    };
}

export interface CreateViewingRequest {
    property_id: string;
    manager_id: string;
    requested_date: string; // YYYY-MM-DD
    requested_time: string; // HH:MM
    viewing_type?: string;
    user_notes?: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get bookings for the current user
 */
export async function getBookings(): Promise<{ data: Booking[] }> {
    return apiFetch<{ data: Booking[] }>(`${BOOKING_URL()}/api/v1/bookings`);
}

/**
 * Create a new viewing
 */
export async function createViewing(request: CreateViewingRequest): Promise<{ data: Viewing }> {
    return apiFetch<{ data: Viewing }>(`${BOOKING_URL()}/api/v1/viewings`, {
        method: 'POST',
        body: JSON.stringify(request),
    });
}

/**
 * Get viewings for the current user
 */
export async function getViewings(): Promise<{ data: Viewing[] }> {
    // Note: In a real implementation, the backend would join property/agent data
    // For now, we fetch the raw viewings
    return apiFetch<{ data: Viewing[] }>(`${BOOKING_URL()}/api/v1/viewings`);
}

/**
 * Get contracts for the current user
 */
export async function getContracts(): Promise<{ data: Contract[] }> {
    return apiFetch<{ data: Contract[] }>(`${BOOKING_URL()}/api/v1/contracts`);
}

/**
 * Cancel a viewing
 */
export async function cancelViewing(id: string): Promise<void> {
    await apiFetch(`${BOOKING_URL()}/api/v1/viewings/${id}/cancel`, {
        method: 'POST',
    });
}

/**
 * Get contract templates (mandatory forms)
 */
export async function getContractTemplates(): Promise<{ data: ContractTemplate[] }> {
    return apiFetch<{ data: ContractTemplate[] }>(`${BOOKING_URL()}/api/v1/contract-templates`);
}

export const bookingsService = {
    getBookings,
    getViewings,
    createViewing,
    getContracts,
    getContractTemplates,
    cancelViewing,
};
