import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatNotificationDateTime } from '@/lib/notificationTime';

const notificationsService = readFileSync(new URL('../services/notificationsService.ts', import.meta.url), 'utf8');

test('notification times render in the India zone with a zone label', () => {
    assert.equal(formatNotificationDateTime('2026-10-01T05:00:00Z', 'Asia/Kolkata'), '01 Oct 2026 at 10:30 GMT+5:30');
    assert.equal(formatNotificationDateTime('2026-10-01T19:00:00Z', 'Asia/Kolkata'), '02 Oct 2026 at 00:30 GMT+5:30');
});

test('notification times follow UK daylight saving at both boundaries', () => {
    assert.equal(formatNotificationDateTime('2026-10-01T09:00:00Z', 'Europe/London'), '01 Oct 2026 at 10:00 BST');
    assert.equal(formatNotificationDateTime('2026-10-25T00:30:00Z', 'Europe/London'), '25 Oct 2026 at 01:30 BST');
    assert.equal(formatNotificationDateTime('2026-10-25T01:30:00Z', 'Europe/London'), '25 Oct 2026 at 01:30 GMT');
    assert.equal(formatNotificationDateTime('2026-03-29T00:30:00Z', 'Europe/London'), '29 Mar 2026 at 00:30 GMT');
    assert.equal(formatNotificationDateTime('2026-03-29T01:30:00Z', 'Europe/London'), '29 Mar 2026 at 02:30 BST');
});

test('notification time formatting leaves unparseable values unchanged', () => {
    assert.equal(formatNotificationDateTime('next Tuesday'), 'next Tuesday');
    assert.equal(formatNotificationDateTime(''), '');
});

test('user cancellation alert formats the slot instead of printing the raw ISO instant', () => {
    assert.match(notificationsService, /on \$\{formatNotificationDateTime\(date\)\} has been cancelled/);
    assert.doesNotMatch(notificationsService, /on \$\{date\} has been cancelled/);
});
