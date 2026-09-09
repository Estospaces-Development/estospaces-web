import test from "node:test";
import assert from "node:assert/strict";

import { getCoordinatesFromAddress } from "./locationService";

test('property lookup rejects a postcode from a different selected country before contacting a provider', async () => {
  const originalFetch = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    return new Response(JSON.stringify({ result: { latitude: 51.5, longitude: -0.1, postcode: 'SW1A 1AA' } }));
  };
  try {
    assert.equal(await getCoordinatesFromAddress({ postalCode: 'SW1A 1AA', countryCode: 'IN' }), null);
    assert.equal(requests, 0);
  } finally { globalThis.fetch = originalFetch; }
});

for (const [name, result] of [
  ['different postcode', { latitude: 51.5, longitude: -0.1, postcode: 'SW1A 2AA' }],
  ['missing postcode identity', { latitude: 51.5, longitude: -0.1 }],
  ['null postcode identity', { latitude: 51.5, longitude: -0.1, postcode: null }],
  ['non-string postcode identity', { latitude: 51.5, longitude: -0.1, postcode: 12345 }],
  ['empty postcode identity', { latitude: 51.5, longitude: -0.1, postcode: '  ' }],
  ['missing latitude', { latitude: null, longitude: -0.1, postcode: 'SW1A 1AA' }],
  ['boolean coordinate', { latitude: true, longitude: -0.1, postcode: 'SW1A 1AA' }],
  ['wrong country coordinates', { latitude: 13.08, longitude: 80.27, postcode: 'SW1A 1AA' }],
  ['conflicting country metadata', { latitude: 51.5, longitude: -0.1, postcode: 'SW1A 1AA', country: 'France' }],
] as const) {
  test(`property lookup rejects provider ${name}`, async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ result }));
    try {
      assert.equal(await getCoordinatesFromAddress({ postalCode: 'SW1A 1AA', countryCode: 'GB' }), null);
    } finally { globalThis.fetch = originalFetch; }
  });
}

test('property lookup accepts UK constituent-country metadata', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ result: {
    latitude: 51.5, longitude: -0.1, postcode: 'SW1A 1AA', country: 'England',
  } }));
  try {
    assert.deepEqual(await getCoordinatesFromAddress({ postalCode: 'SW1A 1AA', countryCode: 'GB' }), { latitude: 51.5, longitude: -0.1 });
  } finally { globalThis.fetch = originalFetch; }
});

test('property lookup rejects a conflicting PIN in a legacy India office record', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ status: 'success', data: [
    { pincode: '600002', latitude: 13.08, longitude: 80.27, district: 'Chennai' },
  ] }));
  try {
    assert.equal(await getCoordinatesFromAddress({ postalCode: '600001', countryCode: 'IN' }), null);
  } finally { globalThis.fetch = originalFetch; }
});

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

test("getCoordinatesFromAddress resolves UK postcodes after normalizing the display space", async () => {
  const originalFetch = globalThis.fetch;
  const requestedURLs: string[] = [];
  globalThis.fetch = async (input) => {
    requestedURLs.push(String(input));
    return new Response(
      JSON.stringify({
        result: {
          latitude: 53.7591,
          longitude: -2.7032,
          postcode: "PR1 5QH",
          admin_district: "Preston",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    assert.deepEqual(
      await getCoordinatesFromAddress({
        postalCode: "PR1 5QH",
        countryCode: "GB",
      }),
      { latitude: 53.7591, longitude: -2.7032 },
    );
    assert.equal(requestedURLs.length, 1);
    assert.ok(requestedURLs[0].includes("api.postcodes.io/postcodes/PR1%205QH"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
