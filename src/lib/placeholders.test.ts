import assert from 'node:assert/strict';
import test from 'node:test';

import { AGENCY_PLACEHOLDER_IMAGE, PROPERTY_PLACEHOLDER_IMAGE } from './placeholders';

test('property fallback is a resolved unavailable image, never skeleton or brand artwork', () => {
    assert.match(PROPERTY_PLACEHOLDER_IMAGE, /^data:image\/svg\+xml;charset=UTF-8,/);
    const svg = decodeURIComponent(PROPERTY_PLACEHOLDER_IMAGE.split(',')[1]);
    assert.match(svg, /Property media unavailable/);
    assert.match(svg, /<title>Property media unavailable<\/title>/);
    assert.match(svg, /<path /);
    assert.equal((svg.match(/<rect /g) || []).length, 1, 'Only the background, no skeleton bars');
    assert.doesNotMatch(svg, /Estospaces|animate|opacity|https?:\/\/(?!www\.w3\.org)/);
    assert.notEqual(PROPERTY_PLACEHOLDER_IMAGE, AGENCY_PLACEHOLDER_IMAGE);
});
