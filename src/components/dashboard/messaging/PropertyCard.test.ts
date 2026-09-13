import test from 'node:test';
import assert from 'node:assert/strict';

import { getPropertyCardLookupMessage } from './PropertyCard';

test('property card explains when a linked property no longer exists', () => {
    assert.equal(
        getPropertyCardLookupMessage('unavailable'),
        'This property is no longer available.',
    );
});

test('property card keeps transient lookup failures retryable', () => {
    assert.equal(
        getPropertyCardLookupMessage('error'),
        'We could not verify this property. Try again.',
    );
    assert.equal(getPropertyCardLookupMessage('idle'), '');
});
