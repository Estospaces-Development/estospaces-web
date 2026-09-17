import assert from 'node:assert/strict';
import test from 'node:test';
import { validateOptionalLeadPhone } from './manualLeadPhone';

test('manual lead phone is optional, including whitespace-only input', () => {
    for (const phone of [undefined, '', '   ']) {
        assert.equal(validateOptionalLeadPhone(phone), null);
    }
});

test('manual lead phone accepts existing international and local formats', () => {
    for (const phone of ['+91 98765 43210', '+44 (0)20 7946 0958', '020-7946-0958', ' 9876543210 ']) {
        assert.equal(validateOptionalLeadPhone(phone), null);
    }
});

test('invalid provided phone remains rejected and clearing it recovers', () => {
    for (const phone of ['call tomorrow', '123@example.com', '++91 12345']) {
        assert.equal(validateOptionalLeadPhone(phone), 'Phone must contain only numbers, spaces, and +()-');
    }
    assert.equal(validateOptionalLeadPhone(''), null);
});
