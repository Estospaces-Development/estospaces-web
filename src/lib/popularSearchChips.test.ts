import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPopularSearchTerms } from '@/lib/popularSearchChips';

test('popular search terms are normalized, deduplicated, limited, and hide legacy UK launch locations', () => {
    const terms = buildPopularSearchTerms([
        { id: '1', term: '  Attur  ', count: 9, location: '' },
        { id: '2', term: 'attur', count: 8, location: '' },
        { id: '3', term: 'North   London', count: 7, location: '' },
        { id: '4', term: '', count: 6, location: '' },
        { id: '5', term: 'Manchester', count: 5, location: '' },
        { id: '6', term: 'Belfast homes', count: 4, location: '' },
        { id: '7', term: 'Chennai apartments', count: 3, location: '' },
    ], 2);

    assert.deepEqual(terms, ['Attur', 'Chennai apartments']);
});
