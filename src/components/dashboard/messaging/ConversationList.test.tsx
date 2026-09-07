import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

import type { useMessages } from '@/contexts/MessagesContext';

type Conversation = ReturnType<typeof useMessages>['conversations'][number];
type ConversationFixture = Pick<Conversation,
  'id' | 'propertyTitle' | 'contactName' | 'lastMessage' | 'lastMessageTime' | 'unreadCount' | 'isMuted'
> & Partial<Pick<Conversation, 'messages' | 'propertyAddress' | 'isArchived'>>;

const fixture = (overrides: Partial<ConversationFixture> = {}): ConversationFixture => ({
    id: 'fixture-conversation', propertyTitle: 'Named home', contactName: 'Assigned manager',
    lastMessage: '', lastMessageTime: '', unreadCount: 0, isMuted: false, ...overrides,
});

const renderConversations = (conversations: ConversationFixture[], allConversations = conversations) => {
  const require = createRequire(import.meta.url);
  const source = readFileSync(resolve(process.cwd(), 'src/components/dashboard/messaging/ConversationList.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true, target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const componentModule = { exports: {} as { default: React.ComponentType<{
    selectedConversationId: string | null;
    onSelectConversation: (id: string | null) => void;
  }> } };
  const load = (id: string): unknown => {
    if (id === '@/contexts/MessagesContext') {
      return { useMessages: () => ({ conversations, allConversations, searchQuery: '', setSearchQuery() {} }) };
    }
    if (id === '@/components/ui/Avatar') return { __esModule: true, default: () => null };
    return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
  };
  // Render the real list; only its context and unrelated avatar are isolated.
  new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
  const markup = renderToStaticMarkup(<componentModule.exports.default selectedConversationId={null} onSelectConversation={() => {}} />);
  const labels = [...markup.matchAll(/<button\b[^>]*aria-label="([^"]*)"/g)].map((match) => match[1]);
  assert.equal(labels.length, conversations.length, 'Each conversation must expose an accessible name');
  return { markup, labels };
};

const renderConversation = (overrides: Partial<ConversationFixture> = {}) => {
  const { markup, labels } = renderConversations([fixture(overrides)]);
  return { markup, label: labels[0] };
};

test('Dated conversations without preview text announce the visible activity date without claiming no message', () => {
  const { markup, label } = renderConversation({ lastMessageTime: '2 Sept' });
  assert.match(markup, />2 Sept<\/span>/);
  assert.doesNotMatch(label, /No recent message/);
  assert.match(label, /2 Sept/);
});

test('Conversation accessible names preserve the real preview, title, unread count and mute state', () => {
  const { markup, label } = renderConversation({
    lastMessage: 'Latest viewing update', lastMessageTime: '2 Sept', unreadCount: 3, isMuted: true,
  });
  assert.match(label, /Named home\. Assigned manager\. 3 unread\. Muted/);
  assert.match(label, /Latest viewing update/);
  assert.match(markup, />Latest viewing update<\/p>/);
  assert.doesNotMatch(label, /No recent message/);
});

test('Attachment-only conversations do not equate empty message text with absent activity', () => {
  const { label } = renderConversation({
    lastMessageTime: '2 Sept',
    messages: [{
      id: 'fixture-message', senderId: 'fixture-manager', senderType: 'agent', text: '',
      timestamp: '2026-09-02T10:00:00Z', time: '10:00', read: true, delivered: true,
      attachments: [{ file_url: '/fixture-attachment', file_name: 'Inventory.pdf', mime_type: 'application/pdf' }],
    }],
  });
  assert.doesNotMatch(label, /No recent message/);
  assert.match(label, /2 Sept/);
  assert.doesNotMatch(label, /Inventory\.pdf|Attachment/, 'Do not invent a preview the list does not receive');
});

test('Undated empty conversations announce known identity and state without inventing activity', () => {
  const { label } = renderConversation();
  assert.equal(label, 'Named home. Assigned manager. Read. Notifications on');
});

test('Identically named conversations expose their distinct authorized addresses without renaming titles', () => {
  const rows = [
    fixture({ id: 'chat-one', propertyTitle: 'Selected fast-track case', propertyAddress: 'Unit 1, Riverside House' }),
    fixture({ id: 'chat-two', propertyTitle: 'Selected fast-track case', propertyAddress: 'Unit 2, Riverside House' }),
  ];
  const { markup, labels } = renderConversations(rows);
  for (const [index, row] of rows.entries()) {
    assert.match(labels[index], /^Selected fast-track case\. Assigned manager\./);
    assert.ok(labels[index].includes(row.propertyAddress || ''));
    assert.ok(markup.includes(`>${row.propertyAddress}</p>`), 'Address must be visibly rendered, not only announced');
  }
  assert.notEqual(labels[0], labels[1]);
});

