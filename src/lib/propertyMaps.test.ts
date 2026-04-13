import assert from "node:assert/strict";
import test from "node:test";

import {
  getPreferredMapsProvider,
  getPropertyDisplayAddress,
  getPropertyMapState,
} from "@/lib/propertyMaps";

test("getPropertyMapState builds a pin-based map state for valid coordinates", () => {
  const state = getPropertyMapState({
    location: {
      addressLine1: "10 Downing Street",
      city: "London",
      postalCode: "SW1A 2AA",
      country: "United Kingdom",
      latitude: 51.5034,
      longitude: -0.1276,
    },
  });

  assert.equal(state.hasCoordinates, true);
  assert.equal(state.hasAddress, true);
  assert.equal(state.coordinates?.latitude, 51.5034);
  assert.equal(state.coordinates?.longitude, -0.1276);
  assert.match(state.embedUrl ?? "", /51\.5034%2C-0\.1276/);
  assert.match(state.externalUrl ?? "", /query=51\.5034%2C-0\.1276/);
});

test("getPropertyMapState normalizes string coordinates and preserves zero values", () => {
  const state = getPropertyMapState({
    location: {
      addressLine1: "Equator House",
      city: "Null Island",
      latitude: "0",
      longitude: "0",
    },
  });

  assert.equal(state.hasCoordinates, true);
  assert.equal(state.coordinates?.latitude, 0);
  assert.equal(state.coordinates?.longitude, 0);
  assert.match(state.embedUrl ?? "", /0%2C0/);
  assert.doesNotMatch(state.embedUrl ?? "", /51\.505|-0\.09/);
});

test("getPropertyMapState falls back to address search when coordinates are unavailable", () => {
  const state = getPropertyMapState({
    location: {
      addressLine1: "221B Baker Street",
      city: "London",
      postalCode: "NW1 6XE",
      country: "United Kingdom",
      latitude: "",
      longitude: "not-a-number",
    },
  });

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.hasAddress, true);
  assert.equal(state.embedUrl, null);
  assert.match(state.externalUrl ?? "", /221B%20Baker%20Street/);
  assert.equal(state.statusTitle, "Exact pin unavailable");
});

test("getPropertyMapState returns an unavailable state when location data is missing", () => {
  const state = getPropertyMapState({});

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.hasAddress, false);
  assert.equal(state.embedUrl, null);
  assert.equal(state.externalUrl, null);
  assert.equal(state.statusTitle, "Location unavailable");
});

test("getPreferredMapsProvider selects Apple Maps for Apple user agents", () => {
  assert.equal(
    getPreferredMapsProvider(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    ),
    "apple",
  );
  assert.equal(
    getPreferredMapsProvider("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
    "google",
  );
});

test("getPropertyMapState builds Apple Maps URLs when requested", () => {
  const state = getPropertyMapState(
    {
      location: {
        addressLine1: "1 Infinite Loop",
        city: "Cupertino",
        country: "United States",
        latitude: 37.3318,
        longitude: -122.0312,
      },
    },
    { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)" },
  );

  const externalUrl = new URL(state.externalUrl ?? "");
  assert.equal(state.provider, "apple");
  assert.equal(externalUrl.hostname, "maps.apple.com");
  assert.equal(externalUrl.searchParams.get("ll"), "37.3318,-122.0312");
  assert.match(externalUrl.searchParams.get("q") ?? "", /1 Infinite Loop/);
});

test("getPropertyDisplayAddress combines nested and fallback address fields without duplicates", () => {
  assert.equal(
    getPropertyDisplayAddress({
      location: {
        addressLine1: "10 Market Street",
        city: "Manchester",
        postalCode: "M1 1AA",
      },
      address: "10 Market Street",
      city: "Manchester",
      zipCode: "M1 1AA",
    }),
    "10 Market Street, Manchester, M1 1AA",
  );
});
