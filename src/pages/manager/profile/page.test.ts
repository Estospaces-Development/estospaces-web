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
    assert.match(source, /const missingVerificationProfileFields = getMissingManagerVerificationProfileFields\(/);
    assert.match(source, /\.\.\.missingVerificationProfileFields\.map\(\(\{ label \}\) => label\)/);
    assert.match(source, /nextFieldErrors\[field\] = `\$\{label\} is required\.`;/);
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

test('manager profile loads stored name parts instead of re-splitting the display name', () => {
    assert.match(source, /const hasStoredNameParts = Boolean\(user\.first_name \|\| user\.last_name\);/);
    assert.match(source, /hasStoredNameParts \? \(user\.first_name \|\| ''\)/);
    assert.match(source, /hasStoredNameParts \? \(user\.last_name \|\| ''\)/);
});

test('manager user-profile save sends only changed personal fields (QA-MB-20260923-01-032)', () => {
    assert.match(source, /const personalBaselineRef = useRef</);
    assert.match(source, /\.\.\.buildChangedProfileFields\(personalBaseline, submittedPersonalValues\)/);
    assert.match(source, /avatarValue !== undefined && avatarValue !== storedAvatarValue \? \{ avatar: avatarValue \} : \{\}/);
    assert.doesNotMatch(source, /first_name: formData\.firstName,/);
    assert.doesNotMatch(source, /address: formData\.address,\s*postcode: formData\.postcode,\s*avatar: avatarValue/);
    // Broker-profile sync (the re-verification path) is still sent in full.
    assert.match(source, /personalAddress: formData\.address,/);
    assert.match(source, /await syncManagerProfile\(managerProfilePayload\)/);
});

test('manager profile heading wraps long names inside the card (QA-MB-20260925-01-014)', () => {
    assert.match(source, /<h2 className="[^"]*break-words \[overflow-wrap:anywhere\][^"]*">\{formData\.firstName\} \{formData\.lastName\}<\/h2>/);
});

test('a verified manager is warned before a save that core will send back to verification (QA-MB-20260923-01-029)', () => {
    // The check runs after validation and before any request is sent.
    assert.match(source, /const pendingReverificationFields = getReverificationTriggerFields\(managerProfile, buildPendingManagerProfilePayload\(\)\);\s*if \(pendingReverificationFields\.length > 0\) \{\s*setReverificationFields\(pendingReverificationFields\);\s*return;\s*\}\s*await saveProfile\(\);/);
    assert.ok(source.indexOf('const pendingReverificationFields') > source.indexOf("showToast(validationMessage, { type: 'error' });"));
    assert.ok(source.indexOf('const pendingReverificationFields') < source.indexOf('const saveProfile = async () => {'));
    // Confirming sends the same payload the warning was computed from; cancelling sends nothing.
    assert.match(source, /const confirmReverificationSave = \(\) => \{\s*setReverificationFields\(null\);\s*void saveProfile\(\);\s*\};/);
    assert.match(source, /const managerProfilePayload = buildPendingManagerProfilePayload\(\);/);
    assert.match(source, /onCancel=\{\(\) => setReverificationFields\(null\)\}/);
    // Editing a field after the warning invalidates it, so a stale confirmation cannot save new values.
    assert.match(source, /setSaveError\(''\);\s*setReverificationFields\(null\);/);
});
