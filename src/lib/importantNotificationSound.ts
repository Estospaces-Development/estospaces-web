import {
    NOTIFICATION_TYPES,
    type Notification,
} from '@/services/notificationsService';

export const IMPORTANT_NOTIFICATION_SOUND_URL = '/audio/new-notification-024.mp3';
export const IMPORTANT_NOTIFICATION_SOUND_VOLUME = 1;

export const IMPORTANT_NOTIFICATION_TYPES = new Set<string>([
    NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
    NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
    NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    NOTIFICATION_TYPES.VIEWING_BOOKED,
    NOTIFICATION_TYPES.VIEWING_CONFIRMED,
    NOTIFICATION_TYPES.VIEWING_COMPLETED,
    NOTIFICATION_TYPES.VIEWING_CANCELLED,
    NOTIFICATION_TYPES.VIEWING_RESCHEDULED,
    NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    NOTIFICATION_TYPES.APPLICATION_UPDATE,
    NOTIFICATION_TYPES.APPLICATION_APPROVED,
    NOTIFICATION_TYPES.APPLICATION_REJECTED,
    NOTIFICATION_TYPES.DOCUMENTS_REQUESTED,
    NOTIFICATION_TYPES.SALE_JOURNEY_UPDATED,
    NOTIFICATION_TYPES.SALE_JOURNEY_COMPLETED,
    NOTIFICATION_TYPES.FAST_TRACK_REQUESTED,
    NOTIFICATION_TYPES.FAST_TRACK_STARTED,
    NOTIFICATION_TYPES.FAST_TRACK_UPDATED,
    NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.BROKER_REQUEST_MATCHED,
    NOTIFICATION_TYPES.BROKER_REQUEST_PORTFOLIO_SHARED,
    NOTIFICATION_TYPES.BROKER_REQUEST_REMATCH,
    NOTIFICATION_TYPES.DOCUMENT_VERIFIED,
    NOTIFICATION_TYPES.PROFILE_VERIFIED,
    NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED,
    NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    NOTIFICATION_TYPES.TICKET_RESPONSE,
    NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED,
    NOTIFICATION_TYPES.PROPERTY_SELECTED,
    NOTIFICATION_TYPES.PROPERTY_AVAILABLE,
    NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE,
    NOTIFICATION_TYPES.PAYMENT_REMINDER,
    NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    NOTIFICATION_TYPES.PAYMENT_FAILED,
    NOTIFICATION_TYPES.CONTRACT_UPDATE,
    NOTIFICATION_TYPES.CONTRACT_EXPIRING,
    NOTIFICATION_TYPES.SYSTEM,
]);

const IMPORTANT_PRIORITIES = new Set(['high', 'urgent', 'critical']);

const readNotificationPriority = (notification: Pick<Notification, 'data'>) => {
    const priority = notification.data?.priority;
    return typeof priority === 'string' ? priority.trim().toLowerCase() : '';
};

export const isImportantNotification = (
    notification: Pick<Notification, 'type' | 'data'>,
) => IMPORTANT_NOTIFICATION_TYPES.has(notification.type)
    || IMPORTANT_PRIORITIES.has(readNotificationPriority(notification));

export const hasImportantNotification = (
    notifications: ReadonlyArray<Pick<Notification, 'type' | 'data'>>,
) => notifications.some(isImportantNotification);

export const buildNotificationAlertBatch = (
    notifications: ReadonlyArray<Notification>,
    previousUnreadIDs: ReadonlySet<string>,
    visibleLimit = 3,
) => {
    const freshNotifications = notifications.filter(
        (notification) => !notification.is_read && !previousUnreadIDs.has(notification.id),
    );

    return {
        freshNotifications,
        visibleNotifications: freshNotifications.slice(0, visibleLimit),
    };
};

interface NotificationAudio {
    currentTime: number;
    muted: boolean;
    pause: () => void;
    play: () => Promise<void> | void;
    preload: string;
    volume: number;
}

type CreateNotificationAudio = () => NotificationAudio | null;

export const createImportantNotificationSoundController = (
    createAudio: CreateNotificationAudio,
) => {
    let audio: NotificationAudio | null = null;
    let playbackGeneration = 0;

    const getAudio = () => {
        if (audio) {
            return audio;
        }

        audio = createAudio();
        if (audio) {
            audio.preload = 'auto';
            audio.volume = IMPORTANT_NOTIFICATION_SOUND_VOLUME;
        }
        return audio;
    };

    const prime = () => {
        const target = getAudio();
        if (!target) {
            return;
        }

        const generationAtStart = playbackGeneration;
        target.muted = true;

        try {
            void Promise.resolve(target.play())
                .then(() => {
                    if (playbackGeneration === generationAtStart) {
                        target.pause();
                        target.currentTime = 0;
                    }
                    target.muted = false;
                })
                .catch(() => {
                    target.muted = false;
                });
        } catch {
            target.muted = false;
        }
    };

    const play = () => {
        const target = getAudio();
        if (!target) {
            return;
        }

        playbackGeneration += 1;
        target.muted = false;
        target.volume = IMPORTANT_NOTIFICATION_SOUND_VOLUME;
        target.currentTime = 0;

        try {
            void Promise.resolve(target.play()).catch(() => undefined);
        } catch {
            // Notification playback is best-effort and must never break polling.
        }
    };

    return { play, prime };
};

const importantNotificationSoundController = createImportantNotificationSoundController(() => {
    if (typeof window === 'undefined' || typeof window.Audio !== 'function') {
        return null;
    }
    return new window.Audio(IMPORTANT_NOTIFICATION_SOUND_URL);
});

export const primeImportantNotificationSound = () => {
    importantNotificationSoundController.prime();
};

export const playImportantNotificationSound = () => {
    importantNotificationSoundController.play();
};
