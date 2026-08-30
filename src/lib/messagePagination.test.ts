import assert from 'node:assert/strict';
import test from 'node:test';

import { mergeLatestMessagePage } from './messagePagination';

const message = (id: string, timestamp: string, text: string) => ({ id, timestamp, text });

test('latest polling preserves older pages and replaces refreshed messages', () => {
    const merged = mergeLatestMessagePage(
        [
            message('old-1', '2026-08-30T09:00:00Z', 'older page'),
            message('latest-1', '2026-08-30T10:00:00Z', 'stale content'),
        ],
        [
            message('latest-1', '2026-08-30T10:00:00Z', 'updated content'),
            message('latest-2', '2026-08-30T10:01:00Z', 'new message'),
        ],
    );

    assert.deepEqual(merged.map((item) => item.id), ['old-1', 'latest-1', 'latest-2']);
    assert.equal(merged[1].text, 'updated content');
});
