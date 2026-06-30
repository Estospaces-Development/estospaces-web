import test from 'node:test';
import assert from 'node:assert/strict';

import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';

test('duplicate-safe key resolver keeps unique ids and suffixes duplicates', () => {
    const keyFor = createDuplicateSafeKeyResolver('support-ticket');

    assert.equal(keyFor('qa-missing-linked-record', 0), 'qa-missing-linked-record');
    assert.equal(keyFor('qa-missing-linked-record', 1), 'qa-missing-linked-record-2-1');
    assert.equal(keyFor('ticket-2', 2), 'ticket-2');
});

test('duplicate-safe key resolver creates deterministic fallbacks for missing ids', () => {
    const keyFor = createDuplicateSafeKeyResolver('support-message');

    assert.equal(keyFor('', 0), 'support-message-0');
    assert.equal(keyFor(undefined, 1), 'support-message-1');
    assert.equal(keyFor(null, 2), 'support-message-2');
});
