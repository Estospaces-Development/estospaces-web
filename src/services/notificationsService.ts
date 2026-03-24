/**
 * Notifications Service
 * Fetches and creates notifications via the notification-service backend
 */

import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const NOTIFICATION_URL = () => getServiceUrl('notification');

// ── Notification Types ──────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
    // Appointments/Viewings
    APPOINTMENT_APPROVED: 'appointment_approved',
    APPOINTMENT_REJECTED: 'appointment_rejected',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    VIEWING_BOOKED: 'viewing_booked',
    VIEWING_CONFIRMED: 'viewing_confirmed',
    VIEWING_COMPLETED: 'viewing_completed',
    VIEWING_CANCELLED: 'viewing_cancelled',
    VIEWING_RESCHEDULED: 'viewing_rescheduled',

    // Applications
    APPLICATION_UPDATE: 'application_update',
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_REJECTED: 'application_rejected',
    DOCUMENTS_REQUESTED: 'documents_requested',
    FAST_TRACK_STARTED: 'fast_track_started',
    FAST_TRACK_UPDATED: 'fast_track_updated',
    FAST_TRACK_COMPLETED: 'fast_track_completed',

    // Verification
    DOCUMENT_VERIFIED: 'document_verified',
    PROFILE_VERIFIED: 'profile_verified',
    USER_VERIFICATION_SUBMITTED: 'user_verification_submitted',
    MANAGER_VERIFICATION_SUBMITTED: 'manager_verification_submitted',
    USER_VERIFICATION_REUPLOAD_REQUESTED: 'user_verification_reupload_requested',
    MANAGER_VERIFICATION_REUPLOAD_REQUESTED: 'manager_verification_reupload_requested',

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
    data: NotificationData | null;
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
    fast_track_id?: string;
    fastTrackId?: string;
    viewingId?: string;
    messageId?: string;
    conversation_id?: string;
    conversationId?: string;
    amount?: number;
    date?: string;
    time?: string;
    target_path?: string;
    targetPath?: string;
    entity?: string;
    subject_user_id?: string;
    subject_role?: string;
    document_category?: string;
    profile_type?: string;
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

const parseNotificationData = (value: unknown): NotificationData | null => {
    if (!value) return null;

    if (typeof value === 'string') {
        try {
            return JSON.parse(value) as NotificationData;
        } catch {
            return null;
        }
    }

    if (typeof value === 'object') {
        return value as NotificationData;
    }

    return null;
};

const normalizeNotification = (notification: any): Notification => ({
    id: notification.id,
    user_id: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    data: parseNotificationData(notification.data),
    is_read: Boolean(notification.is_read),
    read_at: notification.read_at,
    channel: notification.channel,
    created_at: notification.created_at,
});

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
    const data = await apiFetch<{ notifications?: any[]; unread_count?: number }>(url, {
        suppressErrorToast: true,
    });
    return {
        notifications: (data.notifications || []).map(normalizeNotification),
        unread_count: data.unread_count || 0,
    };
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
 * Dismiss a notification in the UI.
 * The current notification-service only supports read-state mutation, not hard delete.
 */
export async function deleteNotification(notificationId: string): Promise<void> {
    await markRead(notificationId);
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
        void getErrorMessage(error);
        return false;
    }
}

export function getNotificationNavigationPath(
    notification: Pick<Notification, 'type' | 'data'> | { type: string; data?: NotificationData | Record<string, any> | null },
    role: string = 'user',
): string | null {
    const data = notification.data as NotificationData | undefined;
    const targetPath = typeof data?.target_path === 'string'
        ? data.target_path
        : typeof data?.targetPath === 'string'
            ? data.targetPath
            : '';

    if (targetPath.trim()) {
        return targetPath;
    }

    const conversationID = typeof data?.conversation_id === 'string'
        ? data.conversation_id
        : typeof data?.conversationId === 'string'
            ? data.conversationId
            : '';

    switch (notification.type) {
        case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
            return '/admin/verifications';
        case NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED:
            return '/user/dashboard/profile';
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED:
            return '/manager/verification';
        case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
        case NOTIFICATION_TYPES.VIEWING_COMPLETED:
        case NOTIFICATION_TYPES.VIEWING_BOOKED:
        case NOTIFICATION_TYPES.VIEWING_CANCELLED:
        case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
            return role === 'manager' ? '/manager/appointments' : '/user/dashboard/viewings';
        case NOTIFICATION_TYPES.APPLICATION_UPDATE:
        case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        case NOTIFICATION_TYPES.APPLICATION_APPROVED:
            return '/user/dashboard/applications';
        case NOTIFICATION_TYPES.FAST_TRACK_STARTED:
        case NOTIFICATION_TYPES.FAST_TRACK_UPDATED:
        case NOTIFICATION_TYPES.FAST_TRACK_COMPLETED:
            return data?.fast_track_id || data?.fastTrackId
                ? `/user/dashboard/fast-track?case=${data.fast_track_id || data.fastTrackId}`
                : '/user/dashboard/fast-track';
        case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
            return role === 'manager' ? '/manager/leads' : '/user/dashboard/fast-track';
        case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
            if (role === 'manager') {
                return conversationID ? `/manager/messages?conversation=${conversationID}` : '/manager/messages';
            }
            if (role === 'admin') {
                return '/admin/chat';
            }
            return conversationID ? `/user/dashboard/messages?conversation=${conversationID}` : '/user/dashboard/messages';
        case NOTIFICATION_TYPES.PROPERTY_SAVED:
        case NOTIFICATION_TYPES.PRICE_DROP:
        case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
            return data?.propertyId ? `/user/properties/${data.propertyId}` : '/user/dashboard/saved';
        case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
        case NOTIFICATION_TYPES.PAYMENT_REMINDER:
            return '/user/dashboard/notifications';
        case NOTIFICATION_TYPES.CONTRACT_UPDATE:
            return '/user/dashboard/contracts';
        case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
        case NOTIFICATION_TYPES.PROFILE_VERIFIED:
            return role === 'manager' ? '/manager/verification' : '/user/dashboard/profile';
        case NOTIFICATION_TYPES.APPLICATION_REJECTED:
            return role === 'manager' ? '/manager/verification' : '/user/dashboard/profile';
        default:
            return role === 'admin' ? '/admin/notifications' : null;
    }
}

export function getNotificationsPagePath(role: string = 'user'): string {
    switch (role) {
        case 'manager':
            return '/manager/notifications';
        case 'admin':
            return '/admin/notifications';
        default:
            return '/user/dashboard/notifications';
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
    deleteNotification,
    createNotification,
    notifyViewingBooked,
    notifyPropertySaved,
    notifyViewingCancelled,
    getNotificationNavigationPath,
    getNotificationsPagePath,
    NOTIFICATION_TYPES,
};
