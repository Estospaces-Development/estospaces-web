import { NOTIFICATION_TYPES, type Notification } from '@/services/notificationsService';

const DEDUPED_NOTIFICATION_TYPES = new Set<string>([
    NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
]);

const readString = (data: Record<string, any> | null | undefined, ...keys: string[]) => {
    if (!data) {
        return '';
    }

    for (const key of keys) {
        const value = data[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }

    return '';
};

export const getNotificationToastDedupeKey = (
    notification: Pick<Notification, 'id' | 'type' | 'user_id' | 'message' | 'data'>,
) => {
    if (!DEDUPED_NOTIFICATION_TYPES.has(notification.type)) {
        return notification.id;
    }

    const data = notification.data || {};
    const entityId = readString(
        data,
        'fast_track_id',
        'fastTrackId',
        'caseId',
        'case_id',
        'fast_track_case_id',
        'fastTrackCaseId',
    );

    if (entityId) {
        return `${notification.user_id}:${notification.type}:${entityId}`;
    }

    return `${notification.user_id}:${notification.type}:${notification.message.trim()}`;
};

export const shouldPersistNotificationToastDedupeKey = (
    notification: Pick<Notification, 'type'>,
) => DEDUPED_NOTIFICATION_TYPES.has(notification.type);
