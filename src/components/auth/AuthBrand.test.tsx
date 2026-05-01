import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import AuthBrand from './AuthBrand';

test('auth brand home link has a visible keyboard focus state', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <AuthBrand />
    </MemoryRouter>,
  );

  assert.match(markup, /aria-label="Estospaces home"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-orange-500/);
});
