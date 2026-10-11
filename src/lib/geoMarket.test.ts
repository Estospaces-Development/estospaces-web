import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeGeoCountryCode,
  resolveGeoMarket,
  getCatalogueGeoSignals,
  getCataloguePinnedMarket,
  getExplicitUserMarket,
  getGeoMarketSignalsFromUser,
  getUserGeoSignals,
  mergeWithBrowserSignals,
  resolveGeoMarketFromClientHint,
} from "@/lib/geoMarket";

test("geo market resolves India and UK from IP/header style country signals", () => {
  assert.equal(normalizeGeoCountryCode("IN"), "IN");
  assert.equal(normalizeGeoCountryCode("India"), "IN");
  assert.equal(normalizeGeoCountryCode("GB"), "GB");
  assert.equal(normalizeGeoCountryCode("England"), "GB");
  assert.equal(resolveGeoMarketFromClientHint({ cloudflareCountry: "IN" }), "IN");
  assert.equal(resolveGeoMarketFromClientHint({ appEngineCountry: "GB" }), "GB");
});

test("geo market resolves from location code before browser locale fallback", () => {
  assert.equal(resolveGeoMarket({ locationCode: "600001", acceptLanguage: "en-GB" }), "IN");
  assert.equal(resolveGeoMarket({ locationCode: "SW1A 1AA", acceptLanguage: "en-IN" }), "GB");
});

test("geo market uses browser language and timezone fallbacks when no country header exists", () => {
  assert.equal(resolveGeoMarket({ acceptLanguage: "en-IN,en;q=0.9" }), "IN");
  assert.equal(resolveGeoMarket({ acceptLanguage: "en-GB,en;q=0.9" }), "GB");
});


test("geo market extracts country context from authenticated user metadata", () => {
  const signals = getGeoMarketSignalsFromUser({
    countryCode: "GB",
    postcode: "SW1A 1AA",
    user_metadata: { country: "India", postcode: "600001" },
  });

  assert.deepEqual(signals, {
    countryCode: "GB",
    countryName: "India",
    locationCode: "SW1A 1AA",
  });
  assert.equal(resolveGeoMarket(signals), "GB");
});


test("geo market does not let client IP override authenticated user country", () => {
  assert.equal(resolveGeoMarketFromClientHint({ cloudflareCountry: "IN" }, { countryCode: "GB" }), "GB");
  assert.equal(resolveGeoMarketFromClientHint({ cloudflareCountry: "GB" }, { locationCode: "600001" }), "IN");
});

test('an India device stays in India even when the browser sends British English', () => {
  for (const timeZone of ['Asia/Kolkata', 'Asia/Calcutta']) {
    assert.equal(resolveGeoMarket({ acceptLanguage: 'en-GB', timeZone }), 'IN');
    assert.equal(resolveGeoMarketFromClientHint({ acceptLanguage: 'en-GB' }, { acceptLanguage: 'en-US,en-IN', timeZone }), 'IN');
  }
  assert.equal(resolveGeoMarket({ acceptLanguage: 'en-IN', timeZone: 'Europe/London' }), 'GB');
  assert.equal(resolveGeoMarket({ acceptLanguage: 'en-GB' }), 'GB');
  assert.equal(resolveGeoMarket({ countryName: 'United Kingdom', timeZone: 'Asia/Kolkata' }), 'GB');
  assert.equal(resolveGeoMarket({ countryCode: 'GB', timeZone: 'Asia/Kolkata' }), 'GB');
});

test('the account country outranks postcode and stored code', () => {
  assert.equal(getExplicitUserMarket({ country: 'India', postcode: 'PR1 2NJ' }), 'IN');
  assert.equal(getExplicitUserMarket({ country: 'United Kingdom', countryCode: 'IN' }), 'GB');
  assert.equal(getExplicitUserMarket({ user_metadata: { country_code: 'IN' } }), 'IN');
  assert.equal(getExplicitUserMarket({ postcode: '600020' }), null);
  assert.equal(getExplicitUserMarket(null), null);
});

