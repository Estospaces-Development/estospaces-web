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

test('sends first and last name separately without splitting a full-name string (QA-MB-20260923-01-005)', () => {
    assert.match(profilePageSource, /id="user-first-name"/);
    assert.match(profilePageSource, /id="user-last-name"/);
    assert.match(profilePageSource, /firstName: currentUser\.first_name \|\| ''/);
    assert.match(profilePageSource, /lastName: currentUser\.last_name \|\| ''/);
    assert.match(profilePageSource, /validateProfileNameFields\(\{\s*firstName: formData\.firstName,\s*lastName: formData\.lastName,\s*\}\)/);
    assert.doesNotMatch(profilePageSource, /fullName\.split\(/);
    assert.doesNotMatch(profilePageSource, /validateFullName/);
});

test('saves only the fields that changed since the form was loaded (QA-MB-20260923-01-032)', () => {
    assert.match(profilePageSource, /const changedFields = buildChangedProfileFields\(baselineData, submittedValues\);/);
    assert.match(profilePageSource, /await updateProfile\(\{\s*\.\.\.changedFields,\s*\.\.\.\(avatarValue \? \{ avatar: avatarValue \} : \{\}\),\s*\}\)/);
    assert.match(profilePageSource, /toast\.info\('No changes to save\.'\)/);
    assert.match(profilePageSource, /setBaselineData\(loadedProfile\);/);
});

test('keeps multi-line residential addresses in a textarea (QA-MB-20260923-01-034)', () => {
    assert.match(profilePageSource, /<textarea\s+id="user-residential-address"[\s\S]*?maxLength=\{PROFILE_ADDRESS_MAX_LENGTH\}/);
    assert.doesNotMatch(profilePageSource, /<input\s+id="user-residential-address"/);
});

test('exposes the avatar upload as a keyboard-focusable named button (QA-MB-20260925-01-011)', () => {
    assert.match(profilePageSource, /<button\s+type="button"\s+onClick=\{\(\) => avatarInputRef\.current\?\.click\(\)\}[\s\S]*?aria-label="Change profile photo"[\s\S]*?focus-visible:ring-4/);
    assert.doesNotMatch(profilePageSource, /<label\s+htmlFor="avatar-upload"/);
    assert.match(profilePageSource, /ref=\{avatarInputRef\}\s+type="file"/);
});

test('wraps long profile names inside the card (QA-MB-20260925-01-014)', () => {
    assert.match(profilePageSource, /<h2 className="[^"]*break-words \[overflow-wrap:anywhere\][^"]*">/);
});
