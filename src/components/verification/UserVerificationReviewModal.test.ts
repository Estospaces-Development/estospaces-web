import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { USER_VERIFICATION_REVIEW_CLOSE_LABEL } from './UserVerificationReviewModal';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(testDir, 'UserVerificationReviewModal.tsx'), 'utf8');

test('user verification review modal names the close control and restores focus', () => {
    assert.equal(USER_VERIFICATION_REVIEW_CLOSE_LABEL, 'Close verification review panel');
    assert.match(source, /aria-label=\{USER_VERIFICATION_REVIEW_CLOSE_LABEL\}/);
    assert.match(source, /previousFocusRef\.current\?\.focus\(\)/);
});
