import test from 'node:test';
import assert from 'node:assert/strict';

import { getPropertyGalleryDisplayState } from './propertyGalleryState';

test('property detail does not present placeholder media as a real gallery', () => {
    assert.deepEqual(getPropertyGalleryDisplayState(0, 0), {
        hasImages: false,
        photoCountLabel: 'No photos',
        positionLabel: 'No photos',
    });
    assert.deepEqual(getPropertyGalleryDisplayState(3, 1), {
        hasImages: true,
        photoCountLabel: '3 photos',
        positionLabel: '2 / 3',
    });
});
