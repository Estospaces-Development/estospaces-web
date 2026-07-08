import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import PublicHeader from './PublicHeader';

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

test('public header logo sends app custom domain users to the marketing home', () => {
  withMockWindow('app.estospaces.com', () => {
    const markup = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/search?q=apartment&location=Guwahati']}>
        <PublicHeader />
      </MemoryRouter>,
    );

    assert.match(markup, /aria-label="Estospaces home"/);
    assert.match(markup, /href="https:\/\/estospaces\.com\/"/);
    assert.match(markup, /href="\/search\?q=apartment&amp;location=Guwahati"/);
  });
});
