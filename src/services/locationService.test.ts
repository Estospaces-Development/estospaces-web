import test from "node:test";
import assert from "node:assert/strict";

import { getCoordinatesFromAddress } from "./locationService";

test("getCoordinatesFromAddress resolves India using only the entered PIN", async () => {
  const originalFetch = globalThis.fetch;
  const requestedURLs: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedURLs.push(url);
    if (url.includes("api.postalpincode.in")) {
      return new Response(
        JSON.stringify([
          {
            Status: "Success",
            PostOffice: [{ Latitude: "NA", Longitude: "NA" }],
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(
      JSON.stringify({
        status: "success",
        data: [
          {
            district: "Chennai",
            latitude: 13.0394444,
            longitude: 80.2573611,
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    assert.deepEqual(
      await getCoordinatesFromAddress({
        postalCode: "600018",
        countryCode: "IN",
      }),
      { latitude: 13.0394444, longitude: 80.2573611 },
    );
    assert.equal(requestedURLs.length, 2);
    assert.ok(requestedURLs.every((url) => url.includes("600018")));
    assert.ok(requestedURLs.every((url) => !url.includes("Anna")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCoordinatesFromAddress returns null when no real postal position exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    if (String(input).includes("api.postalpincode.in")) {
      return new Response(
        JSON.stringify([{ Status: "Error", PostOffice: null }]),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ status: "success", data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  try {
    assert.equal(
      await getCoordinatesFromAddress({
        postalCode: "600018",
        countryCode: "IN",
      }),
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
