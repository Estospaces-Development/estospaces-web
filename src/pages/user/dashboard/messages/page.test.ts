import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const messagesPageSource = readFileSync(
    resolve(process.cwd(), 'src/pages/user/dashboard/messages/page.tsx'),
    'utf8',
);
const messageInputSource = readFileSync(
    resolve(process.cwd(), 'src/components/dashboard/messaging/MessageInput.tsx'),
    'utf8',
);
const conversationThreadSource = readFileSync(
    resolve(process.cwd(), 'src/components/dashboard/messaging/ConversationThread.tsx'),
    'utf8',
);
const emojiPickerSource = readFileSync(
    resolve(process.cwd(), 'src/components/ui/EmojiPicker.tsx'),
    'utf8',
);

test('desktop messages keeps the conversation rail and content pane in a stable twelve-column workspace', () => {
    assert.doesNotMatch(messagesPageSource, /\{mobileView === 'list' && \(/);
    assert.match(messagesPageSource, /mobileView === 'thread' \? 'hidden lg:block' : ''/);
    assert.match(messagesPageSource, /mobileView === 'list' \? 'hidden lg:flex' : 'flex'/);
    assert.match(messagesPageSource, /lg:col-span-4/);
    assert.match(messagesPageSource, /lg:col-span-8/);
});

test('mobile messages still switches between the conversation list and selected thread', () => {
    assert.match(messagesPageSource, /setMobileView\('thread'\)/);
    assert.match(messagesPageSource, /setMobileView\('list'\)/);
    assert.match(messagesPageSource, /lg:hidden/);
});

test('selected mobile conversation owns the available viewport above bottom navigation', () => {
    assert.match(messagesPageSource, /isMobileThreadOpen/);
    assert.match(messagesPageSource, /h-\[calc\(100dvh-8\.75rem\)\]/);
    assert.match(messagesPageSource, /h-full min-h-0/);
    assert.match(messagesPageSource, /hidden lg:block/);
});

test('mobile composer remains a compact three-control row with accessible targets', () => {
    assert.match(messageInputSource, /grid-cols-\[2\.75rem_minmax\(0,1fr\)_2\.75rem\]/);
    assert.match(messageInputSource, /aria-label="Message"/);
    assert.match(messageInputSource, /aria-label="Attach files"/);
    assert.match(messageInputSource, /aria-label="Send message"/);
    assert.match(messageInputSource, /pendingFiles\.length > 0 \|\| composerError \? 'mt-2 flex' : 'sr-only'/);
});

test('mobile conversation metadata and emoji picker reflow at narrow widths', () => {
    assert.match(conversationThreadSource, /grid grid-cols-3 gap-1\.5/);
    assert.match(conversationThreadSource, /<span className="sm:hidden">Property<\/span>/);
    assert.match(conversationThreadSource, /<span className="sm:hidden">Support<\/span>/);
    assert.match(emojiPickerSource, /h-\[min\(24rem,calc\(100dvh-9rem\)\)\]/);
    assert.match(emojiPickerSource, /-right-12/);
});
