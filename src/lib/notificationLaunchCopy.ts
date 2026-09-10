import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
import { NOTIFICATION_TYPES, isPropertyWorkflowNotification, type NotificationData } from '@/services/notificationsService';

type NotificationCopyInput = {
    type: string;
    title?: string | null;
    message?: string | null;
    data?: NotificationData | null;
};

type NotificationDisplayCopy = {
    title: string;
    message: string;
};

const financeNotificationTypes = new Set<string>([
    NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    NOTIFICATION_TYPES.PAYMENT_REMINDER,
    NOTIFICATION_TYPES.PAYMENT_FAILED,
]);

const propertyWorkflowTitles = new Set([
    'Property approved and published',
    'Property submitted for review',
    'Property rejected',
    'Property suspended',
    'Property status updated',
]);

const formatLegacyPropertyActor = (notification: NotificationCopyInput): string => {
    const message = notification.message || '';
    if (!isPropertyWorkflowNotification(notification) || !propertyWorkflowTitles.has(notification.title || '')) {
        return message;
    }

    // Only normalize the actor in known server templates, never quoted property titles or free text.
    return message.replace(/^([\p{L}\p{M}]+(?:[ '-][\p{L}\p{M}]+)*)( (?:approved and published|approved|submitted|rejected|suspended|updated) ")/u,
        (prefix: string, actor: string, action: string) => actor === actor.toLowerCase()
            ? actor.replace(/(^|[ '-])(\p{L})/gu, (_match: string, boundary: string, letter: string) => boundary + letter.toUpperCase()) + action
            : prefix);
};

export function isInactiveFinanceNotification(notification: Pick<NotificationCopyInput, 'type'>) {
    return !PAYMENTS_ENABLED && financeNotificationTypes.has(notification.type);
}

export function getLaunchSafeNotificationCopy(notification: NotificationCopyInput): NotificationDisplayCopy {
    if (isInactiveFinanceNotification(notification)) {
        return {
            title: 'Contract milestone updated',
            message: 'A contract milestone was updated. Open contracts for the latest status.',
        };
    }

    return {
        title: notification.title || 'Notification',
        message: formatLegacyPropertyActor(notification),
    };
}
