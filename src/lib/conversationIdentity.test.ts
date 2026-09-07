import assert from 'node:assert/strict';
import test from 'node:test';

import { buildConversationIdentityDetails, type ConversationIdentity } from './conversationIdentity';

const identity = (id: string, overrides: Partial<ConversationIdentity> = {}): ConversationIdentity => ({
  id, title: 'Selected fast-track case', group: 'journeys', ...overrides,
});

test('Distinct identities need no extra label and a repeated ID is counted only once', () => {
  const row = identity('chat-one');
  assert.equal(buildConversationIdentityDetails([row, row]).size, 0);
  assert.equal(buildConversationIdentityDetails([
    row,
    identity('chat-two', { title: 'Named home' }),
    identity('chat-three', { title: 'Different home' }),
    identity('chat-four', { group: 'support' }),
  ]).size, 0);
});

test('Same titles with different contact subtitles still require distinct conversation identity', () => {
  const rows = [
    { ...identity('chat-one'), subtitle: 'Assigned manager' },
    { ...identity('chat-two'), subtitle: 'Property manager' },
  ];
  const details = buildConversationIdentityDetails(rows);
  assert.equal(details.get('chat-one'), 'Chat chat-one');
  assert.equal(details.get('chat-two'), 'Chat chat-two');
});

test('Collision comparison normalizes whitespace and case without changing the displayed address', () => {
  const details = buildConversationIdentityDetails([
    identity('chat-one', { address: '  Unit 1,   Riverside House  ' }),
    identity('chat-two', { title: ' SELECTED  FAST-TRACK CASE ', address: 'Unit 2, Riverside House' }),
  ]);
  assert.equal(details.get('chat-one'), 'Unit 1, Riverside House');
  assert.equal(details.get('chat-two'), 'Unit 2, Riverside House');
});

test('Same and missing addresses use the complete existing IDs even when their prefixes match', () => {
  const ids = ['abcdef12-0000-4000-8000-000000000001', 'abcdef12-0000-4000-8000-000000000002'];
  for (const addresses of [[undefined, undefined], ['Unit 1', ' unit 1 ']]) {
    const details = buildConversationIdentityDetails(ids.map((id, index) => identity(id, { address: addresses[index] })));
    assert.equal(details.get(ids[0]), `Chat ${ids[0]}`);
    assert.equal(details.get(ids[1]), `Chat ${ids[1]}`);
  }
});

test('Only unique useful addresses win over a chat reference within a collision group', () => {
  const details = buildConversationIdentityDetails([
    identity('chat-one', { address: 'Unit 1' }),
    identity('chat-two', { address: 'Unit 1' }),
    identity('chat-three', { address: 'Unit 2' }),
    identity('chat-four'),
  ]);
  assert.deepEqual([...details], [
    ['chat-one', 'Chat chat-one'], ['chat-two', 'Chat chat-two'],
    ['chat-three', 'Unit 2'], ['chat-four', 'Chat chat-four'],
  ]);
});

test('Identity details are order-independent and do not mutate source records', () => {
  const rows = [Object.freeze(identity('chat-one')), Object.freeze(identity('chat-two'))];
  const before = JSON.stringify(rows);
  const original = buildConversationIdentityDetails(rows);
  const reversed = buildConversationIdentityDetails([...rows].reverse());
  for (const row of rows) assert.equal(original.get(row.id), reversed.get(row.id));
  assert.equal(JSON.stringify(rows), before);
});

test('Internal QA and unavailable address placeholders do not become identity content', () => {
  const addresses = ['QA validation proof 1775036317781', 'Address unavailable', 'Unknown address', 'N/A', ''];
  const rows = addresses.map((address, index) => identity(`actual-chat-${index}`, { address }));
  const details = buildConversationIdentityDetails(rows);
  for (const row of rows) assert.equal(details.get(row.id), `Chat ${row.id}`);
});
