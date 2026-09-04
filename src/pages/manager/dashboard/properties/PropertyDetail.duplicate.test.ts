import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const source = readFileSync(
    resolve(process.cwd(), 'src/pages/manager/dashboard/properties/[id]/page.tsx'),
    'utf8',
);

test('manager property duplication requires an explicit confirmation', () => {
    assert.match(source, /setShowDuplicateConfirm\(true\)/);
    assert.match(source, /aria-labelledby="duplicate-property-title"/);
    assert.match(source, /Copy as draft/);
});

test('manager duplicate confirmation explains the safe draft behavior', () => {
    assert.match(source, /Create a new draft listing from this property/);
    assert.match(source, /You can review and edit it before publishing/);
});

test('manager property location keeps map actions uncluttered on narrow screens', () => {
    assert.match(source, /data-location-header-action[^>]*className="hidden[^\"]*sm:inline-flex/);
    assert.match(source, /data-location-map-action[^>]*className="absolute hidden[^\"]*sm:block/);
    assert.match(source, /min-h-\[13rem\][^\"]*sm:aspect-video/);
});
