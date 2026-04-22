import test from 'node:test';
import assert from 'node:assert/strict';

import {
    formatImmersiveGalleryTransformOrigin,
    IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT,
    resolveImmersiveGalleryZoomPoint,
} from './immersiveGallery';

test('immersive gallery zoom point resolves pointer position into percentages', () => {
    assert.deepEqual(
        resolveImmersiveGalleryZoomPoint(260, 170, {
            left: 10,
            top: 20,
            width: 500,
            height: 300,
        }),
        { x: 50, y: 50 },
    );
});

test('immersive gallery zoom point clamps values outside the rendered image bounds', () => {
    assert.deepEqual(
        resolveImmersiveGalleryZoomPoint(-100, 999, {
            left: 10,
            top: 20,
            width: 500,
            height: 300,
        }),
        { x: 0, y: 100 },
    );
});

test('immersive gallery falls back to the centred zoom point for invalid bounds', () => {
    assert.deepEqual(
        resolveImmersiveGalleryZoomPoint(25, 25, {
            left: 0,
            top: 0,
            width: 0,
            height: 300,
        }),
        IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT,
    );
    assert.equal(formatImmersiveGalleryTransformOrigin({ x: 37.5, y: 62.5 }), '37.5% 62.5%');
});
