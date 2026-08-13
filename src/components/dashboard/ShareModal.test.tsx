import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ShareModal from './ShareModal';

const shareModalSource = readFileSync(
  resolve(process.cwd(), 'src/components/dashboard/ShareModal.tsx'),
  'utf8',
);

test('share property modal exposes dialog semantics and named controls', () => {
  const markup = renderToStaticMarkup(
    <ShareModal
      property={{
        id: 'property-123',
        title: 'Accessible Test Home',
      }}
      onClose={() => {}}
    />,
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="share-property-title"/);
  assert.match(markup, /aria-describedby="share-property-description"/);
  assert.match(markup, /id="share-property-title"[^>]*>Share this property/);
  assert.match(markup, /id="share-property-description"[^>]*>Share the public listing for Accessible Test Home\./);
  assert.match(markup, /aria-label="Close share property dialog"/);
  assert.match(markup, /<label for="share-property-link"/);
  assert.match(markup, /id="share-property-link"/);
  assert.match(markup, /aria-label="Copy property link"/);
  assert.match(markup, /aria-label="Share property via Email"/);
  assert.match(markup, /aria-label="Share property via WhatsApp"/);
  assert.match(markup, /aria-label="Share property via LinkedIn"/);
  assert.match(markup, /\/user\/properties\/property-123/);
  assert.doesNotMatch(markup, /\/property\/property-123/);
  assert.doesNotMatch(markup, /manager\/dashboard\/properties\/edit/);
});

test('share property modal traps focus, restores focus, and isolates social popups', () => {
  assert.match(shareModalSource, /event\.key !== "Tab"/);
  assert.match(shareModalSource, /returnFocusTo\?\.focus\(\)/);
  assert.match(shareModalSource, /window\.open\(target, "_blank", "noopener,noreferrer"\)/);
  assert.match(shareModalSource, /event\.key === "Escape"/);
});
