import assert from 'node:assert/strict';
import test from 'node:test';

import { getPrimaryPropertyImage, getPropertyImages } from './propertyImages';
import { PUBLIC_MEDIA_CACHE_VERSION } from './mediaUrls';

test('getPropertyImages versions public media-service URLs', () => {
    const [image] = getPropertyImages({
        image_urls: ['https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/uploads/property/property-1/image.jpg'],
    });
    const resolved = new URL(image);

    assert.equal(resolved.searchParams.get('esto_media'), PUBLIC_MEDIA_CACHE_VERSION);
});

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

test('generated dummy artwork uses the unavailable state without discarding real photos', () => {
    const dummy = 'https://dummyimage.com/800x500/f97316/ffffff.png&text=Issue228';
    const real = 'https://assets.estospaces.com/property.jpg';
    const property = { image_urls: JSON.stringify([dummy, real]) };
    assert.deepEqual(getPropertyImages(property), [real]);
    assert.equal(getPrimaryPropertyImage({ image_url: dummy }, '/unavailable.svg'), '/unavailable.svg');
    assert.equal(property.image_urls, JSON.stringify([dummy, real]));
});

test('placeholder detection matches hostnames, not names inside real media URLs', () => {
    const images = [
        'https://assets.estospaces.com/dummyimage.com/photo.jpg',
        'https://dummyimage.com.assets.estospaces.com/photo.jpg',
    ];
    assert.deepEqual(getPropertyImages({ images }), images);
    assert.deepEqual(getPropertyImages({ image_url: 'https://www.dummyimage.com/800x500' }), []);
});

test('getPropertyImages passes GCS media bucket URLs through resolveMediaUrl', () => {
    const images = getPropertyImages({
        image_urls: [
            'https://storage.googleapis.com/estospaces-media-dev/property/listing.jpg',
            'https://example.com/a.jpg',
            'https://assets.estospaces.com/listing.jpg',
        ],
    });

    assert.ok(images.some(img => img.includes('/uploads/property/listing.jpg')));
    assert.equal(images.filter(img => new URL(img).hostname === 'example.com').length, 0);
    assert.ok(images.includes('https://assets.estospaces.com/listing.jpg'));
});

test('getPrimaryPropertyImage resolves GCS media URLs through the media service', () => {
    const result = getPrimaryPropertyImage(
        {
            image_urls: '["https://storage.googleapis.com/estospaces-media-dev/property/listing.jpg"]',
        },
        '/images/fallback.jpg',
    );
    assert.equal(
        result,
        `http://localhost:8085/uploads/property/listing.jpg?esto_media=${PUBLIC_MEDIA_CACHE_VERSION}`,
    );
});
