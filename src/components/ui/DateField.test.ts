import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDateFieldPopoverPlacement } from './DateField';

test('places the calendar below its trigger when there is room', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 120, right: 520, bottom: 172, left: 200 },
        { width: 320, height: 400 },
        { width: 1280, height: 900 },
        'left',
    );

    assert.deepEqual(placement, {
        top: 184,
        left: 200,
        width: 320,
        placement: 'below',
    });
});

test('places the calendar above a lower-page trigger instead of clipping it', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 650, right: 700, bottom: 702, left: 380 },
        { width: 320, height: 400 },
        { width: 1280, height: 900 },
        'left',
    );

    assert.deepEqual(placement, {
        top: 238,
        left: 380,
        width: 320,
        placement: 'above',
    });
});

test('keeps the calendar inside narrow viewports', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 100, right: 350, bottom: 152, left: 300 },
        { width: 320, height: 400 },
        { width: 360, height: 760 },
        'right',
    );

    assert.deepEqual(placement, {
        top: 164,
        left: 24,
        width: 320,
        placement: 'below',
    });
});
