import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const mainSource = readFileSync(resolve(process.cwd(), 'src/main.tsx'), 'utf8');

test('auth provider owns the product analytics provider context', () => {
  const authOpen = mainSource.indexOf('<AuthProvider>');
  const analyticsOpen = mainSource.indexOf('<ProductAnalyticsProvider>');
  const analyticsClose = mainSource.indexOf('</ProductAnalyticsProvider>');
  const authClose = mainSource.indexOf('</AuthProvider>');

  assert.ok(authOpen >= 0, 'AuthProvider opening tag must exist');
  assert.ok(analyticsOpen > authOpen, 'ProductAnalyticsProvider must be inside AuthProvider');
  assert.ok(analyticsClose > analyticsOpen, 'ProductAnalyticsProvider closing tag must exist');
  assert.ok(authClose > analyticsClose, 'AuthProvider must close after ProductAnalyticsProvider');
});