for (const address of [undefined, 'Unit 1, Riverside House']) {
  test(`Same-title conversations with ${address ? 'the same' : 'missing'} addresses expose actual chat references`, () => {
    const ids = ['abcdef12-0000-4000-8000-000000000001', 'abcdef12-0000-4000-8000-000000000002'];
    const { markup, labels } = renderConversations(ids.map((id) => fixture({ id, propertyAddress: address })));
    for (const [index, id] of ids.entries()) {
      assert.ok(labels[index].includes(`Chat ${id}`), 'Shared ID prefixes must not make references collide');
      assert.ok(markup.includes(`>Chat ${id}</p>`));
    }
    assert.notEqual(labels[0], labels[1]);
  });
}

test('A unique address is retained while an addressless peer gets its actual chat reference', () => {
  const { labels } = renderConversations([
    fixture({ id: 'chat-one', propertyAddress: 'Unit 1, Riverside House' }),
    fixture({ id: 'chat-two' }),
  ]);
  assert.match(labels[0], /Unit 1, Riverside House/);
  assert.match(labels[1], /Chat chat-two/);
});

test('Conversation identity stays stable across ordering and filters using the full authorized collection', () => {
  const all = [
    fixture({ id: 'chat-one', propertyAddress: 'Unit 1, Riverside House', unreadCount: 1 }),
    fixture({ id: 'chat-two', propertyAddress: 'Unit 2, Riverside House', isArchived: true }),
  ];
  const original = renderConversations(all).labels;
  assert.match(original[0], /Unit 1, Riverside House/);
  assert.deepEqual(renderConversations([...all].reverse(), [...all].reverse()).labels, [...original].reverse());
  assert.deepEqual(renderConversations([all[0]], all).labels, [original[0]]);
  assert.deepEqual(renderConversations([all[1]], all).labels, [original[1]]);
});

test('Repeated same IDs are not mistaken for distinct conversations and different titles stay unchanged', () => {
  const row = fixture();
  const original = renderConversations([row]).labels[0];
  assert.deepEqual(renderConversations([row, row]).labels, [original, original]);
  assert.equal(renderConversations([row, fixture({ id: 'chat-two', propertyTitle: 'Different home' })]).labels[0], original);
});

test('Same selected-case titles receive distinct identity even when their contacts differ', () => {
  const rows = [
    fixture({ id: 'case-chat-one', propertyTitle: 'Selected fast-track case', contactName: 'Assigned manager' }),
    fixture({ id: 'case-chat-two', propertyTitle: 'Selected fast-track case', contactName: 'Property manager' }),
  ];
  const { labels, markup } = renderConversations(rows);
  for (const [index, row] of rows.entries()) {
    assert.ok(labels[index].startsWith(`Selected fast-track case. ${row.contactName}.`));
    assert.ok(labels[index].includes(`Chat ${row.id}`), 'A different contact does not identify which case the same title refers to');
    assert.ok(markup.includes(`>Chat ${row.id}</p>`));
  }
});

test('Internal or unavailable address placeholders are never recovered into conversation identity labels', () => {
  const { markup, labels } = renderConversations([
    fixture({ id: 'chat-one', propertyAddress: 'QA validation proof 1775036317781' }),
    fixture({ id: 'chat-two', propertyAddress: 'Address unavailable' }),
  ]);
  assert.match(labels[0], /Chat chat-one/);
  assert.match(labels[1], /Chat chat-two/);
  assert.doesNotMatch(markup, /QA validation proof|Address unavailable/);
});

test('Distinguishing identity text wraps instead of truncating at narrow sidebar widths', () => {
  const { markup } = renderConversations([fixture({ id: 'chat-one' }), fixture({ id: 'chat-two' })]);
  const classes = [...markup.matchAll(/<p class="([^"]*)">Chat chat-(?:one|two)<\/p>/g)].map((match) => match[1]);
  assert.equal(classes.length, 2);
  for (const className of classes) {
    assert.match(className, /whitespace-normal/);
    assert.match(className, /\[overflow-wrap:anywhere\]/);
    assert.doesNotMatch(className, /truncate|line-clamp/);
  }
});
