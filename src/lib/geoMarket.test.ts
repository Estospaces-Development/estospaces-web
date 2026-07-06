import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeGeoCountryCode,
  resolveGeoMarket,
  getGeoMarketSignalsFromUser,
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
