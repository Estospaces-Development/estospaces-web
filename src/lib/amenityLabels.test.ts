import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { formatAmenityLabel, getKnownAmenityLabel } from './amenityLabels';

test('stored amenity codes show the editor labels', () => {
    assert.equal(formatAmenityLabel('ac'), 'Air Conditioning');
    assert.equal(formatAmenityLabel('wifi'), 'WiFi Included');
    assert.equal(formatAmenityLabel('Water_supply'), '24/7 Water Supply');
    assert.equal(formatAmenityLabel('24hr_security'), '24/7 Security');
    assert.equal(formatAmenityLabel('pet_friendly'), 'Pet Friendly');
    assert.equal(getKnownAmenityLabel('unknown_code'), undefined);
});

test('amenity labels stay in sync with the property editor options', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/add/page.tsx'), 'utf8');
    const block = editor.slice(editor.indexOf('const amenitiesGroups'), editor.indexOf('\n};', editor.indexOf('const amenitiesGroups')));
    const options = [...block.matchAll(/id:\s*"([^"]+)",\s*label:\s*"([^"]+)"/g)];
    assert.ok(options.length >= 30);
    for (const [, id, label] of options) {
        assert.equal(getKnownAmenityLabel(id), label, id);
    }
});

test('property detail pages render amenity labels, not raw codes', () => {
    for (const file of ['src/pages/admin/properties/[id]/page.tsx', 'src/pages/manager/dashboard/properties/[id]/page.tsx']) {
        const source = readFileSync(resolve(process.cwd(), file), 'utf8');
        assert.ok(source.includes('{formatAmenityLabel(amenity)}'), file);
    }
});
