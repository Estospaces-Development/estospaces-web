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

test("getPropertyMapState rejects zero-coordinate sentinel values", () => {
  const state = getPropertyMapState({
    location: {
      addressLine1: "Equator House",
      city: "Null Island",
      latitude: "0",
      longitude: "0",
    },
  });

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.coordinates, null);
  assert.equal(state.embedUrl, null);
  assert.equal(state.statusTitle, "Address available — pin not verified");
});

test("getPropertyMapState avoids a guessed preview pin when coordinates are unavailable", () => {
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
  assert.equal(state.statusTitle, "Address available — pin not verified");
  assert.match(state.statusDescription, /no verified map pin/i);
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

test("getPropertyMapState builds Apple Maps URLs for a verified launch location", () => {
  const state = getPropertyMapState(
    {
      location: {
        addressLine1: "10 Downing Street",
        city: "London",
        country: "United Kingdom",
        latitude: 51.5034,
        longitude: -0.1276,
      },
    },
    { userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)" },
  );

  const externalUrl = new URL(state.externalUrl ?? "");
  assert.equal(state.provider, "apple");
  assert.equal(externalUrl.hostname, "maps.apple.com");
  assert.equal(externalUrl.searchParams.get("ll"), "51.5034,-0.1276");
  assert.match(externalUrl.searchParams.get("q") ?? "", /10 Downing Street/);
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

test("getPropertyMapState keeps service-address search without rendering an unverified pin", () => {
  const state = getPropertyMapState({
    address_line_1: "221B Smoke Test Lane",
    city: "London",
    postcode: "SW1A 1AA",
    country: "UK",
  });

  assert.equal(state.hasCoordinates, false);
  assert.equal(state.hasAddress, true);
  assert.equal(state.embedUrl, null);
  assert.equal(state.statusTitle, "Address available — pin not verified");
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
  assert.equal(state.embedUrl, null);
  assert.match(decodeURIComponent(state.externalUrl ?? ""), /Gurgaon road, Mumbai, 122001, India/);
  assert.doesNotMatch(decodeURIComponent(state.externalUrl ?? ""), /Dhaturiya/i);
  assert.match(state.statusDescription, /no verified map pin/i);
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
  assert.match(decodeURIComponent(state.externalUrl ?? ""), /Attur, Chennai, 600001/);
  assert.equal(state.embedUrl, null);
});
