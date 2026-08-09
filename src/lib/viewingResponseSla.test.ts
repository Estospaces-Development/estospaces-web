import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import {
    formatViewingResponseCountdown,
    getViewingResponseDeadline,
    getViewingResponseSlaState,
    VIEWING_RESPONSE_WINDOW_SECONDS,
} from './viewingResponseSla';

test('uses the backend deadline when it is available', () => {
    const deadline = getViewingResponseDeadline({
        status: 'pending',
        created_at: '2026-08-09T10:00:00.000Z',
        response_deadline_at: '2026-08-09T10:12:00.000Z',
    });

    assert.equal(deadline, Date.parse('2026-08-09T10:12:00.000Z'));
});

test('derives a stable ten-minute deadline from backend created_at for existing viewings', () => {
    const createdAt = '2026-08-09T10:00:00.000Z';
    const deadline = getViewingResponseDeadline({ status: 'pending', created_at: createdAt });

    assert.equal(deadline, Date.parse(createdAt) + VIEWING_RESPONSE_WINDOW_SECONDS * 1000);
});

test('returns an active ticking state for a fresh pending viewing', () => {
    const state = getViewingResponseSlaState(
        { status: 'pending', created_at: '2026-08-09T10:00:00.000Z' },
        Date.parse('2026-08-09T10:00:30.000Z'),
    );

    assert.equal(state.status, 'active');
    assert.equal(state.secondsRemaining, 570);
    assert.equal(formatViewingResponseCountdown(state.secondsRemaining), '9:30');
});

test('does not leave an expired pending viewing looking like an active response window', () => {
    const state = getViewingResponseSlaState(
        { status: 'pending', created_at: '2026-08-09T10:00:00.000Z' },
        Date.parse('2026-08-09T10:11:00.000Z'),
    );

    assert.equal(state.status, 'expired');
    assert.equal(state.secondsRemaining, 0);
});

test('stops the timer after the manager responds', () => {
    for (const status of ['confirmed', 'rescheduled', 'completed']) {
        assert.equal(
            getViewingResponseSlaState({ status, created_at: '2026-08-09T10:00:00.000Z' }).status,
            'responded',
        );
    }
});

test('reports a cancelled viewing without an active timer', () => {
    const state = getViewingResponseSlaState({
        status: 'cancelled',
        created_at: '2026-08-09T10:00:00.000Z',
    });

    assert.equal(state.status, 'cancelled');
    assert.equal(state.secondsRemaining, 0);
});

test('does not invent a deadline when backend timing data is missing or malformed', () => {
    for (const viewing of [
        { status: 'pending' },
        { status: 'pending', created_at: 'not-a-timestamp' },
        { status: 'unknown', created_at: '2026-08-09T10:00:00.000Z' },
    ]) {
        assert.equal(getViewingResponseSlaState(viewing).status, 'unavailable');
    }
});

test('uses a non-live timer and cleans up the ticking interval', () => {
    const component = readFileSync(
        join(process.cwd(), 'src/components/viewings/ViewingResponseCountdown.tsx'),
        'utf8',
    );

    assert.doesNotMatch(component, /aria-live=/);
    assert.match(component, /window\.clearInterval\(timer\)/);
});

test('renders the shared countdown in both user and manager viewing journeys', () => {
    const userPage = readFileSync(
        join(process.cwd(), 'src/pages/user/dashboard/viewings/page.tsx'),
        'utf8',
    );
    const managerPage = readFileSync(
        join(process.cwd(), 'src/pages/manager/appointments/page.tsx'),
        'utf8',
    );

    assert.match(userPage, /<ViewingResponseCountdown viewing=\{viewing\} \/>/);
    assert.match(managerPage, /<ViewingResponseCountdown viewing=\{appointment\} \/>/);
});
