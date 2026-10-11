import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../pages/public/contact/page.tsx', import.meta.url), 'utf8');
const footer = readFileSync(new URL('../components/layout/Footer.tsx', import.meta.url), 'utf8');

test('contact page and footer show no placeholder phone numbers or office addresses', () => {
  assert.doesNotMatch(page + footer, /1234 ?5678|7123 ?4567|123 Property Street|456 Property Avenue|EC1A 1BB/);
  assert.match(page, /mailto:hello@estospaces\.com/);
});

test('contact page and footer offer the real phone for calls and WhatsApp', () => {
  for (const source of [page, footer]) {
    assert.match(source, /href="tel:\+447467105410"/);
    assert.match(source, /href="https:\/\/wa\.me\/447467105410"/);
    assert.match(source, /\+44 7467 105410/);
  }
});
