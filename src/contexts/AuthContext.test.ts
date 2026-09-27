import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeRegistrationNames, resolveVerificationEmailSent } from './AuthContext';

test('registration keeps a multi-word first name intact instead of re-splitting a joined name', () => {
    assert.deepEqual(normalizeRegistrationNames({ firstName: 'Mary Ann', lastName: 'Smith' }), {
        first_name: 'Mary Ann',
        last_name: 'Smith',
    });
});

test('registration does not derive a last name from the first-name field (QA-MB-20260923-01-005)', () => {
    assert.deepEqual(normalizeRegistrationNames({ firstName: 'Mary Ann', lastName: '' }), {
        first_name: 'Mary Ann',
        last_name: '',
    });
    assert.deepEqual(normalizeRegistrationNames({ firstName: '  Property   Manager ', lastName: '   ' }), {
        first_name: 'Property Manager',
        last_name: '',
    });
});

test('registration collapses inner whitespace inside each name part', () => {
    assert.deepEqual(normalizeRegistrationNames({ firstName: ' Jo ', lastName: ' van   der  Berg ' }), {
        first_name: 'Jo',
        last_name: 'van der Berg',
    });
});

test('register refuses to call the API when a name part is blank', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src/contexts/AuthContext.tsx'), 'utf8');
    assert.match(source, /const \{ first_name, last_name \} = normalizeRegistrationNames\(names\);\s+if \(!first_name \|\| !last_name\) \{/);
    assert.doesNotMatch(source, /splitRegistrationName/);
});

test('registration preserves an explicit provider delivery failure from the API', () => {
    assert.equal(resolveVerificationEmailSent({
        data: {
            verification_email_sent: false,
        },
    }), false);
});

test('registration remains compatible with responses created before delivery status existed', () => {
    assert.equal(resolveVerificationEmailSent({ data: { user: { id: 'user-1' } } }), true);
});
