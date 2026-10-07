import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { mediaUploadTimeoutMs, usesChunkedMediaUpload } from '@/services/mediaService';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const addProperty = () => read('pages/manager/dashboard/properties/add/page.tsx');

test('property images up to 52 MB are accepted and sent in chunks under the Cloud Run 32 MiB request cap (MB-0223, MB-0224, MB-0225)', () => {
    assert.match(addProperty(), /const MAX_PROPERTY_IMAGE_BYTES = 52_000_000;/);
    assert.match(addProperty(), /Maximum size is 52 MB\./);
    assert.ok(usesChunkedMediaUpload(52_000_000));
    assert.doesNotMatch(addProperty(), /10 \* 1024 \* 1024/);
});

test('media uploads get a size-aware timeout instead of the flat 15 s (MB-0234)', () => {
    assert.equal(mediaUploadTimeoutMs(0), 15_000);
    assert.equal(mediaUploadTimeoutMs(52_000_000), 15_000 + 208_000);
    assert.match(read('services/mediaService.ts'), /timeoutMs: mediaUploadTimeoutMs\(file\.size\)/);
});

test('damaged images and videos are refused before they are saved (MB-0228, MB-0246)', () => {
    assert.match(addProperty(), /if \(!\(await canDecodeImageFile\(file\)\)\) \{/);
    assert.match(addProperty(), /if \(!\(await canPlayVideoFile\(file\)\)\) \{/);
});

test('a rejected applicant sees the agent reason (MB-0487)', () => {
    assert.match(read('pages/user/applications/page.tsx'), /Reason from the agent: <\/span>\{application\.reviewNotes\}/);
});

test('only admins see Pin; hide and audience controls need the author or an admin (MB-0618)', () => {
    const card = read('components/community/CommunityPostCard.tsx');
    assert.match(card, /const canModerate = isManager && \(isAdmin \|\| canEditCommunityPost\(post, currentUserId\)\);/);
    assert.match(card, /\{isAdmin && \(\s*<button role="menuitem" aria-label=\{post\.isPinned/);
});

test('document vault rows wrap by available width (MB-0144)', () => {
    assert.match(read('components/dashboard/VerificationSection.tsx'), /className="flex flex-wrap items-center justify-between gap-3 rounded-2xl/);
});

test('reset password explains a disabled submit and its eye icons agree (MB-0069, MB-0076)', () => {
    const page = read('pages/auth/reset-password/page.tsx');
    assert.match(page, /id="reset-password-submit-hint"/);
    assert.match(page, /\{showConfirmPassword \? <Eye size=\{20\} \/> : <EyeOff size=\{20\} \/>\}/);
});
