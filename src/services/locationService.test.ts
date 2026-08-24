import test from "node:test";
import assert from "node:assert/strict";

import { getCoordinatesFromAddress } from "./locationService";

test("getCoordinatesFromAddress resolves India using only the entered PIN", async () => {
  const originalFetch = globalThis.fetch;
  const requestedURLs: string[] = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    requestedURLs.push(url);
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
    assert.equal(requestedURLs.length, 1);
    assert.ok(requestedURLs[0].includes("api.pincodeapi.in"));
    assert.ok(requestedURLs.every((url) => url.includes("600018")));
    assert.ok(requestedURLs.every((url) => !url.includes("Anna")));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCoordinatesFromAddress supports the current India PIN provider response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      success: true,
      data: {
        pincode: "600001",
        post_offices: [
          {
            office_name: "Office without map data",
            district: "Chennai",
            state: "Tamil Nadu",
            latitude: null,
            longitude: null,
          },
          {
            office_name: "Chennai G. P. O.",
            district: "Chennai",
            state: "Tamil Nadu",
            latitude: 13.0929722,
            longitude: 80.2915,
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

  try {
    assert.deepEqual(
      await getCoordinatesFromAddress({
        postalCode: "600001",
        countryCode: "IN",
      }),
      { latitude: 13.0929722, longitude: 80.2915 },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCoordinatesFromAddress rejects current provider coordinates for another PIN", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      success: true,
      data: {
        pincode: "600002",
        post_offices: [
          {
            district: "Chennai",
            state: "Tamil Nadu",
            latitude: 13.0929722,
            longitude: 80.2915,
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

  try {
    assert.equal(
      await getCoordinatesFromAddress({
        postalCode: "600001",
        countryCode: "IN",
      }),
      null,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCoordinatesFromAddress skips malformed current provider coordinates", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({
      success: true,
      data: {
        pincode: "600001",
        post_offices: [
          {
            district: "Invalid",
            latitude: true,
            longitude: false,
          },
          {
            district: "Chennai",
            latitude: "13.0929722",
            longitude: "80.2915",
          },
        ],
      },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );

  try {
    assert.deepEqual(
      await getCoordinatesFromAddress({
        postalCode: "600001",
        countryCode: "IN",
      }),
      { latitude: 13.0929722, longitude: 80.2915 },
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getCoordinatesFromAddress returns null when no real postal position exists", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ status: "success", data: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

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
