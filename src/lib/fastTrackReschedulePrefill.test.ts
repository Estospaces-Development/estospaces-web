import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatFastTrackDocumentRequestInputValue } from '@/lib/fastTrackWorkspace';

const workspaceSource = readFileSync(new URL('../components/fast-track/FastTrackWorkspace.tsx', import.meta.url), 'utf8');

const withTimeZone = (timeZone: string, run: () => void) => {
    const previous = process.env.TZ;
    process.env.TZ = timeZone;
    try {
        run();
    } finally {
        if (previous === undefined) {
            delete process.env.TZ;
        } else {
            process.env.TZ = previous;
        }
    }
};

const prefill = (scheduledAt: string) => {
    const value = formatFastTrackDocumentRequestInputValue(scheduledAt);
    return { date: value.slice(0, 10), time: value.slice(11, 16) };
};

test('reschedule prefill uses the local clock of the current slot', () => {
    withTimeZone('Asia/Kolkata', () => {
        assert.deepEqual(prefill('2026-07-30T06:30:00Z'), { date: '2026-07-30', time: '12:00' });
        assert.deepEqual(prefill('2026-07-30T19:00:00Z'), { date: '2026-07-31', time: '00:30' });
    });
    withTimeZone('Europe/London', () => {
        assert.deepEqual(prefill('2026-07-30T06:30:00Z'), { date: '2026-07-30', time: '07:30' });
        assert.deepEqual(prefill('2026-10-25T00:30:00Z'), { date: '2026-10-25', time: '01:30' });
        assert.deepEqual(prefill('2026-10-25T01:30:00Z'), { date: '2026-10-25', time: '01:30' });
    });
    assert.deepEqual(prefill(''), { date: '', time: '' });
});

test('an unchanged local prefill submits the same instant', () => {
    withTimeZone('Asia/Kolkata', () => {
        const { date, time } = prefill('2026-07-30T06:30:00Z');
        assert.equal(new Date(`${date}T${time}:00`).toISOString(), '2026-07-30T06:30:00.000Z');
    });
    withTimeZone('Europe/London', () => {
        const { date, time } = prefill('2026-12-01T09:00:00Z');
        assert.equal(new Date(`${date}T${time}:00`).toISOString(), '2026-12-01T09:00:00.000Z');
    });
});

test('workspace reschedule form no longer slices the UTC ISO string', () => {
    assert.match(workspaceSource, /setViewingDate\(formatFastTrackDocumentRequestInputValue\(selectedCase\.viewing\.scheduledAt\)\.slice\(0, 10\)\)/);
    assert.match(workspaceSource, /setViewingTime\(formatFastTrackDocumentRequestInputValue\(selectedCase\.viewing\.scheduledAt\)\.slice\(11, 16\)\)/);
    assert.doesNotMatch(workspaceSource, /selectedCase\.viewing\.scheduledAt\.slice\(11, 16\)/);
});
