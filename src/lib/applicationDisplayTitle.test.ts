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

test('application display titles hide generated QA and dev titles', () => {
  const generatedTitles = [
    'Dev validation proof 1775036317781',
    'Dev Offer Path 1775288346751',
    'Dev Trace 1775288245172',
    'Dev Smoke Sale 1775287749081',
    'QA Admin Notice Rental 20260702000323',
    'QA Admin Notice Dashboard Search 20260702001933',
    'QA Manager Notice Dashboard Search 20260702003948',
    'QA FT Dashboard Workspace 20260701195308',
    'QA Address Match 20260701200737',
    'Issue209 Persist Proof 20260701213805',
    'QA Issue237 Fresh SLA round690-1783486126783',
    'Round896 Issue228 Fresh Assignment 1783610503279',
    'QA Board184-187 1782246572413',
  ];

  for (const title of generatedTitles) {
    assert.equal(isInternalApplicationTitle(title), true, title);
    assert.equal(
      getApplicationPropertyDisplayTitle(title, 'Address unavailable', 'Property application'),
      'Property application',
      title,
    );
  }
});

test('application display titles keep human property titles', () => {
  assert.equal(isInternalApplicationTitle('Canal View Apartment'), false);
  assert.equal(
    getApplicationPropertyDisplayTitle('Canal View Apartment', '2 Canal Road, London'),
    'Canal View Apartment',
  );
});

test('application display titles use real address before fallback', () => {
  assert.equal(
    getApplicationPropertyDisplayTitle('QA Admin Notice Rental 20260702000323', '12 Park Road, Chennai'),
    '12 Park Road, Chennai',
  );
});

test('application display titles use a stable fallback without title or address', () => {
  assert.equal(getApplicationPropertyDisplayTitle('', '', 'Property application'), 'Property application');
  assert.equal(
    getApplicationPropertyDisplayTitle('QA Address Match 20260701200737', 'Address unavailable', 'Property application'),
    'Property application',
  );
});
