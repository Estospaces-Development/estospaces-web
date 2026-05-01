import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  getImmersiveGalleryDialogLabel,
  getPropertyDetailFallbackBackTarget,
  SaleOfferEntryCard,
  shouldLoadViewingAvailability,
  shouldUseBrowserHistoryForPropertyDetailBack,
} from "./page";
import * as propertyPage from "./page";

test("sale property page exposes a submit-offer entry card", () => {
  const markup = renderToStaticMarkup(
    <SaleOfferEntryCard
      priceLabel="GBP 425,000"
      offerAmount=""
      offerNotes=""
      isSubmitting={false}
      onAmountChange={() => {}}
      onNotesChange={() => {}}
      onSubmit={() => {}}
    />,
  );

  assert.match(markup, /Submit Offer/);
  assert.match(markup, /Offer amount/);
  assert.match(markup, /Notes for the offer/);
  assert.match(markup, /GBP 425,000/);
});

test("public property detail skips authenticated viewing availability before sign-in", () => {
  assert.equal(shouldLoadViewingAvailability("property-123", null), false);
  assert.equal(shouldLoadViewingAvailability("property-123", undefined), false);
  assert.equal(shouldLoadViewingAvailability("", { id: "user-1" }), false);
  assert.equal(shouldLoadViewingAvailability("property-123", { id: "user-1" }), true);
});

test("public property detail falls back to search when Back has no signed-in workspace", () => {
  assert.equal(getPropertyDetailFallbackBackTarget(null, null), "/search");
  assert.equal(getPropertyDetailFallbackBackTarget("1", undefined), "/search");
  assert.equal(getPropertyDetailFallbackBackTarget(null, { id: "user-1" }), "/user/dashboard/discover");
  assert.equal(getPropertyDetailFallbackBackTarget("1", { id: "user-1" }), "/user/dashboard");
});

test("public property detail does not use browser history for signed-out Back", () => {
  assert.equal(shouldUseBrowserHistoryForPropertyDetailBack(null), false);
  assert.equal(shouldUseBrowserHistoryForPropertyDetailBack(undefined), false);
  assert.equal(shouldUseBrowserHistoryForPropertyDetailBack({ id: "user-1" }), true);
});

test("immersive gallery exposes a stable dialog label", () => {
  assert.equal(
    getImmersiveGalleryDialogLabel("Canary Wharf loft"),
    "Immersive gallery for Canary Wharf loft",
  );
  assert.equal(getImmersiveGalleryDialogLabel("   "), "Immersive property gallery");
});

test("viewing request validation keeps date and time explicitly required", () => {
  const getViewingRequestValidationErrors = (propertyPage as any).getViewingRequestValidationErrors;

  assert.equal(typeof getViewingRequestValidationErrors, "function");
  assert.deepEqual(
    getViewingRequestValidationErrors({ requested_date: "", requested_time: "", user_notes: "" }),
    {
      requested_date: "Choose a viewing date.",
      requested_time: "Choose a viewing time.",
    },
  );
  assert.deepEqual(
    getViewingRequestValidationErrors({ requested_date: "2026-05-01", requested_time: "18:00", user_notes: "" }),
    {},
  );
});

test("viewing selection is cleared when the user navigates away from the selected month", () => {
  const clearViewingSelectionOutsideMonth = (propertyPage as any).clearViewingSelectionOutsideMonth;

  assert.equal(typeof clearViewingSelectionOutsideMonth, "function");
  assert.deepEqual(
    clearViewingSelectionOutsideMonth(
      { requested_date: "2026-04-29", requested_time: "18:00", user_notes: "Gate code" },
      new Date(2026, 4, 1),
    ),
    { requested_date: "", requested_time: "", user_notes: "Gate code" },
  );
  assert.deepEqual(
    clearViewingSelectionOutsideMonth(
      { requested_date: "2026-05-03", requested_time: "18:00", user_notes: "Gate code" },
      new Date(2026, 4, 1),
    ),
    { requested_date: "2026-05-03", requested_time: "18:00", user_notes: "Gate code" },
  );
});

test("viewing time slots expose named button state", () => {
  const ViewingTimeSlotButton = (propertyPage as any).ViewingTimeSlotButton;

  assert.equal(typeof ViewingTimeSlotButton, "function");
  const markup = renderToStaticMarkup(
    <ViewingTimeSlotButton
      slot={{ value: "18:00", label: "18:00", hint: "Evening" }}
      selected
      unavailable={false}
      unavailableReason="Already booked"
      onSelect={() => {}}
    />,
  );

  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Select 18:00 viewing time"/);
  assert.match(markup, /aria-pressed="true"/);
  assert.match(markup, /focus-visible/);
});
