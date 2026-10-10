import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { getLocalTodayInputValue, toLocalScheduledAt } from './localScheduledAt';

test('a local time inside a daylight-saving gap is refused, not shifted an hour (MB-0452)', () => {
    const originalTimeZone = process.env.TZ;
    process.env.TZ = 'Europe/London';
    try {
        // 01:00-02:00 does not exist in the UK on 28 Mar 2027; new Date() silently turned 01:30 into 02:30 BST.
        assert.deepEqual(toLocalScheduledAt('2027-03-28', '01:30'), {
            error: '01:30 does not exist on 28 Mar 2027 because the clocks go forward. Choose another time.',
        });
        assert.deepEqual(toLocalScheduledAt('2027-03-28', '02:30'), { scheduledAt: '2027-03-28T01:30:00.000Z' });
        assert.deepEqual(toLocalScheduledAt('2026-11-13', '09:45'), { scheduledAt: '2026-11-13T09:45:00.000Z' });
        // The repeated autumn hour exists, so it is kept (as the first, BST, occurrence).
        assert.deepEqual(toLocalScheduledAt('2026-10-25', '01:45'), { scheduledAt: '2026-10-25T00:45:00.000Z' });
        assert.deepEqual(toLocalScheduledAt('2027-02-30', '10:00'), { error: 'Choose a valid date and time.' });
        assert.deepEqual(toLocalScheduledAt('', ''), { error: 'Choose a valid date and time.' });
    } finally {
        if (originalTimeZone === undefined) delete process.env.TZ;
        else process.env.TZ = originalTimeZone;
    }
});

test('both Fast Track viewing forms build scheduled_at through the DST check (MB-0452)', () => {
    for (const file of ['FastTrackWorkspace.tsx', 'FastTrackCompanionPanel.tsx']) {
        const source = readFileSync(new URL(`../components/fast-track/${file}`, import.meta.url), 'utf8');
        assert.match(source, /toLocalScheduledAt\(viewingDate, viewingTime\)/, file);
        assert.doesNotMatch(source, /new Date\(`\$\{viewingDate\}T/, file);
    }
});

test('getLocalTodayInputValue returns the local calendar day, not the UTC day', () => {
    assert.equal(getLocalTodayInputValue(new Date(2026, 9, 5, 0, 30)), '2026-10-05');
    assert.equal(getLocalTodayInputValue(new Date(2026, 0, 31, 23, 59)), '2026-01-31');
});

test('manager reschedule and Fast Track viewing date pickers disable past days', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const path of [
        '../pages/manager/appointments/page.tsx',
        '../components/fast-track/FastTrackWorkspace.tsx',
        '../components/fast-track/FastTrackCompanionPanel.tsx',
    ]) {
        assert.match(read(path), /min=\{getLocalTodayInputValue\(\)\}/, path);
    }
});
