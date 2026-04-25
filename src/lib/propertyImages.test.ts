import assert from 'node:assert/strict';
import test from 'node:test';

import { getPrimaryPropertyImage, getPropertyImages } from './propertyImages';

test('getPropertyImages normalizes nested image payload shapes', () => {
    const images = getPropertyImages({
        image_urls: JSON.stringify([
            { url: ' https://cdn.example.com/listing-main.jpg ' },
            ['https://cdn.example.com/listing-second.jpg'],
            '',
            '[]',
        ]),
        images: [{ url: 'https://cdn.example.com/listing-main.jpg' }],
        media: {
            images: [{ url: 'https://cdn.example.com/listing-third.jpg' }],
        },
    });

    assert.deepEqual(images, [
        'https://cdn.example.com/listing-main.jpg',
        'https://cdn.example.com/listing-second.jpg',
        'https://cdn.example.com/listing-third.jpg',
    ]);
});

test('getPrimaryPropertyImage falls back when no usable image exists', () => {
    assert.equal(
        getPrimaryPropertyImage({ image_urls: '[]', images: [] }, '/images/fallback.jpg'),
        '/images/fallback.jpg',
    );
});
