import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { getRegistrationDeliveryCopy, TermsAcceptanceModal } from './page';

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

test('registration success copy does not claim an email was sent when provider acceptance failed', () => {
  const copy = getRegistrationDeliveryCopy('person@example.com', false);

  assert.equal(copy.title, 'Account created — email delayed');
  assert.match(copy.message, /could not confirm delivery/i);
  assert.doesNotMatch(copy.message, /we sent/i);
  assert.match(copy.guidance, /resend/i);
});

test('registration success copy confirms provider acceptance when delivery was acknowledged', () => {
  const copy = getRegistrationDeliveryCopy('person@example.com', true);

  assert.equal(copy.title, 'Account created');
  assert.match(copy.message, /sent a verification link/i);
  assert.match(copy.guidance, /spam/i);
});
