import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatLaunchCurrency,
  formatLaunchCurrencyForCountry,
  formatLaunchLocationCode,
  formatLaunchLocationCodeSentenceLabel,
  formatLaunchPinCode,
  formatLaunchPropertyLocation,
  formatLaunchPropertyText,
  getLaunchCountryFromLocationCode,
  getLaunchCityFromPinCode,
  getLaunchLocationCodeErrorMessage,
  getLaunchLocationCodeLabel,
  isValidLaunchLocationCodeForCountry,
  normalizeLaunchLocationCodeErrorMessage,
  normalizeLaunchCurrencyText,
} from '@/lib/launchLocale';

test('launch locale formats India currency and preserves India plus UK display data', () => {
  assert.equal(formatLaunchCurrency(125000), '\u20b91,25,000');
  assert.equal(formatLaunchCurrencyForCountry(2400, { countryCode: 'GB' }), '\u00a32,400');
  assert.equal(formatLaunchCurrencyForCountry(2400, { currencyCode: 'GBP', monthly: true }), '\u00a32,400/mo');
  assert.equal(formatLaunchCurrencyForCountry(125000, { countryCode: 'IN' }), '\u20b91,25,000');
  assert.equal(normalizeLaunchCurrencyText('GBP 125,000'), 'GBP 125,000');
  assert.equal(normalizeLaunchCurrencyText('\u00a3125,000'), '\u00a3125,000');
  assert.equal(formatLaunchPropertyLocation('Stockmans Way, Belfast'), 'Stockmans Way, Belfast');
  assert.equal(formatLaunchPropertyLocation('123, Preston, UK'), '123, Preston, UK');
  assert.equal(formatLaunchPropertyLocation('Buy request - Westminster'), 'Buy request - Westminster');
  assert.equal(formatLaunchPropertyLocation(['Bristol', 'BT1 1AA']), 'Bristol, BT1 1AA');
  assert.equal(formatLaunchPropertyLocation(['Apt 5D', 'BT9 7GG']), 'Apt 5D, BT9 7GG');
  assert.equal(
    formatLaunchPropertyLocation(['Chennai123', 'Chennai', '987123', 'Chennai', '987123']),
    'Chennai123, Chennai, 987123',
  );
  assert.equal(formatLaunchPropertyText('Luxurious 3BHK in Preston - JEEVI Groups'), 'Luxurious 3BHK in Preston - JEEVI Groups');
  assert.equal(formatLaunchPinCode('600001'), '600001');
  assert.equal(formatLaunchPinCode('SW1A 1AA'), '');
  assert.equal(getLaunchCityFromPinCode('600001', 'IN', 'India'), 'Chennai');
  assert.equal(getLaunchCityFromPinCode('600001', 'GB', 'United Kingdom'), null);
});

test('launch locale selects India or UK from location code and country', () => {
  assert.equal(getLaunchCountryFromLocationCode('600001'), 'IN');
  assert.equal(getLaunchCountryFromLocationCode('SW1A 1AA'), 'GB');
  assert.equal(formatLaunchLocationCode('sw1a1aa'), 'SW1A 1AA');
  assert.equal(getLaunchLocationCodeLabel('IN', 'India'), 'PIN code');
  assert.equal(getLaunchLocationCodeLabel('GB', 'United Kingdom'), 'Postcode');
  assert.equal(formatLaunchLocationCodeSentenceLabel('PIN code'), 'PIN code');
  assert.equal(formatLaunchLocationCodeSentenceLabel('Postcode'), 'postcode');
  assert.equal(formatLaunchLocationCodeSentenceLabel('PIN code / postcode'), 'pin code / postcode');
  assert.equal(isValidLaunchLocationCodeForCountry('600001', 'IN', 'India'), true);
  assert.equal(isValidLaunchLocationCodeForCountry('SW1A 1AA', 'IN', 'India'), false);
  assert.equal(isValidLaunchLocationCodeForCountry('SW1A 1AA', 'GB', 'United Kingdom'), true);
  assert.equal(isValidLaunchLocationCodeForCountry('600001', 'GB', 'United Kingdom'), false);
  assert.equal(getLaunchLocationCodeErrorMessage('IN', 'India'), 'Please enter a valid 6-digit Indian PIN code');
  assert.equal(getLaunchLocationCodeErrorMessage('GB', 'United Kingdom'), 'Please enter a valid UK postcode');
  assert.equal(getLaunchLocationCodeErrorMessage(undefined, undefined, '600001'), 'Please enter a valid 6-digit Indian PIN code');
  assert.equal(getLaunchLocationCodeErrorMessage(undefined, undefined, 'SW1A 1AA'), 'Please enter a valid UK postcode');
  assert.equal(
    normalizeLaunchLocationCodeErrorMessage('location_postcode is required and must be a valid UK postcode', '600001'),
    'Please enter a valid 6-digit Indian PIN code',
  );
  assert.equal(
    normalizeLaunchLocationCodeErrorMessage('location_postcode is required and must be a valid UK postcode', 'SW1A 1AA'),
    'Please enter a valid UK postcode',
  );
});
