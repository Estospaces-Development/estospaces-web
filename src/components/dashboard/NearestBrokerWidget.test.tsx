import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import NearestBrokerWidget from './NearestBrokerWidget';
import { ToastProvider } from '@/contexts/ToastContext';

test('nearest broker actions expose visible keyboard focus states', () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <ToastProvider>
        <NearestBrokerWidget />
      </ToastProvider>
    </MemoryRouter>,
  );

  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /focus-visible:ring-orange-500/);
});
