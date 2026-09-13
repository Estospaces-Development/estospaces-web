import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/components/manager/PropertyLocationPicker.tsx'), 'utf8');

test('property location picker exposes a draggable marker and first-pin placement', () => {
    assert.match(source, /draggable=\{!disabled && !busy\}/);
    assert.match(source, /Place pin at map center/);
    assert.match(source, /onLocationChange\(center\.lat, center\.lng\)/);
});

test('property location picker disables wheel zoom to keep page scrolling stable', () => {
    assert.match(source, /scrollWheelZoom=\{false\}/);
    assert.match(source, /maxBoundsViscosity=\{1\}/);
});
