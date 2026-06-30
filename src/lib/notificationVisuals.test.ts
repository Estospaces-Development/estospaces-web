import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationIconColorClass, getNotificationSurfaceClass, getNotificationTone } from './notificationVisuals';
import { NOTIFICATION_TYPES, type Notification } from '@/services/notificationsService';

const notification = (type: string, data: Notification['data'] = null): Pick<Notification, 'type' | 'data'> => ({
    type,
    data,
});

test('notification visuals classify urgent failure states as red', () => {
    [
        NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
        NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED,
        NOTIFICATION_TYPES.PAYMENT_FAILED,
        NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE,
    ].forEach((type) => {
        const item = notification(type);
        assert.equal(getNotificationTone(item), 'red');
        assert.match(getNotificationIconColorClass(item), /text-red/);
        assert.match(getNotificationSurfaceClass(item), /bg-red/);
    });
});

test('notification visuals keep success, message, viewing, and application families distinct', () => {
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.DOCUMENT_VERIFIED)), 'emerald');
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.MESSAGE_RECEIVED)), 'green');
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.VIEWING_BOOKED)), 'blue');
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.APPLICATION_UPDATE)), 'purple');
});

test('notification visuals keep fast-track and property workflow notifications orange', () => {
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.FAST_TRACK_UPDATED)), 'orange');
    assert.equal(getNotificationTone(notification(NOTIFICATION_TYPES.SYSTEM, {
        entity: 'property_review_submission',
    })), 'orange');
});

test('notification bordered surface includes the matching border color', () => {
    const item = notification(NOTIFICATION_TYPES.PAYMENT_FAILED);
    assert.match(getNotificationSurfaceClass(item, true), /border-red/);
});
