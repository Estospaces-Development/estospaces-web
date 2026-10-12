import assert from 'node:assert/strict';
import test from 'node:test';

import { getManagerVerificationTone } from './adminVerificationStatus';

test('Submitted and Incomplete verification badges no longer share a colour (#726)', () => {
    const submitted = getManagerVerificationTone('submitted');
    const incomplete = getManagerVerificationTone('incomplete');
    assert.notEqual(submitted.badgeClassName, incomplete.badgeClassName);
    assert.notEqual(submitted.dotClassName, incomplete.dotClassName);
    assert.match(submitted.badgeClassName, /sky/);
    assert.doesNotMatch(`${submitted.badgeClassName} ${incomplete.badgeClassName}`, /amber/);
});

test('every verification state has its own tone with dark-mode classes', () => {
    const statuses = ['submitted', 'incomplete', 'verification_required', 'under_review', 'approved', 'rejected'];
    const tones = statuses.map((status) => getManagerVerificationTone(status).badgeClassName);
    assert.equal(new Set(tones).size, statuses.length);
    for (const tone of tones) assert.match(tone, /dark:/);
    assert.equal(getManagerVerificationTone('documents_submitted'), getManagerVerificationTone('submitted'));
    assert.equal(getManagerVerificationTone('profile_required'), getManagerVerificationTone('incomplete'));
});
