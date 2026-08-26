import assert from 'node:assert/strict';
import test from 'node:test';

import { getFastTrackViewingResponseConflictMessage } from './fastTrackCompanion';

test('past viewing slots cannot be confirmed', () => {
    const viewing = {
        status: 'scheduled',
        scheduledAt: '2026-08-21T09:00:00.000Z',
        confirmedByUser: false,
    };

    assert.match(
        getFastTrackViewingResponseConflictMessage({ viewing }, 'confirm_viewing', Date.parse('2026-08-21T10:44:00.000Z')) || '',
        /has passed/i,
    );
    assert.equal(
        getFastTrackViewingResponseConflictMessage({ viewing }, 'confirm_viewing', Date.parse('2026-08-21T08:44:00.000Z')),
        null,
    );
});
