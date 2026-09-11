import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

test('terms review action keeps the mobile touch target at least 44px tall', () => {
  const source = fs.readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

  assert.match(source, /onClick=\{openTermsModal\}\s*className=\{`[^`]*min-h-11[^`]*`\}/);
});

test('terms dialog bounds its height and keeps acceptance outside the shrinking scroll region', () => {
  const markup = renderToStaticMarkup(
    <TermsAcceptanceModal isOpen canAccept={false} onClose={() => {}} onAccept={() => {}} onReachedEnd={() => {}} />,
  );
  assert.match(markup, /flex max-h-\[calc\(100dvh-2rem\)\] flex-col/);
  assert.match(markup, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(markup, /data-terms-actions="true" class="shrink-0/);
  assert.match(markup, /disabled=""[^>]*>I Have Read and Agree/);
});

test('terms acceptance is enabled only after reaching the end and closed dialog renders nothing', () => {
  const props = { onClose() {}, onAccept() {}, onReachedEnd() {} };
  const markup = renderToStaticMarkup(<TermsAcceptanceModal {...props} isOpen canAccept />);
  assert.doesNotMatch(markup, /disabled=""/);
  assert.equal(renderToStaticMarkup(<TermsAcceptanceModal {...props} isOpen={false} canAccept={false} />), '');
});
