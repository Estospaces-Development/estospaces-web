import test from 'node:test';
import assert from 'node:assert/strict';

import { STANDARD_MAP_TILE_LAYER } from './mapTiles';

test('standard map tiles use the keyless official OpenStreetMap XYZ endpoint', () => {
    assert.equal(
        STANDARD_MAP_TILE_LAYER.url,
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    );
    assert.match(STANDARD_MAP_TILE_LAYER.attribution, /OpenStreetMap/);
    assert.doesNotMatch(STANDARD_MAP_TILE_LAYER.url, /carto|api[_-]?key/i);
});
