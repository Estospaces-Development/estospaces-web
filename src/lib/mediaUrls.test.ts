import assert from 'node:assert/strict';
import test from 'node:test';

import { PUBLIC_MEDIA_CACHE_VERSION, resolveMediaUrl, resolveMediaUrlForBase } from './mediaUrls';

test('resolveMediaUrl versions public Cloud Run media URLs to bypass stale browser failures', () => {
    const resolved = new URL(resolveMediaUrl(
        'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/uploads/property/property-1/image.jpg',
    ));

    assert.equal(resolved.pathname, '/uploads/property/property-1/image.jpg');
    assert.equal(resolved.searchParams.get('esto_media'), PUBLIC_MEDIA_CACHE_VERSION);
});

test('resolveMediaUrl preserves existing public-media query parameters', () => {
    const resolved = new URL(resolveMediaUrl(
        'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/uploads/user/user-1/avatar.jpg?size=large',
    ));

    assert.equal(resolved.searchParams.get('size'), 'large');
    assert.equal(resolved.searchParams.get('esto_media'), PUBLIC_MEDIA_CACHE_VERSION);
});

test('resolveMediaUrl does not modify signed API access or unrelated image URLs', () => {
    const signedAccessUrl = 'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/api/v1/media/access/file-1?token=secret';
    const unrelatedUrl = 'https://assets.estospaces.com/listing.jpg';

    assert.equal(resolveMediaUrl(signedAccessUrl), signedAccessUrl);
    assert.equal(resolveMediaUrl(unrelatedUrl), unrelatedUrl);
    assert.equal(resolveMediaUrl('data:image/png;base64,abc'), 'data:image/png;base64,abc');
});

test('resolveMediaUrl resolves relative media API URLs without changing access semantics', () => {
    assert.equal(
        resolveMediaUrl('/api/v1/media/access/file-1'),
        'http://localhost:8085/api/v1/media/access/file-1',
    );
});

test('resolveMediaUrlForBase versions uploads behind the production same-origin media proxy', () => {
    const resolved = new URL(resolveMediaUrlForBase(
        '/uploads/property/property-1/image.jpg',
        '/__api/media',
        'https://app.estospaces.com',
    ));

    assert.equal(resolved.origin, 'https://app.estospaces.com');
    assert.equal(resolved.pathname, '/__api/media/uploads/property/property-1/image.jpg');
    assert.equal(resolved.searchParams.get('esto_media'), PUBLIC_MEDIA_CACHE_VERSION);
});

test('resolveMediaUrlForBase routes private Estospaces bucket URLs through the media proxy', () => {
    const resolved = new URL(resolveMediaUrlForBase(
        'https://storage.googleapis.com/estospaces-media-dev/property/property-1/image.jpg',
        '/__api/media',
        'https://app.estospaces.com',
    ));

    assert.equal(resolved.origin, 'https://app.estospaces.com');
    assert.equal(resolved.pathname, '/__api/media/uploads/property/property-1/image.jpg');
    assert.equal(resolved.searchParams.get('esto_media'), PUBLIC_MEDIA_CACHE_VERSION);
});
