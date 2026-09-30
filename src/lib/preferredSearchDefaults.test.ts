import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLaunchLocationCodeErrorMessage,
  getLaunchLocationCodeLabel,
  getLaunchLocationCodePlaceholder,
  isValidLaunchLocationCodeForCountry,
} from './launchLocale';
import { getMarketCurrencyCode, resolveLocationFormMarket, resolvePreferredSearchDefaults } from './preferredSearchDefaults';

test('country-level search preference selects a market without treating the country as a city', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('India'), { market: 'IN', location: '' });
  assert.deepEqual(resolvePreferredSearchDefaults('United Kingdom'), { market: 'GB', location: '' });
});

test('recognized preferred cities select their market and retain a usable city filter', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('Chennai'), { market: 'IN', location: 'Chennai' });
  assert.deepEqual(resolvePreferredSearchDefaults('Chennai, Tamil Nadu'), { market: 'IN', location: 'Chennai' });
});

test('unrecognized preference does not silently switch the account market', () => {
  assert.deepEqual(resolvePreferredSearchDefaults('Oxford Heights'), { market: null, location: '' });
  assert.deepEqual(resolvePreferredSearchDefaults(''), { market: null, location: '' });
});

test('location form market follows the typed city before the account market (web-app#661, #662)', () => {
  assert.equal(resolveLocationFormMarket({ location: 'London', fallback: 'IN' }), 'GB');
  assert.equal(resolveLocationFormMarket({ location: 'London, UK', locationCode: '600001', fallback: 'IN' }), 'GB');
  assert.equal(resolveLocationFormMarket({ location: 'Chennai, Adyar', fallback: 'GB' }), 'IN');
  assert.equal(resolveLocationFormMarket({ location: 'United Kingdom', fallback: 'IN' }), 'GB');
});

test('location form market falls back to the location code, then the account market', () => {
  assert.equal(resolveLocationFormMarket({ location: '', locationCode: 'SW1A 1AA', fallback: 'IN' }), 'GB');
  assert.equal(resolveLocationFormMarket({ location: 'Oxford Heights', locationCode: 'SW1A', fallback: 'IN' }), 'IN');
  assert.equal(resolveLocationFormMarket({ location: null, fallback: 'GB' }), 'GB');
});

test('London location drives UK postcode validation, label, placeholder and GBP budget', () => {
  const market = resolveLocationFormMarket({ location: 'London', locationCode: 'SW1A', fallback: 'IN' });
  assert.equal(getLaunchLocationCodeLabel(market), 'Postcode');
  assert.equal(getLaunchLocationCodePlaceholder(market), 'e.g. SW1A 1AA');
  assert.equal(isValidLaunchLocationCodeForCountry('SW1A', market), false);
  assert.equal(getLaunchLocationCodeErrorMessage(market, undefined, 'SW1A'), 'Please enter a valid UK postcode');
  assert.equal(isValidLaunchLocationCodeForCountry('SW1A 1AA', market), true);
  assert.equal(isValidLaunchLocationCodeForCountry('600001', market), false);
  assert.equal(getMarketCurrencyCode(market), 'GBP');
});

test('Indian location keeps the 6-digit PIN code rules and INR budget', () => {
  const market = resolveLocationFormMarket({ location: 'Chennai', locationCode: '6000', fallback: 'GB' });
  assert.equal(getLaunchLocationCodeLabel(market), 'PIN code');
  assert.equal(getLaunchLocationCodeErrorMessage(market, undefined, '6000'), 'Please enter a valid 6-digit Indian PIN code');
  assert.equal(isValidLaunchLocationCodeForCountry('600001', market), true);
  assert.equal(getMarketCurrencyCode(market), 'INR');
});
