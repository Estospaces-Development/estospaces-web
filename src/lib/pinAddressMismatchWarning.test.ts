import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../pages/manager/dashboard/properties/add/page.tsx', import.meta.url), 'utf8');

test('map and current-location pins warn about a city/postcode mismatch without blocking the save (web-app#586)', () => {
    const helper = source.match(/const warnIfPinAddressMismatch = useCallback\(async \(\) => \{([\s\S]*?)\n {2}\}, \[/)?.[1] ?? '';
    assert.ok(helper, 'warnIfPinAddressMismatch not found');
    assert.match(helper, /resolution\.kind === "mismatch"/);
    assert.match(helper, /"warning"/);
    assert.doesNotMatch(helper, /setErrors|focusFirstErrorField/);
    assert.match(helper, /pinAddressCheckRef\.current === key\) return;/);

    const currentLocation = source.slice(source.indexOf('const handleUseCurrentLocation'), source.indexOf('const handleMapLocationChange'));
    const mapPin = source.slice(source.indexOf('const handleMapLocationChange'), source.indexOf('const getNumericDisplayValue'));
    assert.match(currentLocation, /void warnIfPinAddressMismatch\(\);/);
    assert.match(mapPin, /void warnIfPinAddressMismatch\(\);/);
});
