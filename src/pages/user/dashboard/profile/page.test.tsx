import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const profilePageSource = fs.readFileSync(
    path.join(process.cwd(), 'src/pages/user/dashboard/profile/page.tsx'),
    'utf8',
);

test('uses ISO geo-market codes for country-specific profile phone placeholders', () => {
    assert.match(profilePageSource, /placeholder=\{geoMarket === 'GB' \? '\+44 20 1234 5678' : '\+91 98765 43210'\}/);
    assert.doesNotMatch(profilePageSource, /geoMarket === 'uk'/);
});

test('keeps a normal UK postcode separator while the profile form is being typed', () => {
    assert.match(profilePageSource, /name === 'postcode' \? sanitizeLaunchLocationCodeInput\(value\) : value/);
});
