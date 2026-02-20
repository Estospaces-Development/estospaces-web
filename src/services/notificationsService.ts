/**
 * Notifications Service
 * Fetches and creates notifications via the notification-service backend
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const NOTIFICATION_URL = () => getServiceUrl('notification');

// ── Notification Types ──────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
    // Appointments/Viewings
    APPOINTMENT_APPROVED: 'appointment_approved',
    APPOINTMENT_REJECTED: 'appointment_rejected',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    VIEWING_BOOKED: 'viewing_booked',
    VIEWING_CONFIRMED: 'viewing_confirmed',
    VIEWING_CANCELLED: 'viewing_cancelled',
    VIEWING_RESCHEDULED: 'viewing_rescheduled',

    // Applications
    APPLICATION_UPDATE: 'application_update',
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_REJECTED: 'application_rejected',
    DOCUMENTS_REQUESTED: 'documents_requested',

    // Verification
    DOCUMENT_VERIFIED: 'document_verified',
    PROFILE_VERIFIED: 'profile_verified',

    // Messages
    MESSAGE_RECEIVED: 'message_received',
    TICKET_RESPONSE: 'ticket_response',

    // Properties
    PROPERTY_SAVED: 'property_saved',
    PRICE_DROP: 'price_drop',
    NEW_PROPERTY_MATCH: 'new_property_match',
    PROPERTY_AVAILABLE: 'property_available',
    PROPERTY_UNAVAILABLE: 'property_unavailable',

    // Payments
    PAYMENT_REMINDER: 'payment_reminder',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',

    // Contracts
    CONTRACT_UPDATE: 'contract_update',
    CONTRACT_EXPIRING: 'contract_expiring',

    // System
    SYSTEM: 'system',
    WELCOME: 'welcome',
} as const;

export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string;
    data: string;
    is_read: boolean;
    read_at?: string;
    channel: string;
    created_at: string;
}

export interface NotificationData {
    propertyId?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyImage?: string;
    applicationId?: string;
    viewingId?: string;
    messageId?: string;
    amount?: number;
    date?: string;
    time?: string;
    [key: string]: any;
}

export interface CreateNotificationParams {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
    channel?: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get notifications for the current user
 * GET /api/v1/notifications
 */
export async function getNotifications(unreadOnly: boolean = false): Promise<{
    notifications: Notification[];
    unread_count: number;
}> {
    const url = `${NOTIFICATION_URL()}/api/v1/notifications${unreadOnly ? '?unread_only=true' : ''}`;
    return apiFetch<{ notifications: Notification[]; unread_count: number }>(url);
}

/**
 * Mark a single notification as read
 * PUT /api/v1/notifications/:id/read
 */
export async function markRead(notificationId: string): Promise<void> {
    await apiFetch<any>(
        `${NOTIFICATION_URL()}/api/v1/notifications/${notificationId}/read`,
        { method: 'PUT' },
    );
}

/**
 * Mark all notifications as read
 * PUT /api/v1/notifications/read-all
 */
export async function markAllRead(): Promise<void> {
    await apiFetch<any>(
        `${NOTIFICATION_URL()}/api/v1/notifications/read-all`,
        { method: 'PUT' },
    );
}

/**
 * Create a notification for a user
 * POST /api/v1/notifications
 */
export async function createNotification({
    userId,
    type,
    title,
    message,
    data = {},
    channel = 'in_app',
}: CreateNotificationParams): Promise<boolean> {
    try {
        await apiFetch<Notification>(
            `${NOTIFICATION_URL()}/api/v1/notifications`,
            {
                method: 'POST',
                body: JSON.stringify({
                    user_id: userId,
                    type,
                    title,
                    message,
                    data: JSON.stringify(data),
                    channel,
                }),
            },
        );
        return true;
    } catch (error: any) {
        console.error('[notificationsService] createNotification error:', error.message);
        return false;
    }
}

// ── Convenience Wrappers ────────────────────────────────────────────────────

export async function notifyViewingBooked(
    userId: string,
    propertyTitle: string,
    propertyId: string,
    date: string,
    time: string,
): Promise<boolean> {
    return createNotification({
        userId,
        type: NOTIFICATION_TYPES.VIEWING_BOOKED,
        title: 'Viewing Request Submitted',
        message: `Your viewing request for "${propertyTitle}" on ${date} at ${time} has been submitted. We'll notify you once it's confirmed.`,
        data: { propertyId, propertyTitle, date, time },
    });
}

export async function notifyPropertySaved(
    userId: string,
    propertyTitle: string,
    propertyId: string,
    propertyImage?: string,
): Promise<boolean> {
    return createNotification({
        userId,
        type: NOTIFICATION_TYPES.PROPERTY_SAVED,
        title: 'Property Saved',
        message: `"${propertyTitle}" has been added to your saved properties. You'll be notified of any price changes.`,
        data: { propertyId, propertyTitle, propertyImage },
    });
}

export async function notifyViewingCancelled(
    userId: string,
    propertyTitle: string,
    propertyId: string,
    date: string,
    reason: string,
): Promise<boolean> {
    return createNotification({
        userId,
        type: NOTIFICATION_TYPES.VIEWING_CANCELLED,
        title: 'Viewing Cancelled',
        message: `Your viewing for "${propertyTitle}" on ${date} has been cancelled. Reason: ${reason}`,
        data: { propertyId, propertyTitle, date, reason },
    });
}

// ── Default Export ──────────────────────────────────────────────────────────

export const notificationsService = {
    getNotifications,
    markRead,
    markAllRead,
    createNotification,
    notifyViewingBooked,
    notifyPropertySaved,
    notifyViewingCancelled,
    NOTIFICATION_TYPES,
};
