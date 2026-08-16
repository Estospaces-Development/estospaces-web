import test from 'node:test';
import assert from 'node:assert/strict';

import { isInternalAdminQANotification } from './notificationsService';

const baseNotification = {
    id: 'notification-1',
    user_id: 'admin-1',
    type: 'fast_track_started',
    title: 'New fast-track case started',
    message: 'A customer started a fast-track case for Chennai Home.',
    data: null,
    is_read: false,
    is_archived: false,
    channel: 'in_app',
    created_at: '2026-08-16T00:00:00Z',
};

test('admin notifications hide raw internal QA property identifiers', () => {
    assert.equal(isInternalAdminQANotification({
        ...baseNotification,
        message: 'Test User started a fast-track case for QA FT Dashboard Workspace 20260701195308.',
    }), true);
    assert.equal(isInternalAdminQANotification({
        ...baseNotification,
        data: { property_title: 'Mobile Live Approval mobile-live-1781121818495034' },
    }), true);
});

test('admin notifications retain normal customer events', () => {
    assert.equal(isInternalAdminQANotification(baseNotification), false);
    assert.equal(isInternalAdminQANotification({
        ...baseNotification,
        title: 'Fast-track issue 1234567890 requires attention',
        message: 'Reference 1234567890 needs an admin response.',
    }), false);
});
