import assert from 'node:assert/strict';
import test from 'node:test';

import { formatConversationTime } from '@/lib/conversationTime';

const localDate = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
) => new Date(year, month - 1, day, hour, minute).toISOString();

test('shows the local time for conversations updated today', () => {
    const now = new Date(2026, 8, 4, 18, 30);

    assert.equal(formatConversationTime(localDate(2026, 9, 4, 5, 7), now), '05:07');
});

test('shows yesterday instead of a misleading time-only label', () => {
    const now = new Date(2026, 8, 4, 18, 30);

    assert.equal(formatConversationTime(localDate(2026, 9, 3, 23, 59), now), 'Yesterday');
});

test('shows the calendar date for older conversations', () => {
    const now = new Date(2026, 8, 4, 18, 30);

    assert.equal(formatConversationTime(localDate(2026, 8, 24, 5, 53), now), '24 Aug');
    assert.equal(formatConversationTime(localDate(2025, 8, 24, 5, 53), now), '24 Aug 2025');
});

test('returns an empty label for missing or invalid timestamps', () => {
    const now = new Date(2026, 8, 4, 18, 30);

    assert.equal(formatConversationTime(undefined, now), '');
    assert.equal(formatConversationTime('not-a-date', now), '');
    assert.equal(formatConversationTime('0001-01-01T00:00:00Z', now), '');
});
