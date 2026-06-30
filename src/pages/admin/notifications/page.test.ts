import test from 'node:test';
import assert from 'node:assert/strict';

import {
    filterAdminNotifications,
    normalizeAdminNotificationSearch,
    type AdminNotificationFilterType,
} from './page';

const notifications = [
    {
        id: 'verification',
        title: 'Verification submitted',
        message: 'A manager uploaded new verification documents.',
        type: 'user_verification_submitted',
        is_read: false,
        created_at: '2026-04-20T10:00:00Z',
    },
    {
        id: 'payment',
        title: 'Payment received',
        message: 'A deposit payment cleared.',
        type: 'payment_received',
        is_read: true,
        created_at: '2026-04-20T09:00:00Z',
    },
] as any;

test('admin notification search trims whitespace and normalizes casing', () => {
    assert.equal(normalizeAdminNotificationSearch('   VERIFICATION   '), 'verification');
    assert.deepEqual(
        filterAdminNotifications(notifications, 'all' as AdminNotificationFilterType, '   VERIFICATION   ').map((notification: any) => notification.id),
        ['verification'],
    );
});

test('admin notification filters still combine with normalized search', () => {
    assert.deepEqual(
        filterAdminNotifications(notifications, 'unread' as AdminNotificationFilterType, 'documents').map((notification: any) => notification.id),
        ['verification'],
    );
    assert.deepEqual(
        filterAdminNotifications(notifications, 'read' as AdminNotificationFilterType, 'documents').map((notification: any) => notification.id),
        [],
    );
});
