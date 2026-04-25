import test from 'node:test';
import assert from 'node:assert/strict';

import { getNotificationToastDedupeKey, shouldPersistNotificationToastDedupeKey } from './notificationToastDedupe';
import { NOTIFICATION_TYPES, type Notification } from '@/services/notificationsService';

const baseNotification = (overrides: Partial<Notification>): Notification => ({
    id: 'notification-1',
    user_id: 'user-1',
    type: NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
    title: 'Fast-track completed',
    message: 'Fast-track complete for QA FT RENT MANAGER 1776195290719.',
    data: { fast_track_id: 'case-1' },
    is_read: false,
    channel: 'in_app',
    created_at: '2026-04-25T00:00:00Z',
    ...overrides,
});

test('fast-track completion toast keys dedupe by case id instead of notification id', () => {
    const first = baseNotification({ id: 'notification-1' });
    const duplicate = baseNotification({ id: 'notification-2' });

    assert.equal(getNotificationToastDedupeKey(first), getNotificationToastDedupeKey(duplicate));
});

test('ordinary notification toast keys keep notification ids', () => {
    const first = baseNotification({
        id: 'message-1',
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        data: { conversation_id: 'conversation-1' },
    });
    const second = baseNotification({
        id: 'message-2',
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
        data: { conversation_id: 'conversation-1' },
    });

    assert.notEqual(getNotificationToastDedupeKey(first), getNotificationToastDedupeKey(second));
});

test('only terminal fast-track completion toast keys are persisted', () => {
    assert.equal(shouldPersistNotificationToastDedupeKey(baseNotification({})), true);
    assert.equal(shouldPersistNotificationToastDedupeKey(baseNotification({ type: NOTIFICATION_TYPES.FAST_TRACK_UPDATED })), false);
});
