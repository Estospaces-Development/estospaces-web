import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import type { GeoMarketCode, GeoMarketUserContext } from "@/lib/geoMarket";
import { useCatalogueGeoMarket } from "@/lib/useGeoMarket";

type Saved = { market: GeoMarketCode | null; location: string };
const NO_SAVED_CITY: Saved = { market: null, location: "" };

// The three catalogue surfaces build their overrides inline; these mirror them exactly
// (DashboardClient.tsx, discover/page.tsx, search/page.tsx) so the shared hook is what is under test.
const surfaces = {
  dashboard: (user: GeoMarketUserContext, saved: Saved) => useCatalogueGeoMarket(user, {
    countryCode: saved.market || undefined,
    locationCode: saved.market ? saved.location || undefined : user?.postcode,
  }),
  discover: (user: GeoMarketUserContext, saved: Saved, typed: string | null = null) => useCatalogueGeoMarket(user, {
    countryCode: saved.market || undefined,
    locationCode: saved.market ? saved.location || undefined : typed || null,
  }, typed || null),
  search: (user: GeoMarketUserContext, saved: Saved, typed = "") => useCatalogueGeoMarket(user, {
    countryCode: saved.market || undefined,
    locationCode: saved.market ? saved.location || undefined : typed || user?.postcode,
  }, typed),
};

/** First render of the hook as a browser in the given time zone would see it (the effect only refines it later). */
const renderMarket = (timeZone: string, useSurface: () => GeoMarketCode): GeoMarketCode => {
  const realWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const realNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const realDateTimeFormat = Intl.DateTimeFormat;
  Object.defineProperty(globalThis, "window", { value: {}, configurable: true, writable: true });
  Object.defineProperty(globalThis, "navigator", {
    value: { language: "en-GB", languages: ["en-GB", "en"] },
    configurable: true,
    writable: true,
  });
  Intl.DateTimeFormat = (() => ({ resolvedOptions: () => ({ timeZone }) })) as unknown as typeof Intl.DateTimeFormat;
  try {
    let market: GeoMarketCode | undefined;
    const Probe = () => {
      market = useSurface();
      return null;
    };
    renderToStaticMarkup(<Probe />);
    assert.ok(market);
    return market;
  } finally {
    Intl.DateTimeFormat = realDateTimeFormat;
    if (realWindow) Object.defineProperty(globalThis, "window", realWindow);
    else delete (globalThis as { window?: unknown }).window;
    if (realNavigator) Object.defineProperty(globalThis, "navigator", realNavigator);
  }
};

const INDIA_TZ = "Asia/Kolkata";
const UK_POSTCODE_NO_COUNTRY: GeoMarketUserContext = { postcode: "SW1A 1AA" };

test("no country + saved UK postcode + India time zone resolves to GB on Dashboard, Discover and Search", () => {
  for (const [name, surface] of Object.entries(surfaces)) {
    assert.equal(renderMarket(INDIA_TZ, () => surface(UK_POSTCODE_NO_COUNTRY, NO_SAVED_CITY)), "GB", name);
  }
});

test("a saved UK postcode kept only in user_metadata also beats the India time zone on every surface", () => {
  const user: GeoMarketUserContext = { user_metadata: { postcode: "SW1A 1AA" } };
  for (const [name, surface] of Object.entries(surfaces)) {
    assert.equal(renderMarket(INDIA_TZ, () => surface(user, NO_SAVED_CITY)), "GB", name);
  }
});

test("an India account country still wins over a saved UK postcode on every surface", () => {
  const user: GeoMarketUserContext = { country: "India", postcode: "SW1A 1AA" };
  for (const [name, surface] of Object.entries(surfaces)) {
    assert.equal(renderMarket("Europe/London", () => surface(user, NO_SAVED_CITY)), "IN", name);
  }
});

test("a typed postcode or PIN still wins over the account country and the saved postcode", () => {
  assert.equal(
    renderMarket(INDIA_TZ, () => surfaces.discover({ country: "India", postcode: "600001" }, NO_SAVED_CITY, "SW1A 1AA")),
    "GB",
  );
  assert.equal(
    renderMarket("Europe/London", () => surfaces.discover(UK_POSTCODE_NO_COUNTRY, NO_SAVED_CITY, "600001")),
    "IN",
  );
  assert.equal(
    renderMarket(INDIA_TZ, () => surfaces.search({ country: "India" }, NO_SAVED_CITY, "SW1A 1AA")),
    "GB",
  );
});

test("a saved London city beats an India account country on every surface, and a typed PIN still wins (web-app#732)", () => {
  const user: GeoMarketUserContext = { country: "India", postcode: "600020" };
  const london: Saved = { market: "GB", location: "London" };
  for (const [name, surface] of Object.entries(surfaces)) {
    assert.equal(renderMarket(INDIA_TZ, () => surface(user, london)), "GB", name);
  }
  assert.equal(renderMarket(INDIA_TZ, () => surfaces.discover(user, london, "600001")), "IN");
});

test("a saved city or country preference still outranks the stored postcode (order unchanged)", () => {
  assert.equal(
    renderMarket("Europe/London", () => surfaces.dashboard(UK_POSTCODE_NO_COUNTRY, { market: "IN", location: "" })),
    "IN",
  );
  assert.equal(
    renderMarket(INDIA_TZ, () => surfaces.discover({ postcode: "600001" }, { market: "GB", location: "Manchester" })),
    "GB",
  );
});

test("with no account signals the time zone still decides, and a saved PIN beats a UK time zone", () => {
  for (const [name, surface] of Object.entries(surfaces)) {
    assert.equal(renderMarket(INDIA_TZ, () => surface({}, NO_SAVED_CITY)), "IN", name);
    assert.equal(renderMarket("Europe/London", () => surface({}, NO_SAVED_CITY)), "GB", name);
    assert.equal(renderMarket("Europe/London", () => surface({ postcode: "600001" }, NO_SAVED_CITY)), "IN", name);
  }
});