test('catalogue market: typed postcode, then account country, else unpinned', () => {
  const indiaWithUkPostcode = { country: 'India', postcode: 'PR1 2NJ' };
  assert.equal(getCataloguePinnedMarket(indiaWithUkPostcode), 'IN');
  assert.equal(getCataloguePinnedMarket(indiaWithUkPostcode, 'SW1A 1AA'), 'GB');
  assert.equal(getCataloguePinnedMarket({ country: 'United Kingdom' }, '600020'), 'IN');
  assert.equal(getCataloguePinnedMarket({ country: 'United Kingdom' }, 'London'), 'GB');
  assert.equal(getCataloguePinnedMarket({ postcode: '600020' }), null);
  assert.equal(getCataloguePinnedMarket(null, ''), null);
});

test('unset hook signals keep the browser time zone (India device, en-GB, no country)', () => {
  const browser = { acceptLanguage: 'en-GB', timeZone: 'Asia/Kolkata' };
  const hookSignals = { countryCode: undefined, countryName: undefined, locationCode: undefined, acceptLanguage: undefined, timeZone: undefined };
  const merged = mergeWithBrowserSignals(browser, hookSignals);
  assert.equal(merged.timeZone, 'Asia/Kolkata');
  assert.equal(resolveGeoMarket(merged), 'IN');
  assert.equal(resolveGeoMarketFromClientHint({ acceptLanguage: 'en-GB' }, merged), 'IN');
  assert.equal(resolveGeoMarket(mergeWithBrowserSignals(browser, { countryCode: 'GB' })), 'GB');
  assert.equal(resolveGeoMarket(mergeWithBrowserSignals({ acceptLanguage: 'en-IN', timeZone: 'Europe/London' }, {})), 'GB');
});

test("an unset override never erases the account's saved postcode", () => {
  const user = { postcode: 'SW1A 1AA' };
  for (const unset of [null, undefined, '']) {
    assert.equal(getUserGeoSignals(user, { locationCode: unset }).locationCode, 'SW1A 1AA');
  }
  assert.equal(getUserGeoSignals(user, { locationCode: '600001' }).locationCode, '600001');
  assert.equal(getUserGeoSignals({ user_metadata: { postcode: 'SW1A 1AA' } }, { locationCode: undefined }).locationCode, 'SW1A 1AA');
});

test('catalogue signals: typed postcode, account country, saved city/country preference, then saved postcode', () => {
  const browser = { acceptLanguage: 'en-IN', timeZone: 'Asia/Kolkata' };
  const marketOf = (signals: ReturnType<typeof getCatalogueGeoSignals>) => resolveGeoMarket(mergeWithBrowserSignals(browser, signals));

  // saved UK postcode, no country, India time zone: the postcode wins over the time zone
  assert.equal(marketOf(getCatalogueGeoSignals({ postcode: 'SW1A 1AA' }, { locationCode: null }, null)), 'GB');
  // India account country wins over a saved UK postcode
  assert.equal(marketOf(getCatalogueGeoSignals({ country: 'India', postcode: 'SW1A 1AA' }, { locationCode: null }, null)), 'IN');
  // a typed postcode wins over the account country
  assert.equal(marketOf(getCatalogueGeoSignals({ country: 'India', postcode: '600001' }, { locationCode: 'SW1A 1AA' }, 'SW1A 1AA')), 'GB');
  // a saved city/country preference outranks the saved postcode, and the postcode is not sent alongside it
  const withPreference = getCatalogueGeoSignals({ postcode: 'SW1A 1AA' }, { countryCode: 'IN', locationCode: undefined }, null);
  assert.equal(withPreference.countryCode, 'IN');
  assert.equal(withPreference.locationCode, null);
  assert.equal(marketOf(withPreference), 'IN');
  // nothing saved: the time zone decides
  assert.equal(marketOf(getCatalogueGeoSignals({}, {}, null)), 'IN');
});
