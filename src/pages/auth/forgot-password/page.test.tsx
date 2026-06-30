import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import ForgotPasswordPage from './page';

test('forgot password form limits email length and exposes focus states', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>,
  );

  assert.match(markup, /maxLength="254"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-orange-500/);
});
