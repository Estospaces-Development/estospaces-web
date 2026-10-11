import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../pages/public/contact/page.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../components/layout/Footer.tsx', import.meta.url), 'utf8');

test('contact page and footer show no placeholder phone numbers or office addresses', () => {
  assert.doesNotMatch(page + footer, /1234 ?5678|7123 ?4567|123 Property Street|456 Property Avenue|EC1A 1BB/);
  assert.match(page, /mailto:hello@estospaces\.com/);
});
