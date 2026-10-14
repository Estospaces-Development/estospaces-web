import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getLaunchLocationCodeLabel, getLaunchLocationCodePlaceholder } from '@/lib/launchLocale';

const source = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('admin profile location field is market-neutral: PIN or UK postcode (A94)', () => {
    assert.equal(getLaunchLocationCodeLabel(), 'PIN code / postcode');
    assert.equal(getLaunchLocationCodePlaceholder(), 'e.g. 600001 or SW1A 1AA');
    assert.match(source, /getLaunchLocationCodeLabel\(\)/);
    assert.match(source, /getLaunchLocationCodePlaceholder\(\)/);
    assert.doesNotMatch(source, /useUserGeoMarket/);
});
