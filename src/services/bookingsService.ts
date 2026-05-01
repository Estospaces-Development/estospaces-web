/**
 * Bookings Service
 * Fetches and manages bookings, viewings, and contracts from the booking-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import type { ApiFetchOptions } from '@/lib/apiUtils';
import { Contract, ContractTemplate } from '@/types/booking';

const BOOKING_URL = () => getServiceUrl('booking');
type ServiceRequestOptions = Pick<ApiFetchOptions, 'suppressErrorToast'>;

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
    cancellation_reason?: string;
    created_at: string;
}

export interface Viewing {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    broker_request_id?: string | null;
    lead_id?: string | null;
    fast_track_case_id?: string | null;
    application_id?: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    property_title?: string;
    property_address?: string;
    property_image?: string;
    property_price?: number;
    listing_type?: string;
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    agent_agency?: string;
    scheduled_at: string;
    duration_minutes: number;
    viewing_type: 'in_person' | 'virtual';
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'rescheduled';
    user_notes?: string;
    manager_notes?: string;
    cancellation_reason?: string;
    workflow_locked?: boolean;
    workflow_lock_reason?: string;
    created_at: string;
}

export interface CreateBookingRequest {
    property_id: string;
    manager_id: string;
    check_in_date: string;
    check_out_date: string;
    guest_count?: number;
    special_requests?: string;
}

export interface CreateViewingRequest {
    property_id: string;
    manager_id: string;
    lead_id?: string;
    fast_track_case_id?: string;
    client_name?: string;
    client_email?: string;
    client_phone?: string;
    property_title?: string;
    property_address?: string;
    property_image?: string;
    property_price?: number;
    listing_type?: string;
    agent_name?: string;
    agent_email?: string;
    agent_phone?: string;
    agent_agency?: string;
    requested_date: string; // YYYY-MM-DD
    requested_time: string; // HH:MM
    viewing_type?: string;
    user_notes?: string;
}

export interface UpdateViewingRequest {
    requested_date?: string;
    requested_time?: string;
    status?: Viewing['status'];
    user_notes?: string;
    manager_notes?: string;
    cancellation_reason?: string;
}

export interface ViewingAvailabilitySlot {
    date: string;
    time: string;
    status: Viewing['status'];
}

export interface ViewingAvailability {
    property_id: string;
    slots: ViewingAvailabilitySlot[];
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get bookings for the current user
 */
export async function getBookings(options: ServiceRequestOptions = {}): Promise<Booking[]> {
    return apiFetch<Booking[]>(`${BOOKING_URL()}/api/v1/bookings`, {
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function createBooking(request: CreateBookingRequest, options: ServiceRequestOptions = {}): Promise<Booking> {
    return apiFetch<Booking>(`${BOOKING_URL()}/api/v1/bookings`, {
        method: 'POST',
        body: JSON.stringify(request),
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function cancelBooking(id: string, reason: string, options: ServiceRequestOptions = {}): Promise<void> {
    await apiFetch(`${BOOKING_URL()}/api/v1/bookings/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function confirmBooking(id: string, options: ServiceRequestOptions = {}): Promise<void> {
    await apiFetch(`${BOOKING_URL()}/api/v1/bookings/${id}/confirm`, {
        method: 'PUT',
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

/**
 * Create a new viewing
 */
export async function createViewing(request: CreateViewingRequest, options: ServiceRequestOptions = {}): Promise<Viewing> {
    return apiFetch<Viewing>(`${BOOKING_URL()}/api/v1/viewings`, {
        method: 'POST',
        body: JSON.stringify(request),
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

/**
 * Get viewings for the current user
 */
export async function getViewings(options: ServiceRequestOptions = {}): Promise<Viewing[]> {
    return apiFetch<Viewing[]>(`${BOOKING_URL()}/api/v1/viewings`, {
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function getViewingAvailability(propertyId: string): Promise<ViewingAvailability> {
    const query = new URLSearchParams({ property_id: propertyId }).toString();
    return apiFetch<ViewingAvailability>(`${BOOKING_URL()}/api/v1/viewings/availability?${query}`);
}

export async function getViewing(id: string): Promise<Viewing> {
    return apiFetch<Viewing>(`${BOOKING_URL()}/api/v1/viewings/${id}`);
}

/**
 * Get contracts for the current user
 */
export async function getContracts(): Promise<Contract[]> {
    return apiFetch<Contract[]>(`${BOOKING_URL()}/api/v1/contracts/mine`);
}

/**
 * Cancel a viewing
 */
export async function cancelViewing(id: string, reason: string, options: ServiceRequestOptions = {}): Promise<void> {
    await apiFetch(`${BOOKING_URL()}/api/v1/viewings/${id}/cancel`, {
        method: 'PUT',
        body: JSON.stringify({ reason }),
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function confirmViewing(id: string, options: ServiceRequestOptions = {}): Promise<void> {
    await apiFetch(`${BOOKING_URL()}/api/v1/viewings/${id}/confirm`, {
        method: 'PUT',
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

export async function updateViewing(id: string, request: UpdateViewingRequest, options: ServiceRequestOptions = {}): Promise<Viewing> {
    return apiFetch<Viewing>(`${BOOKING_URL()}/api/v1/viewings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(request),
        suppressErrorToast: options.suppressErrorToast ?? true,
    });
}

/**
 * Get contract templates (mandatory forms)
 */
export async function getContractTemplates(): Promise<ContractTemplate[]> {
    return apiFetch<ContractTemplate[]>(`${BOOKING_URL()}/api/v1/contract-templates`);
}

export const bookingsService = {
    createBooking,
    cancelBooking,
    confirmBooking,
    getBookings,
    getViewings,
    getViewingAvailability,
    getViewing,
    createViewing,
    getContracts,
    getContractTemplates,
    cancelViewing,
    confirmViewing,
    updateViewing,
};
