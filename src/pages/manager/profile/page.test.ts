import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/pages/manager/profile/page.tsx', 'utf8');

test('manager profile exposes a confirmed avatar removal flow', () => {
    assert.match(source, /handleRemoveAvatar/);
    assert.match(source, /window\.confirm\('Remove your profile photo and restore the default avatar\?'\)/);
    assert.match(source, /userService\.updateProfile\(\{ avatar: '' \}\)/);
    assert.match(source, /mergeCurrentUserProfile\(\{ \.\.\.\(data \|\| \{\}\), avatar: '', avatar_url: '' \}\)/);
    assert.match(source, /aria-label="Remove manager profile photo"/);
    assert.match(source, /'Remove photo'/);
});

test('manager profile makes save-blocking fields visibly required', () => {
    assert.match(source, /function RequiredFieldLabel/);
    assert.match(source, /Complete required fields: \$\{missingRequiredFields\.join\(', '\)\}\./);
    assert.match(source, /id="manager-profile-required-help"/);
    assert.match(source, /<RequiredFieldLabel>First Name<\/RequiredFieldLabel>/);
    assert.match(source, /<RequiredFieldLabel>Last Name<\/RequiredFieldLabel>/);
    assert.match(source, /<RequiredFieldLabel>License \/ Reg Number<\/RequiredFieldLabel>/);
    assert.match(source, /aria-describedby=\{requiredHelpId\}/);
});
