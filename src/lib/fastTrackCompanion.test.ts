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

// QA-MB-20260924-01-003 / QA-MB-20260926-01-010: no confirm without a live scheduled slot.
test('viewing responses require an open viewing-stage case with a scheduled slot', () => {
    const now = Date.parse('2026-09-27T10:00:00.000Z');
    const scheduled = {
        stage: 'viewing' as const,
        workspaceFinalStatus: 'active' as const,
        viewing: { status: 'scheduled', scheduledAt: '2026-10-01T10:30:00.000Z', confirmedByUser: false },
    };
    assert.equal(getFastTrackViewingResponseConflictMessage(scheduled, 'confirm_viewing', now), null);
    assert.equal(getFastTrackViewingResponseConflictMessage(scheduled, 'request_viewing_change', now), null);

    const noSlot = { ...scheduled, viewing: { status: 'pending', confirmedByUser: false } };
    for (const action of ['confirm_viewing', 'request_viewing_change']) {
        assert.match(getFastTrackViewingResponseConflictMessage(noSlot, action, now) || '', /no viewing slot/i);
    }

    // A cancelled appointment resets the server viewing to pending with no slot.
    const cancelledAppointment = { ...scheduled, viewing: { status: 'pending', scheduledAt: '', note: 'Cancelled by user', confirmedByUser: false } };
    assert.match(getFastTrackViewingResponseConflictMessage(cancelledAppointment, 'confirm_viewing', now) || '', /no viewing slot/i);

    const statusWithoutTime = { ...scheduled, viewing: { status: 'scheduled', confirmedByUser: false } };
    assert.match(getFastTrackViewingResponseConflictMessage(statusWithoutTime, 'confirm_viewing', now) || '', /no viewing slot/i);

    assert.match(
        getFastTrackViewingResponseConflictMessage({ ...scheduled, workspaceFinalStatus: 'cancelled' }, 'confirm_viewing', now) || '',
        /closed/i,
    );
    assert.match(
        getFastTrackViewingResponseConflictMessage({ ...scheduled, stage: 'documents' }, 'confirm_viewing', now) || '',
        /not open/i,
    );
    assert.equal(getFastTrackViewingResponseConflictMessage(noSlot, 'upload_document', now), null);
});
