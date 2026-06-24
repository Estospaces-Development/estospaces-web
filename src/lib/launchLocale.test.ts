import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatLaunchCurrency,
  formatLaunchPinCode,
  formatLaunchPropertyLocation,
  formatLaunchPropertyText,
  normalizeLaunchCurrencyText,
} from '@/lib/launchLocale';

test('launch locale formats India currency and rewrites legacy UK display data', () => {
  assert.equal(formatLaunchCurrency(125000), '\u20b91,25,000');
  assert.equal(normalizeLaunchCurrencyText('GBP 125,000'), 'INR 125,000');
  assert.equal(normalizeLaunchCurrencyText('\u00a3125,000'), '\u20b9125,000');
  assert.equal(formatLaunchPropertyLocation('Stockmans Way, Belfast'), 'Stockmans Way, Chennai');
  assert.equal(formatLaunchPropertyLocation('123, Preston, UK'), '123, Chennai');
  assert.equal(formatLaunchPropertyLocation('Buy request - Westminster'), 'Buy request - Chennai');
  assert.equal(formatLaunchPropertyLocation(['Bristol', 'BT1 1AA']), 'Chennai');
  assert.equal(formatLaunchPropertyLocation(['Apt 5D', 'BT9 7GG']), 'Apt 5D');
  assert.equal(formatLaunchPropertyText('Luxurious 3BHK in Preston - JEEVI Groups'), 'Luxurious 3BHK in Chennai - JEEVI Groups');
  assert.equal(formatLaunchPinCode('600001'), '600001');
  assert.equal(formatLaunchPinCode('SW1A 1AA'), '');
});
