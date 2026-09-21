import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');
const appProvidersSource = readFileSync(resolve(process.cwd(), 'src/components/providers/AppProviders.tsx'), 'utf8');

test('auth provider owns the product analytics provider context', () => {
  const authOpen = mainSource.indexOf('<AuthProvider>');
  const appProvidersOpen = mainSource.indexOf('<AppProviders>');
  const appProvidersClose = mainSource.indexOf('</AppProviders>');
  const authClose = mainSource.indexOf('</AuthProvider>');
  const analyticsOpen = appProvidersSource.indexOf('<ProductAnalyticsProvider>');
  const analyticsClose = appProvidersSource.indexOf('</ProductAnalyticsProvider>');

  assert.ok(authOpen >= 0, 'AuthProvider opening tag must exist');
  assert.ok(appProvidersOpen > authOpen, 'AppProviders must be inside AuthProvider');
  assert.ok(appProvidersClose > appProvidersOpen, 'AppProviders closing tag must exist');
  assert.ok(authClose > appProvidersClose, 'AuthProvider must close after AppProviders');
  assert.ok(analyticsOpen >= 0, 'ProductAnalyticsProvider opening tag must exist');
  assert.ok(analyticsClose > analyticsOpen, 'ProductAnalyticsProvider closing tag must exist');
});
