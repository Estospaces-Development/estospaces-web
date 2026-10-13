// Installs DOM globals before react-dom loads; keep this import first.
import { happyDomWindow as browserWindow } from '@/lib/happyDomReactGlobals';

import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

import NotificationsContext from '@/contexts/NotificationsContext';
import ManagerNotificationsPage from '@/pages/manager/notifications/page';
import type { Notification } from '@/services/notificationsService';

const make = (id: string, title: string): Notification => ({
    id,
    user_id: 'manager-1',
    type: 'fast_track_updated',
    title,
    message: `${title} message`,
    data: null,
    is_read: true,
    created_at: '2026-09-27T12:00:00.000Z',
} as unknown as Notification);

test('manager notifications can be deleted one by one or in bulk via the shared context (#740)', async () => {
    const deleted: string[] = [];
    // n-2 and n-3 are identical, so the page shows them as one repeated group.
    const notifications = [make('n-1', 'First'), make('n-2', 'Repeat'), make('n-3', 'Repeat')];
    const value: NonNullable<React.ContextType<typeof NotificationsContext>> = {
        notifications,
        unreadCount: 0,
        loading: false,
        loadError: null,
        fetchNotifications: async () => undefined,
        markAsRead: async () => undefined,
        markAllAsRead: async () => undefined,
        createNotification: async () => null,
        deleteNotification: async (id) => { deleted.push(id); },
    };
    const host = browserWindow.document.createElement('div') as unknown as HTMLElement;
    browserWindow.document.body.append(host as unknown as Parameters<typeof browserWindow.document.body.append>[0]);
    const root = createRoot(host);
    const byLabel = (label: string) => host.querySelector(`[aria-label="${label}"]`) as HTMLElement | null;

    try {
        act(() => root.render(
            <MemoryRouter initialEntries={['/manager/notifications']}>
                <NotificationsContext.Provider value={value}>
                    <ManagerNotificationsPage />
                </NotificationsContext.Provider>
            </MemoryRouter>,
        ));

        const single = byLabel('Delete notification: First');
        assert.ok(single, 'each row has a labelled delete button');
        assert.match(single.className, /min-h-11/);
        assert.match(single.className, /min-w-11/);
        act(() => single.click());
        assert.deepEqual(deleted, ['n-1']);

        // Deleting a repeated group removes every notification it stands for.
        deleted.length = 0;
        act(() => byLabel('Delete notification: Repeat')?.click());
        assert.deepEqual(deleted, ['n-2', 'n-3']);

        // Bulk: select two rows, then delete selected.
        deleted.length = 0;
        act(() => byLabel('Select notification: First')?.click());
        act(() => byLabel('Select notification: Repeat')?.click());
        const bulk = Array.from(host.querySelectorAll('button')).find((b) => /^\s*Delete\s*$/.test(b.textContent || ''));
        assert.ok(bulk, 'bulk delete shows once rows are selected');
        assert.match(host.textContent || '', /2 selected/);
        act(() => bulk.click());
        assert.deepEqual(deleted.sort(), ['n-1', 'n-2', 'n-3']);
    } finally {
        act(() => root.unmount());
        host.remove();
    }
});
