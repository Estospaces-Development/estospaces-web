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

const buildNotifications = (count: number): Notification[] => Array.from({ length: count }, (_, index) => ({
    id: `notification-${index + 1}`,
    user_id: 'manager-1',
    type: 'fast_track_updated',
    title: `Case update ${index + 1}`,
    message: `Update message ${index + 1}`,
    data: { fast_track_id: `case-${index + 1}` },
    is_read: false,
    created_at: new Date(Date.UTC(2026, 8, 27, 12, 0, 0) - index * 60_000).toISOString(),
} as unknown as Notification));

test('manager notification search resets the visible page', async () => {
    const notifications = buildNotifications(60);
    const value: NonNullable<React.ContextType<typeof NotificationsContext>> = {
        notifications,
        unreadCount: notifications.length,
        loading: false,
        fetchNotifications: async () => undefined,
        markAsRead: async () => undefined,
        markAllAsRead: async () => undefined,
        createNotification: async () => null,
        deleteNotification: () => undefined,
    };

    const host = browserWindow.document.createElement('div') as unknown as HTMLElement;
    browserWindow.document.body.append(host as unknown as Parameters<typeof browserWindow.document.body.append>[0]);
    const root = createRoot(host);
    const headings = () => Array.from(host.querySelectorAll('h2')).map((item) => item.textContent?.trim() || '');
    const loadMoreButton = () => Array.from(host.querySelectorAll('button')).find(
        (button) => /Load more notifications/.test(button.textContent || ''),
    );
    const typeSearch = (text: string) => {
        const input = host.querySelector('input[placeholder="Search notifications..."]') as HTMLInputElement | null;
        assert.ok(input, 'search input should render');
        // React tracks the node's own value property, so set it through the
        // prototype setter for the input event to register as a change.
        const setValue = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')?.set;
        assert.ok(setValue, 'input value setter should exist');
        act(() => {
            setValue.call(input, text);
            input.dispatchEvent(new browserWindow.Event('input', { bubbles: true }) as unknown as Event);
        });
    };

    try {
        act(() => root.render(
            <MemoryRouter initialEntries={['/manager/notifications']}>
                <NotificationsContext.Provider value={value}>
                    <ManagerNotificationsPage />
                </NotificationsContext.Provider>
            </MemoryRouter>,
        ));

        act(() => loadMoreButton()?.click());
        act(() => loadMoreButton()?.click());
        assert.equal(headings().length, 60);

        typeSearch('case update');
        assert.equal(headings().length, 25);
        assert.match(loadMoreButton()?.textContent || '', /\(25 of 60\)/);

        typeSearch('update 1');
        const matches = headings();
        assert.equal(matches.length, 11);
        assert.ok(matches.every((title) => /^Case update 1\d?$/.test(title)), `unexpected matches: ${matches.join(', ')}`);
        assert.equal(loadMoreButton(), undefined);

        typeSearch('');
        assert.equal(headings().length, 25);
        assert.match(loadMoreButton()?.textContent || '', /\(25 of 60\)/);
    } finally {
        act(() => root.unmount());
        await browserWindow.happyDOM.close();
    }
});
