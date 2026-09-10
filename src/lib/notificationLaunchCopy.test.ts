import test from 'node:test';
import assert from 'node:assert/strict';

import { getLaunchSafeNotificationCopy } from '@/lib/notificationLaunchCopy';

const propertyNotification = {
    type: 'system',
    title: 'Property approved and published',
    data: { entity: 'property_status_update' },
};

test('legacy property notifications format only an all-lowercase actor name', () => {
    const message = 'srini tester approved and published "Launch E2E Chennai 20260824".';
    const notification = { ...propertyNotification, message };
    assert.equal(getLaunchSafeNotificationCopy(notification).message,
        'Srini Tester approved and published "Launch E2E Chennai 20260824".');
    assert.equal(notification.message, message, 'stored source copy must not be mutated');
});

test('property actor display preserves deliberate casing, email fallbacks and the quoted content', () => {
    for (const actor of ['SRINI Agency', 'iPhone Owner', 'Anne-Marie O’Neill', 'admin@example.com']) {
        const message = `${actor} approved and published "lowercase title".`;
        assert.equal(getLaunchSafeNotificationCopy({ ...propertyNotification, message }).message, message);
    }
    const message = 'anne-marie o\'neill rejected "lowercase title". Reason: keep THIS unchanged.';
    assert.equal(getLaunchSafeNotificationCopy({ ...propertyNotification, title: 'Property rejected', message }).message,
        'Anne-Marie O\'Neill rejected "lowercase title". Reason: keep THIS unchanged.');
});

test('unrecognized notification templates are not rewritten', () => {
    const message = 'srini tester approved and published "Home".';
    for (const notification of [
        { ...propertyNotification, type: 'message_received', message },
        { ...propertyNotification, data: { entity: 'support_ticket' }, message },
        { ...propertyNotification, data: null, message },
        { ...propertyNotification, title: 'Personal message', message },
        { ...propertyNotification, message: 'srini tester wrote a note about approval.' },
    ]) {
        assert.equal(getLaunchSafeNotificationCopy(notification).message, notification.message);
    }
});

test('payment notifications hide inactive finance workspace copy while payments are disabled', () => {
    const copy = getLaunchSafeNotificationCopy({
        type: 'payment_received',
        title: 'Payment received',
        message: 'A deposit payment cleared and invoice INV-1 is ready.',
    });

    assert.equal(copy.title, 'Contract milestone updated');
    assert.equal(copy.message, 'A contract milestone was updated. Open contracts for the latest status.');
    assert.doesNotMatch(`${copy.title} ${copy.message}`, /payment|invoice|billing/i);
});

test('non-payment notifications keep their original display copy', () => {
    const copy = getLaunchSafeNotificationCopy({
        type: 'application_submitted',
        title: 'Application submitted',
        message: 'A renter submitted an application.',
    });

    assert.deepEqual(copy, {
        title: 'Application submitted',
        message: 'A renter submitted an application.',
    });
});
