import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildPropertyFastTrackStartRequest,
  getPropertyBrokerRequestQuery,
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
  assert.match(markup, /bg-emerald-700/);
  assert.doesNotMatch(markup, /bg-emerald-600/);
});

test("property detail accepts broker request ids from dashboard and property links", () => {
  assert.equal(
    getPropertyBrokerRequestQuery(new URLSearchParams("broker-request=request-123")),
    "request-123",
  );
  assert.equal(
    getPropertyBrokerRequestQuery(new URLSearchParams("brokerRequest=request-camel")),
    "request-camel",
  );
  assert.equal(
    getPropertyBrokerRequestQuery(new URLSearchParams("workspace=broker-request&request=request-workspace")),
    "request-workspace",
  );
  assert.equal(
    getPropertyBrokerRequestQuery(new URLSearchParams("fast-track=1&request=request-fast-track")),
    "request-fast-track",
  );
  assert.equal(getPropertyBrokerRequestQuery(new URLSearchParams("request=unrelated")), "");
});

test("direct rental property fast-track start keeps lead and manager context", () => {
  const request = buildPropertyFastTrackStartRequest({
    property: {
      id: "property-rent-1",
      title: "Rental home",
      listing_type: "rent",
      manager_id: "manager-direct",
      country: "GB",
    } as any,
    lead: {
      id: "lead-direct",
      broker_id: "manager-lead",
    } as any,
    brokerRequestQuery: "",
    clientId: "user-1",
    clientName: "Test User",
  });

  assert.deepEqual(request, {
    property_id: "property-rent-1",
    broker_request_id: undefined,
    lead_id: "lead-direct",
    manager_id: "manager-lead",
    client_id: "user-1",
    client_name: "Test User",
    property_title: "Rental home",
    property_type: "rent",
    property_country: "GB",
    listing_type: "rent",
    started_from: "direct_property",
  });
});

test("broker-selected rental fast-track start lets backend resolve selected lead and manager", () => {
  const request = buildPropertyFastTrackStartRequest({
    property: {
      id: "property-rent-2",
      title: "Broker selected rental",
      listing_type: "rent",
      manager_id: "manager-stale-property",
      country: "GB",
    } as any,
    lead: {
      id: "lead-stale-direct",
      broker_id: "manager-stale-lead",
    } as any,
    brokerRequestQuery: "request-selected",
    clientId: "user-1",
    clientName: "Test User",
  });

  assert.equal(request?.broker_request_id, "request-selected");
  assert.equal(request?.started_from, "broker_request_selection");
  assert.equal(request?.property_type, "rent");
  assert.equal(request?.listing_type, "rent");
  assert.equal(request?.lead_id, undefined);
  assert.equal(request?.manager_id, undefined);
});

test("sale offer amount input accepts ordinary round-pound offers", () => {
  const markup = renderToStaticMarkup(
    <SaleOfferEntryCard
      priceLabel="GBP 425,000"
      offerAmount="11000"
      offerNotes=""
      isSubmitting={false}
      onAmountChange={() => {}}
      onNotesChange={() => {}}
      onSubmit={() => {}}
    />,
  );

  assert.match(markup, /type="number"/);
  assert.match(markup, /min="1"/);
  assert.match(markup, /step="1"/);
  assert.doesNotMatch(markup, /step="1000"/);
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

test("full-screen gallery exposes a stable dialog label without virtual-tour-like copy", () => {
  assert.equal(
    getImmersiveGalleryDialogLabel("Canary Wharf loft"),
    "Full-screen gallery for Canary Wharf loft",
  );
  assert.equal(getImmersiveGalleryDialogLabel("   "), "Full-screen property gallery");
  assert.doesNotMatch(getImmersiveGalleryDialogLabel("Canary Wharf loft"), /immersive|virtual tour|3d/i);
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

test("viewing calendar out-of-month days keep contrast-safe text", () => {
  const getViewingCalendarDayTone = (propertyPage as any).getViewingCalendarDayTone;

  assert.equal(typeof getViewingCalendarDayTone, "function");
  const tone = getViewingCalendarDayTone(
    {
      value: "2026-05-10",
      dayNumber: 10,
      isCurrentMonth: false,
      isToday: false,
      isDisabled: false,
    },
    false,
  );

  assert.match(tone, /text-gray-600/);
  assert.doesNotMatch(tone, /text-gray-300/);
  assert.doesNotMatch(tone, /bg-transparent/);
  assert.doesNotMatch(tone, /border-transparent/);
});
