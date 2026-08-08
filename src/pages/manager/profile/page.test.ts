import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync('src/pages/manager/profile/page.tsx', 'utf8');

test('manager profile exposes an inline confirmed avatar removal flow', () => {
    assert.match(source, /handleRemoveAvatar/);
    assert.match(source, /confirmingAvatarRemoval/);
    assert.match(source, /setConfirmingAvatarRemoval\(true\)/);
    assert.match(source, /setConfirmingAvatarRemoval\(false\)/);
    assert.doesNotMatch(source, /window\.confirm/);
    assert.match(source, /userService\.updateProfile\(\{ avatar: '' \}\)/);
    assert.match(source, /mergeCurrentUserProfile\(\{ \.\.\.\(data \|\| \{\}\), avatar: '', avatar_url: '' \}\)/);
    assert.match(source, /aria-label="Remove manager profile photo"/);
    assert.match(source, /aria-label="Confirm remove manager profile photo"/);
    assert.match(source, /Remove now/);
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

test('manager profile keeps Save actionable so validation failures are visible', () => {
    assert.match(source, /const saveDisabled = isLoading\s*\|\| uploadingImage\s*\|\| removingAvatar;/);
    assert.match(source, /showToast\(validationMessage, \{ type: 'error' \}\)/);
    assert.match(source, /!formData\.companyAddress\.trim\(\) \? \(managerProfile\?\.profile_type/);
    assert.doesNotMatch(source, /!registeredOfficeAddressTrimmed/);
});

test('manager profile treats persisted empty values as authoritative', () => {
    assert.match(source, /managerProfile\?\.company_description \?\? user\?\.user_metadata\?\.bio \?\? ''/);
    assert.match(source, /managerProfile\?\.complaints_contact \?\? ''/);
    assert.match(source, /managerProfile\?\.cmp_certificate_url \?\? ''/);
    assert.match(source, /user\.phone \?\? ''/);
    assert.match(source, /user\.user_metadata\?\.website \?\? ''/);
});

test('manager profile background refresh cannot overwrite active edits', () => {
    assert.match(source, /const isEditingProfileRef = useRef\(false\)/);
    assert.match(source, /if \(!user \|\| isManagerProfileLoading \|\| isEditingProfileRef\.current\) \{\s*return;/);
    assert.match(source, /const handleChange[\s\S]*isEditingProfileRef\.current = true;/);
    assert.match(source, /setSelectedAvatarFile\(null\);\s*isEditingProfileRef\.current = false;\s*setIsSaved\(true\)/);
});

test('manager profile saves professional fields through the canonical verification profile', () => {
    assert.match(source, /createProfile: createManagerProfile/);
    assert.match(source, /updateProfile: syncManagerProfile/);
    assert.match(source, /buildManagerProfileSyncPayload/);
    assert.match(source, /if \(!managerProfile\) \{\s*const \{ error: createManagerProfileError \} = await createManagerProfile\(managerProfileType\)/);
    assert.match(source, /await syncManagerProfile\(managerProfilePayload\)/);
    assert.doesNotMatch(source, /payload\.broker_settings/);
});
