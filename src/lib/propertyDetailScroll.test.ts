import assert from 'node:assert/strict';
import test from 'node:test';

import {
    resetPropertyDetailScroll,
    shouldResetPropertyDetailScroll,
} from './propertyDetailScroll';

test('resets ordinary routes but preserves fragment navigation', () => {
    assert.equal(shouldResetPropertyDetailScroll(''), true);
    assert.equal(shouldResetPropertyDetailScroll('   '), true);
    assert.equal(shouldResetPropertyDetailScroll('#property-reviews-heading'), false);
});

test('resets immediately and again after layout settles', () => {
    const calls: ScrollToOptions[] = [];
    let callback: FrameRequestCallback | undefined;

    const cleanup = resetPropertyDetailScroll({
        scrollTo: (options) => calls.push(options),
        requestAnimationFrame: (next) => {
            callback = next;
            return 17;
        },
        cancelAnimationFrame: () => undefined,
    });

    assert.deepEqual(calls, [{ top: 0, left: 0, behavior: 'auto' }]);

    callback?.(0);
    assert.deepEqual(calls, [
        { top: 0, left: 0, behavior: 'auto' },
        { top: 0, left: 0, behavior: 'auto' },
    ]);

    cleanup();
});

test('cancels the scheduled reset when the route changes first', () => {
    let cancelledFrame = 0;

    const cleanup = resetPropertyDetailScroll({
        scrollTo: () => undefined,
        requestAnimationFrame: () => 23,
        cancelAnimationFrame: (handle) => {
            cancelledFrame = handle;
        },
    });

    cleanup();
    assert.equal(cancelledFrame, 23);
});
