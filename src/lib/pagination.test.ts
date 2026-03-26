import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaginationRange, getVisiblePageTokens } from './pagination';

test('getVisiblePageTokens keeps compact leading pages readable', () => {
    assert.deepEqual(getVisiblePageTokens(2, 10), [1, 2, 3, 4, 5, 'ellipsis', 10]);
});

test('getVisiblePageTokens keeps middle pages centered', () => {
    assert.deepEqual(getVisiblePageTokens(6, 10), [1, 'ellipsis', 5, 6, 7, 'ellipsis', 10]);
});

test('getVisiblePageTokens expands small page counts without ellipsis', () => {
    assert.deepEqual(getVisiblePageTokens(3, 5), [1, 2, 3, 4, 5]);
});

test('getPaginationRange returns the rendered item range', () => {
    assert.deepEqual(getPaginationRange(3, 12, 38, 12), { start: 25, end: 36 });
});

test('getPaginationRange handles a short final page', () => {
    assert.deepEqual(getPaginationRange(4, 12, 38, 2), { start: 37, end: 38 });
});

test('getPaginationRange returns null without total context', () => {
    assert.equal(getPaginationRange(1, undefined, 38, 12), null);
});
