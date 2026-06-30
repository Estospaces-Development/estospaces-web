import assert from 'node:assert/strict';
import test from 'node:test';

import { getPrimaryPropertyImage, getPropertyImages } from './propertyImages';

test('getPropertyImages normalizes nested image payload shapes', () => {
    const images = getPropertyImages({
        image_urls: JSON.stringify([
            { url: ' https://assets.estospaces.com/listing-main.jpg ' },
            ['https://assets.estospaces.com/listing-second.jpg'],
            '',
            '[]',
        ]),
        images: [{ url: 'https://assets.estospaces.com/listing-main.jpg' }],
        media: {
            images: [{ url: 'https://assets.estospaces.com/listing-third.jpg' }],
        },
    });

    assert.deepEqual(images, [
        'https://assets.estospaces.com/listing-main.jpg',
        'https://assets.estospaces.com/listing-second.jpg',
        'https://assets.estospaces.com/listing-third.jpg',
    ]);
});

test('getPrimaryPropertyImage falls back when no usable image exists', () => {
    assert.equal(
        getPrimaryPropertyImage({ image_urls: '[]', images: [] }, '/images/fallback.jpg'),
        '/images/fallback.jpg',
    );
});

test('getPropertyImages ignores private media bucket and placeholder image URLs', () => {
    const images = getPropertyImages({
        image_urls: [
            'https://storage.googleapis.com/estospaces-media-dev/property/private.jpg',
            'https://storage.cloud.google.com/estospaces-media-dev/property/private.jpg',
            'https://example.com/a.jpg',
            'https://assets.estospaces.com/listing.jpg',
        ],
    });

    assert.deepEqual(images, ['https://assets.estospaces.com/listing.jpg']);
});

test('getPrimaryPropertyImage falls back when only private media URLs exist', () => {
    assert.equal(
        getPrimaryPropertyImage(
            {
                image_urls: '["https://storage.googleapis.com/estospaces-media-dev/property/private.jpg"]',
            },
            '/images/fallback.jpg',
        ),
        '/images/fallback.jpg',
    );
});
