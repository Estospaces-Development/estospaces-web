import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/SatelliteMap.tsx'), 'utf8');

test('manager map loads every inventory page and preserves the real total', () => {
    assert.match(source, /while \(hasNextPage\)/);
    assert.match(source, /getUserProperties\(\{ limit: 100, page \}\)/);
    assert.match(source, /setPropertyTotal\(total\)/);
    assert.match(source, /Showing \{filteredLocations\.length\} of \{propertyTotal\}/);
});

test('manager map reports listings without verified coordinates instead of inventing pins', () => {
    assert.match(source, /propertyTotal > propertyLocations\.length/);
    assert.match(source, /property needs.*valid map location/);
    assert.match(source, /resolveManagerPropertyMapLocation\(property\)/);
});

test('manager map uses the shared loading/error state and filter counts', () => {
    assert.match(source, /BrandLoadingScreen variant="panel" label="Loading map\.\.\."/);
    assert.match(source, /data-manager-map-filter-count=\{filter\.id\}/);
    assert.match(source, /Property inventory could not be loaded\./);
});
