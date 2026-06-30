import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSaleOfferPayload,
  parseSaleOfferAmount,
  resolveSaleOfferManagerId,
} from "./saleOfferEntry";

test("buildSaleOfferPayload creates a buyer offer payload for sale listings", () => {
  const result = buildSaleOfferPayload({
    property: {
      id: "property-sale-1",
      listing_type: "sale",
      manager_id: "property-manager",
      currency: "GBP",
      country: "United Kingdom",
    },
    lead: {
      id: "lead-1",
      matched_broker_id: "matched-manager",
    },
    fastTrackCase: {
      id: "fast-track-1",
      leadId: "case-lead",
      managerId: "case-manager",
    },
    amount: "425000",
    notes: "Buyer can move quickly.",
  });

  assert.equal(result.error, null);
  assert.deepEqual(result.payload, {
    property_id: "property-sale-1",
    manager_id: "matched-manager",
    lead_id: "lead-1",
    fast_track_case_id: "fast-track-1",
    amount: 425000,
    currency: "GBP",
    property_country: "United Kingdom",
    notes: "Buyer can move quickly.",
  });
});

test("buildSaleOfferPayload rejects invalid amount before the API call", () => {
  const result = buildSaleOfferPayload({
    property: {
      id: "property-sale-1",
      listing_type: "sale",
      manager_id: "property-manager",
    },
    amount: "0",
  });

  assert.equal(result.payload, null);
  assert.equal(result.error, "Enter a valid offer amount.");
});

test("resolveSaleOfferManagerId falls back through lead, case, then property manager", () => {
  assert.equal(
    resolveSaleOfferManagerId(
      { manager_id: "property-manager" },
      { broker_id: "lead-manager" },
      { managerId: "case-manager" },
    ),
    "lead-manager",
  );

  assert.equal(
    resolveSaleOfferManagerId(
      { manager_id: "property-manager" },
      null,
      { managerId: "case-manager" },
    ),
    "case-manager",
  );

  assert.equal(resolveSaleOfferManagerId({ manager_id: "property-manager" }, null, null), "property-manager");
});

test("parseSaleOfferAmount accepts currency formatted strings", () => {
  assert.equal(parseSaleOfferAmount("GBP 425,000"), 425000);
});
