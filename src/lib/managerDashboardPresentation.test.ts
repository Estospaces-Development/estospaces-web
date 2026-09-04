import assert from 'node:assert/strict';
import test from 'node:test';

import {
    formatManagerActivityDateTime,
    formatManagerDashboardCount,
    shouldOpenManagerMapFiltersByDefault,
} from './managerDashboardPresentation';

test('formats manager dashboard counts with locale grouping', () => {
    assert.equal(formatManagerDashboardCount(2220, 'en-GB'), '2,220');
    assert.equal(formatManagerDashboardCount(1, 'en-GB'), '1');
});

test('shows enough activity timestamp precision to distinguish separate updates', () => {
    const firstUpdate = formatManagerActivityDateTime(
        new Date('2026-09-04T14:05:00.000Z'),
        'en-GB',
        'UTC',
    );
    const secondUpdate = formatManagerActivityDateTime(
        new Date('2026-09-04T14:12:00.000Z'),
        'en-GB',
        'UTC',
    );

    assert.match(firstUpdate, /4 Sept 2026/);
    assert.match(firstUpdate, /14:05/);
    assert.match(secondUpdate, /14:12/);
    assert.notEqual(firstUpdate, secondUpdate);
});

test('keeps the activity feed usable when an API timestamp is malformed', () => {
    assert.equal(formatManagerActivityDateTime(new Date('not-a-date'), 'en-GB', 'UTC'), 'Time unavailable');
});

test('keeps map filters collapsed on phones without changing the desktop default', () => {
    assert.equal(shouldOpenManagerMapFiltersByDefault(283), false);
    assert.equal(shouldOpenManagerMapFiltersByDefault(639), false);
    assert.equal(shouldOpenManagerMapFiltersByDefault(640), true);
    assert.equal(shouldOpenManagerMapFiltersByDefault(1440), true);
});
