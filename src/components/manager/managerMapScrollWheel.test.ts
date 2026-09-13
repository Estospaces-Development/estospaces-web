import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('manager map surfaces do not hijack page scrolling to zoom', () => {
    assert.match(
        source('src/components/manager/PropertyLocationPicker.tsx'),
        /scrollWheelZoom=\{false\}/,
    );
    assert.match(
        source('src/components/manager/LeadActionMap.tsx'), /scrollWheelZoom=\{false\}/);
    assert.match(source('src/components/dashboard/SatelliteMap.tsx'), /scrollWheelZoom=\{false\}/);
});
test('manager maps retain a user-selected view until their pinned locations change', () => {
    for (const path of [
        'src/components/dashboard/MapView.tsx',
        'src/components/dashboard/SatelliteMap.tsx',
        'src/components/manager/LeadActionMap.tsx',
    ]) {
        const component = source(path);
        assert.match(component, /const appliedLocationKey = useRef<string \| null>\(null\)/);
        assert.match(component, /if \(appliedLocationKey\.current === locationKey\) \{/);
        assert.match(component, /appliedLocationKey\.current = locationKey/);
    }
});
