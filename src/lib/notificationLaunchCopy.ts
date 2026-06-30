import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
import { NOTIFICATION_TYPES } from '@/services/notificationsService';

type NotificationCopyInput = {
    type: string;
    title?: string | null;
    message?: string | null;
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
        message: notification.message || '',
    };
}
