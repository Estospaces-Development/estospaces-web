import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaginationNavigationState, getPaginationRange, getVisiblePageTokens, paginateItems } from './pagination';

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

test('getPaginationNavigationState exposes first and last page affordance state', () => {
    assert.deepEqual(getPaginationNavigationState(3, 5), {
        safeCurrentPage: 3,
        firstPage: 1,
        previousPage: 2,
        nextPage: 4,
        lastPage: 5,
        canGoFirst: true,
        canGoPrevious: true,
        canGoNext: true,
        canGoLast: true,
    });

    assert.deepEqual(getPaginationNavigationState(1, 5), {
        safeCurrentPage: 1,
        firstPage: 1,
        previousPage: 1,
        nextPage: 2,
        lastPage: 5,
        canGoFirst: false,
        canGoPrevious: false,
        canGoNext: true,
        canGoLast: true,
    });
});

test('paginateItems clamps invalid pages and returns only the requested slice', () => {
    const items = Array.from({ length: 25 }, (_, index) => index + 1);

    assert.deepEqual(paginateItems(items, 2, 12), {
        currentPage: 2,
        totalPages: 3,
        items: Array.from({ length: 12 }, (_, index) => index + 13),
    });
    assert.deepEqual(paginateItems(items, 99, 12), {
        currentPage: 3,
        totalPages: 3,
        items: [25],
    });
});
