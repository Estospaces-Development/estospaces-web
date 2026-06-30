import test from 'node:test';
import assert from 'node:assert/strict';

import { getLaunchSafeNotificationCopy } from '@/lib/notificationLaunchCopy';

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
