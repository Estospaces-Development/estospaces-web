import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ApplicationTimelineWidget.tsx', import.meta.url), 'utf8');

test('hydrates historical timeline properties through the batch context endpoint', () => {
    assert.match(source, /getPropertyContextsByIds\(propertyIdBatch/);
    assert.match(source, /index \+= 100/);
    assert.doesNotMatch(source, /getPropertyById\(propertyId\)/);
});

test('marks omitted historical properties unavailable without issuing per-property requests', () => {
    assert.match(source, /hydratedPropertyIds\.add\(property\.id\)/);
    assert.match(source, /if \(!hydratedPropertyIds\.has\(propertyId\)\)/);
});
