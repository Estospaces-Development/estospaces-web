import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('#417 forgot password never claims an email was sent to an address that may have no account', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/pages/auth/forgot-password/page.tsx'), 'utf8');

    // Core always answers success (no account enumeration), so the copy must stay conditional.
    assert.match(source, /If an account exists for <strong>\{email\}<\/strong>, we have sent it a password reset link\./);
    assert.match(source, /check your spam folder/);
    assert.doesNotMatch(source, /We have sent a password reset link to/);
});
