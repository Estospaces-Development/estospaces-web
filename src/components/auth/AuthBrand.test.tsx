import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import AuthBrand from './AuthBrand';

function withMockWindow(hostname: string, callback: () => void) {
  const originalWindow = globalThis.window;

  Object.defineProperty(globalThis, 'window', {
    value: {
      location: {
        hostname,
        origin: `https://${hostname}`,
        port: '',
      },
    },
    configurable: true,
  });

  try {
    callback();
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
      });
    }
  }
}

test('auth brand home link has a visible keyboard focus state', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <AuthBrand />
    </MemoryRouter>,
  );

  assert.match(markup, /aria-label="Estospaces home"/);
  assert.match(markup, /href="\/home"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-orange-500/);
});

test('auth brand sends app custom domains back to the marketing home', () => {
  withMockWindow('app.estospaces.com', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AuthBrand />
      </MemoryRouter>,
    );

    assert.match(markup, /href="https:\/\/estospaces\.com\/"/);
    assert.doesNotMatch(markup, /href="\/"/);
  });
});
