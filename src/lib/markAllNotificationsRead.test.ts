import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../contexts/NotificationsContext.tsx', import.meta.url), 'utf8');

test('Mark all as read clears unread state before the API call and reloads on failure (web-app#433)', () => {
    const body = source.match(/const markAllAsRead = useCallback\(async \(\) => \{([\s\S]*?)\n {4}\}, \[/)?.[1] ?? '';
    assert.ok(body, 'markAllAsRead not found');
    const apiCall = body.indexOf('notificationsService.markAllRead()');
    assert.ok(apiCall > 0);
    assert.ok(body.indexOf('setUnreadCount(0)') > -1 && body.indexOf('setUnreadCount(0)') < apiCall);
    assert.ok(body.indexOf('setNotifications(') > -1 && body.indexOf('setNotifications(') < apiCall);
    assert.match(body.slice(apiCall), /catch \{[\s\S]*loadNotifications\(true\)/);
});
