import assert from 'node:assert/strict';
import test from 'node:test';

import { MESSAGE_MAX_BYTES, getMessageByteLength, getMessageLengthState } from './messageComposerLimit';

test('message length follows the service limit in UTF-8 bytes of trimmed text', () => {
    assert.equal(getMessageLengthState('a'.repeat(MESSAGE_MAX_BYTES)).overLimit, false);
    assert.equal(getMessageLengthState('a'.repeat(MESSAGE_MAX_BYTES + 1)).overLimit, true);
    assert.equal(getMessageLengthState(`  ${'a'.repeat(MESSAGE_MAX_BYTES)}  `).overLimit, false);
    // Multi-byte text reaches the byte limit before the character count does.
    assert.equal(getMessageByteLength('अ'.repeat(1334)), 4002);
    assert.equal(getMessageLengthState('अ'.repeat(1334)).overLimit, true);
    assert.equal(getMessageLengthState('short').showCounter, false);
    assert.equal(getMessageLengthState('a'.repeat(3700)).showCounter, true);
});
