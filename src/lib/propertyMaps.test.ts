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
  assert.match(state.embedUrl ?? "", /221B%20Baker%20Street/);
  assert.match(state.externalUrl ?? "", /221B%20Baker%20Street/);
  assert.equal(state.statusTitle, "Address map preview available");
  assert.match(state.statusDescription, /property address/);
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

test("getPropertyMapState supports core-service property payloads", () => {
  const state = getPropertyMapState({
    address_line_1: "27 Oxley Road",
    city: "Preston",
    postcode: "PR1 5QH",
    country: "United Kingdom",
    latitude: "51.5007",
    longitude: "-0.1246",
  });

  assert.equal(state.hasCoordinates, true);
  assert.equal(state.hasAddress, true);
  assert.equal(state.coordinates?.latitude, 51.5007);
  assert.equal(state.coordinates?.longitude, -0.1246);
  assert.equal(
    state.displayAddress,
    "27 Oxley Road, Preston, PR1 5QH, United Kingdom",
  );
  assert.match(state.embedUrl ?? "", /51\.5007%2C-0\.1246/);
  assert.match(state.externalUrl ?? "", /query=51\.5007%2C-0\.1246/);
});

test("getPropertyMapState falls back to service-address search without coordinates", () => {
  const state = getPropertyMapState({
    address_line_1: "221B Smoke Test Lane",
    city: "London",
    postcode: "SW1A 1AA",
    country: "UK",
  });

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.hasAddress, true);
  assert.match(state.embedUrl ?? "", /221B%20Smoke%20Test%20Lane/);
  assert.equal(state.statusTitle, "Address map preview available");
  assert.doesNotMatch(state.statusTitle, /pin/i);
  assert.equal(
    state.displayAddress,
    "221B Smoke Test Lane, London, SW1A 1AA, UK",
  );
  assert.match(state.externalUrl ?? "", /221B%20Smoke%20Test%20Lane/);
});

test("ticket 400 maps the Gurgaon fixture from its listed address instead of a guessed pin", () => {
  const state = getPropertyMapState({
    address_line_1: "Gurgaon road",
    city: "Mumbai",
    postcode: "122001",
    country: "India",
    latitude: "",
    longitude: "",
  });

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.displayAddress, "Gurgaon road, Mumbai, 122001, India");
  assert.match(decodeURIComponent(state.embedUrl ?? ""), /Gurgaon road, Mumbai, 122001, India/);
  assert.match(decodeURIComponent(state.externalUrl ?? ""), /Gurgaon road, Mumbai, 122001, India/);
  assert.doesNotMatch(decodeURIComponent(state.embedUrl ?? ""), /Dhaturiya/i);
  assert.doesNotMatch(decodeURIComponent(state.externalUrl ?? ""), /Dhaturiya/i);
});

test("getPropertyMapState uses a sanitized display address override for address search", () => {
  const state = getPropertyMapState(
    {
      address_line_1: "Attur",
      city: "Edinburgh",
      postcode: "SW1A 1AA",
      country: "IN",
    },
    { displayAddress: "Attur, Chennai, 600001" },
  );

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.hasAddress, true);
  assert.equal(state.displayAddress, "Attur, Chennai, 600001");
  assert.doesNotMatch(state.displayAddress, /Edinburgh|SW1A/i);
  assert.doesNotMatch(decodeURIComponent(state.externalUrl ?? ""), /Edinburgh|SW1A/i);
  assert.doesNotMatch(decodeURIComponent(state.embedUrl ?? ""), /Edinburgh|SW1A/i);
  assert.match(decodeURIComponent(state.externalUrl ?? ""), /Attur, Chennai, 600001/);
  assert.match(decodeURIComponent(state.embedUrl ?? ""), /Attur, Chennai, 600001/);
});
