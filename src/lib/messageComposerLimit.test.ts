import assert from 'node:assert/strict';
import test from 'node:test';

import { MESSAGE_MAX_BYTES, MESSAGE_TOO_LONG_TEXT, getMessageByteLength, getMessageLengthState, getMessageSendFailureText, insertTextAtCursor } from './messageComposerLimit';

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

test('send failures keep actionable server text and hide transport noise', () => {
    assert.equal(
        getMessageSendFailureText(new Error('Your message is too long. Shorten it and try again.')),
        'Your message is too long. Shorten it and try again.',
    );
    for (const noise of ['Internal server error', 'API error: 502', 'Request timed out', 'Failed to fetch', '502 Bad Gateway', '']) {
        assert.equal(getMessageSendFailureText(new Error(noise)), 'Failed to send message. Please try again.', noise);
    }
    assert.equal(getMessageSendFailureText('not an error'), 'Failed to send message. Please try again.');
    assert.doesNotMatch(MESSAGE_TOO_LONG_TEXT, /characters/);
});

test('emoji insertion goes at the caret or over the selection, and appends with no caret', () => {
    assert.deepEqual(insertTextAtCursor('hello world', '😀', 5, 5), { value: 'hello😀 world', caret: 7 });
    assert.deepEqual(insertTextAtCursor('hello world', '😀', 6, 11), { value: 'hello 😀', caret: 8 });
    assert.deepEqual(insertTextAtCursor('hi', '😀'), { value: 'hi😀', caret: 4 });
});

test('every emoji picker button is type=button so it never submits the message form', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/components/ui/EmojiPicker.tsx', 'utf8');
    // Each <button opening (multi-line, may hold arrow functions) must declare type="button" before its children.
    const openings = source.split('<button').slice(1).map((rest) => rest.slice(0, rest.indexOf('</button>') === -1 ? rest.length : rest.indexOf('</button>')));
    assert.ok(openings.length >= 3);
    for (const opening of openings) assert.match(opening, /type="button"/);
});
