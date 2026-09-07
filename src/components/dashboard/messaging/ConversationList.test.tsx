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
> & Partial<Pick<Conversation, 'messages'>>;

const renderConversation = (overrides: Partial<ConversationFixture> = {}) => {
  const conversation: ConversationFixture = {
    id: 'fixture-conversation', propertyTitle: 'Named home', contactName: 'Assigned manager',
    lastMessage: '', lastMessageTime: '', unreadCount: 0, isMuted: false, ...overrides,
  };
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
      return { useMessages: () => ({ conversations: [conversation], searchQuery: '', setSearchQuery() {} }) };
    }
    if (id === '@/components/ui/Avatar') return { __esModule: true, default: () => null };
    return require(id.startsWith('@/') ? resolve(process.cwd(), 'src', id.slice(2)) : id);
  };
  // Render the real list; only its context and unrelated avatar are isolated.
  new Function('require', 'module', 'exports', compiled)(load, componentModule, componentModule.exports);
  const markup = renderToStaticMarkup(<componentModule.exports.default selectedConversationId={null} onSelectConversation={() => {}} />);
  const label = markup.match(/<button\b[^>]*aria-label="([^"]*)"/)?.[1];
  assert.ok(label, 'Conversation button must expose an accessible name');
  return { markup, label };
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
