import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getApplicationPropertyDisplayTitle,
  isInternalApplicationTitle,
} from './applicationDisplayTitle';

test('application display titles hide generated mobile-live identifiers', () => {
  assert.equal(isInternalApplicationTitle('Mobile Live Approval mobile-live-1781121818495034'), true);
  assert.equal(
    getApplicationPropertyDisplayTitle(
      'Mobile Live Approval mobile-live-1781121818495034',
      '12 QA Verification Street, Chennai, 600001',
    ),
    '12 QA Verification Street, Chennai, 600001',
  );
});

test('application display titles keep human property titles', () => {
  assert.equal(isInternalApplicationTitle('Canal View Apartment'), false);
  assert.equal(
    getApplicationPropertyDisplayTitle('Canal View Apartment', '2 Canal Road, London'),
    'Canal View Apartment',
  );
});

test('application display titles use a stable fallback without title or address', () => {
  assert.equal(getApplicationPropertyDisplayTitle('', '', 'Property application'), 'Property application');
});
