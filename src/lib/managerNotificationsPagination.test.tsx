import test from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';

import NotificationsContext from '@/contexts/NotificationsContext';
import ManagerNotificationsPage from '@/pages/manager/notifications/page';
import type { Notification } from '@/services/notificationsService';

type NotificationsContextValue = NonNullable<React.ContextType<typeof NotificationsContext>>;

const buildNotifications = (count: number): Notification[] => Array.from({ length: count }, (_, index) => ({
    id: `notification-${index + 1}`,
    user_id: 'manager-1',
    type: 'fast_track_updated',
    title: `Case update ${index + 1}`,
    message: `Update message ${index + 1}`,
    data: { fast_track_id: `case-${index + 1}` },
    is_read: index % 2 === 0,
    created_at: new Date(Date.UTC(2026, 8, 27, 12, 0, 0) - index * 60_000).toISOString(),
} as unknown as Notification));

const renderPage = (notifications: Notification[]) => {
    const browserWindow = new Window({ url: 'https://estospaces.test/manager/notifications' });
    const globals = globalThis as typeof globalThis & Record<string, unknown>;
    const globalKeys = ['window', 'document', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const previousDescriptors = new Map(
        globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
    );
    Object.entries({
        window: browserWindow,
        document: browserWindow.document,
        HTMLElement: browserWindow.HTMLElement,
        Node: browserWindow.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
    }).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    const value: NotificationsContextValue = {
        notifications,
        unreadCount: notifications.filter((item) => !item.is_read).length,
        loading: false,
        loadError: null,
        fetchNotifications: async () => undefined,
        markAsRead: async () => undefined,
        markAllAsRead: async () => undefined,
        createNotification: async () => null,
        deleteNotification: () => undefined,
    };

    act(() => root.render(
        <MemoryRouter initialEntries={['/manager/notifications']}>
            <NotificationsContext.Provider value={value}>
                <ManagerNotificationsPage />
            </NotificationsContext.Provider>
        </MemoryRouter>,
    ));

    const cleanup = () => {
        act(() => root.unmount());
        browserWindow.close();
        previousDescriptors.forEach((descriptor, key) => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globals[key];
        });
    };

    return { host: host as unknown as HTMLElement, cleanup };
};

const headings = (host: Element) => Array.from(host.querySelectorAll('h2')).map((item) => item.textContent?.trim() || '');
const loadMoreButton = (host: Element) => Array.from(host.querySelectorAll('button')).find(
    (button) => /Load more notifications/.test(button.textContent || ''),
);

test('manager notification history is bounded and loads older items on request', () => {
    const { host, cleanup } = renderPage(buildNotifications(60));
    try {
        assert.equal(headings(host).length, 25);
        assert.equal(headings(host)[0], 'Case update 1');
        let button = loadMoreButton(host);
        assert.ok(button, 'load more control should render when history exceeds one page');
        assert.match(button.textContent || '', /\(25 of 60\)/);
        assert.equal(button.getAttribute('type'), 'button');

        act(() => button?.click());
        assert.equal(headings(host).length, 50);
        button = loadMoreButton(host);
        assert.match(button?.textContent || '', /\(50 of 60\)/);

        act(() => button?.click());
        const allHeadings = headings(host);
        assert.equal(allHeadings.length, 60);
        assert.equal(new Set(allHeadings).size, 60, 'no notification should repeat across pages');
        assert.equal(allHeadings[59], 'Case update 60');
        assert.equal(loadMoreButton(host), undefined);
    } finally {
        cleanup();
    }
});

test('manager notification filters reset the visible page', () => {
    const { host, cleanup } = renderPage(buildNotifications(60));
    try {
        act(() => loadMoreButton(host)?.click());
        assert.equal(headings(host).length, 50);

        const unreadFilter = Array.from(host.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'unread');
        assert.ok(unreadFilter, 'unread filter should render');
        act(() => unreadFilter.click());
        assert.equal(headings(host).length, 25);
        assert.match(loadMoreButton(host)?.textContent || '', /\(25 of 30\)/);
    } finally {
        cleanup();
    }
});

test('short manager histories show every item without a load more control', () => {
    const { host, cleanup } = renderPage(buildNotifications(5));
    try {
        assert.equal(headings(host).length, 5);
        assert.equal(loadMoreButton(host), undefined);
    } finally {
        cleanup();
    }
});
