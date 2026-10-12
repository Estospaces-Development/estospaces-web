import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deleteNotification, restoreNotification } from '../services/notificationsService';

const contextSource = readFileSync(new URL('../contexts/NotificationsContext.tsx', import.meta.url), 'utf8');

const makeNotification = (id: string, createdAt: string) => ({
    id,
    user_id: 'user-1',
    type: 'manager_verification_submitted',
    title: 'Manager verification profile submitted',
    message: 'Submitted',
    data: null,
    is_read: false,
    is_archived: false,
    channel: 'in_app',
    created_at: createdAt,
});

test('#725 deleting a notification calls DELETE on the notification-service, not mark-read', async () => {
    const realFetch = globalThis.fetch;
    const calls: Array<{ url: string; method?: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), method: init?.method });
        return new Response(JSON.stringify({ success: true, data: { message: 'Deleted' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }) as typeof fetch;
    try {
        await deleteNotification('0b8f6d5e-1111-4222-8333-444455556666');
        await deleteNotification('local-123');
    } finally {
        globalThis.fetch = realFetch;
    }
    assert.equal(calls.length, 1, 'local-* rows never reach the server');
    assert.equal(calls[0].method, 'DELETE');
    assert.match(calls[0].url, /\/api\/v1\/notifications\/0b8f6d5e-1111-4222-8333-444455556666$/);
});

test('#725 a failed delete rejects so the context can restore the row', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ success: false, error: 'nope' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
    try {
        await assert.rejects(deleteNotification('0b8f6d5e-1111-4222-8333-444455556666'));
    } finally {
        globalThis.fetch = realFetch;
    }
});

// Already deleted (another tab): the server's 404 is what the user asked for, so no error and no restore.
test('#725 a delete that finds the notification already gone succeeds', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify({ success: false, error: 'Notification not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
    try {
        await deleteNotification('0b8f6d5e-1111-4222-8333-444455556666');
    } finally {
        globalThis.fetch = realFetch;
    }
});

test('#725 restoreNotification re-inserts newest-first and never duplicates', () => {
    const newest = makeNotification('a', '2026-09-03T10:00:00Z');
    const middle = makeNotification('b', '2026-09-02T10:00:00Z');
    const oldest = makeNotification('c', '2026-09-01T10:00:00Z');
    assert.deepEqual(restoreNotification([newest, oldest], middle).map((n) => n.id), ['a', 'b', 'c']);
    assert.deepEqual(restoreNotification([newest, middle], middle).map((n) => n.id), ['a', 'b']);
});

test('#725 context removes optimistically, ignores in-flight polls, and restores with an error toast on failure', () => {
    const body = contextSource.match(/const deleteNotification = useCallback\(async \(notificationId: string\) => \{([\s\S]*?)\n {4}\}, \[/)?.[1] ?? '';
    assert.ok(body, 'deleteNotification not found');
    const apiCall = body.indexOf('notificationsService.deleteNotification(notificationId)');
    assert.ok(apiCall > 0);
    assert.ok(body.indexOf('setNotifications(') > -1 && body.indexOf('setNotifications(') < apiCall);
    assert.match(body.slice(apiCall), /catch \{[\s\S]*restoreNotification[\s\S]*toast\.error\(/);
    assert.match(contextSource, /\.filter\(\(notification\) => !deletedNotificationIDsRef\.current\.has\(notification\.id\)\)/);
});
