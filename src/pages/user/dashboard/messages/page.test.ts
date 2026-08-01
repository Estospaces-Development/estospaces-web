import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const messagesPageSource = readFileSync(
    resolve(process.cwd(), 'src/pages/user/dashboard/messages/page.tsx'),
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
