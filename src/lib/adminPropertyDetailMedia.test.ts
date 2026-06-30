import assert from 'node:assert/strict';
import test from 'node:test';

import { getAdminPropertyDetailMedia } from './adminPropertyDetailMedia';

test('admin property detail exposes a visible accessible fallback when no media exists', () => {
    const media = getAdminPropertyDetailMedia({
        title: 'No Image Registry Listing',
        image_urls: '[]',
        images: [],
    });

    assert.equal(media.hasImages, false);
    assert.equal(media.primaryImageUrl, null);
    assert.equal(media.fallbackTitle, 'No property images uploaded');
    assert.equal(media.fallbackAriaLabel, 'No property images uploaded for No Image Registry Listing');
    assert.match(media.fallbackDescription, /review/i);
});

test('admin property detail reuses shared property image normalization', () => {
    const media = getAdminPropertyDetailMedia({
        title: 'Thumbnail Registry Listing',
        image_urls: '[]',
        thumbnail_url: ' https://cdn.example.com/admin-thumbnail.jpg ',
    });

    assert.equal(media.hasImages, true);
    assert.equal(media.primaryImageUrl, 'https://cdn.example.com/admin-thumbnail.jpg');
    assert.deepEqual(media.imageUrls, ['https://cdn.example.com/admin-thumbnail.jpg']);
});
