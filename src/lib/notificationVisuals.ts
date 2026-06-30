import {
    NOTIFICATION_TYPES,
    isPropertyWorkflowNotification,
    type Notification,
} from '@/services/notificationsService';

type NotificationVisualInput = Pick<Notification, 'type' | 'data'> | {
    type: string;
    data?: Notification['data'];
};

export type NotificationTone = 'blue' | 'emerald' | 'gray' | 'green' | 'orange' | 'purple' | 'red';

const dangerTypes = new Set<string>([
    NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
    NOTIFICATION_TYPES.VIEWING_CANCELLED,
    NOTIFICATION_TYPES.APPLICATION_REJECTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.PAYMENT_FAILED,
    NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE,
]);

const successTypes = new Set<string>([
    NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
    NOTIFICATION_TYPES.VIEWING_COMPLETED,
    NOTIFICATION_TYPES.APPLICATION_APPROVED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED,
    NOTIFICATION_TYPES.DOCUMENT_VERIFIED,
    NOTIFICATION_TYPES.PROFILE_VERIFIED,
    NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    NOTIFICATION_TYPES.SALE_JOURNEY_COMPLETED,
    NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
]);

const viewingTypes = new Set<string>([
    NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    NOTIFICATION_TYPES.VIEWING_BOOKED,
    NOTIFICATION_TYPES.VIEWING_CONFIRMED,
    NOTIFICATION_TYPES.VIEWING_RESCHEDULED,
]);

const applicationTypes = new Set<string>([
    NOTIFICATION_TYPES.APPLICATION_UPDATE,
    NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    NOTIFICATION_TYPES.CONTRACT_UPDATE,
    NOTIFICATION_TYPES.CONTRACT_EXPIRING,
]);

const documentTypes = new Set<string>([
    NOTIFICATION_TYPES.DOCUMENTS_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED,
]);

const messageTypes = new Set<string>([
    NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    NOTIFICATION_TYPES.TICKET_RESPONSE,
    NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED,
]);

const propertyTypes = new Set<string>([
    NOTIFICATION_TYPES.PROPERTY_SAVED,
    NOTIFICATION_TYPES.PROPERTY_SELECTED,
    NOTIFICATION_TYPES.NEW_PROPERTY_MATCH,
    NOTIFICATION_TYPES.PROPERTY_AVAILABLE,
]);

const fastTrackTypes = new Set<string>([
    NOTIFICATION_TYPES.FAST_TRACK_STARTED,
    NOTIFICATION_TYPES.FAST_TRACK_UPDATED,
    NOTIFICATION_TYPES.SALE_JOURNEY_UPDATED,
]);

const verificationActionTypes = new Set<string>([
    NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED,
]);

export function getNotificationTone(notification: NotificationVisualInput): NotificationTone {
    if (isPropertyWorkflowNotification(notification)) return 'orange';

    const type = notification.type;
    if (dangerTypes.has(type)) return 'red';
    if (successTypes.has(type)) return 'emerald';
    if (messageTypes.has(type)) return 'green';
    if (viewingTypes.has(type) || documentTypes.has(type)) return 'blue';
    if (applicationTypes.has(type)) return 'purple';
    if (propertyTypes.has(type) || fastTrackTypes.has(type) || verificationActionTypes.has(type)) return 'orange';
    if (type === NOTIFICATION_TYPES.PAYMENT_REMINDER || type === NOTIFICATION_TYPES.PRICE_DROP) return 'emerald';

    return 'gray';
}

const iconColorByTone: Record<NotificationTone, string> = {
    blue: 'text-blue-500',
    emerald: 'text-emerald-500',
    gray: 'text-gray-500',
    green: 'text-green-500',
    orange: 'text-orange-500',
    purple: 'text-purple-500',
    red: 'text-red-500',
};

const softSurfaceByTone: Record<NotificationTone, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    gray: 'bg-gray-50 dark:bg-gray-700/50',
    green: 'bg-green-50 dark:bg-green-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
};

const borderedSurfaceByTone: Record<NotificationTone, string> = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40',
    gray: 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/40',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/40',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40',
};

export function getNotificationIconColorClass(notification: NotificationVisualInput): string {
    return iconColorByTone[getNotificationTone(notification)];
}

export function getNotificationSurfaceClass(notification: NotificationVisualInput, bordered = false): string {
    const tone = getNotificationTone(notification);
    return bordered ? borderedSurfaceByTone[tone] : softSurfaceByTone[tone];
}
