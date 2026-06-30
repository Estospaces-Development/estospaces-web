import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { TermsAcceptanceModal } from './page';

test('terms acceptance modal is announced as a dialog with focusable controls', () => {
  const markup = renderToStaticMarkup(
    <TermsAcceptanceModal
      isOpen
      canAccept={false}
      onClose={() => {}}
      onAccept={() => {}}
      onReachedEnd={() => {}}
    />,
  );

  assert.match(markup, /role="dialog"/);
  assert.match(markup, /aria-modal="true"/);
  assert.match(markup, /aria-labelledby="terms-dialog-title"/);
  assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /focus-visible:ring-2/);
});
