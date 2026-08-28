import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
    new URL('../components/manager/LeadActionMap.tsx', import.meta.url),
    'utf8',
);

test('manager lead map never repeats the world or renders unverified locations', () => {
    assert.match(source, /noWrap/);
    assert.match(source, /worldCopyJump/);
    assert.match(source, /minZoom=\{2\}/);
    assert.match(source, /No verified lead locations/);
    assert.match(source, /not placed at an approximate or incorrect location/);
});

test('manager lead map reports overlapping leads as verified locations', () => {
    assert.match(source, /uniqueLocationCount/);
    assert.match(source, /Across \{uniqueLocationCount\} verified location/);
});
