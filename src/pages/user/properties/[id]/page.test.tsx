import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildPropertyFastTrackStartRequest,
  buildPropertyFastTrackDashboardPath,
  buildPropertyHeroSummary,
  formatPropertyDetailCurrency,
  getPropertyDetailLocationLabel,
  getPropertyBrokerRequestQuery,
  getImmersiveGalleryDialogLabel,
  getPropertyDetailFallbackBackTarget,
  SaleOfferEntryCard,
  shouldLoadViewingAvailability,
  shouldUseBrowserHistoryForPropertyDetailBack,
} from "./page";
import * as propertyPage from "./page";

const propertyDetailSource = readFileSync(resolve(process.cwd(), "src/pages/user/properties/[id]/page.tsx"), "utf8");

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

test("property detail formats guide price from property country and currency", () => {
  assert.equal(
    formatPropertyDetailCurrency(2400, { country: "GB", currency: "GBP" } as any),
    "\u00a32,400",
  );
  assert.equal(
    formatPropertyDetailCurrency(125000, { country: "India", currency: "INR" } as any),
    "\u20b91,25,000",
  );
});

test("property detail location summary uses country and PIN corrected city", () => {
  const location = getPropertyDetailLocationLabel({
    id: "property-address-2",
    title: "Launch rental",
    status: "published",
    listing_type: "rent",
    property_type: "apartment",
    price: 650000,
    currency: "INR",
    bedrooms: 2,
    bathrooms: 2,
    address_line_1: "Attur",
    city: "Edinburgh",
    postcode: "600001",
    country: "IN",
  } as any);

  assert.equal(location, "Chennai, IN");
  assert.doesNotMatch(location, /Edinburgh/i);
  assert.doesNotMatch(propertyDetailSource, /formatLaunchPropertyLocation\(\[property\.city, property\.country\]\)/);
});

test("property detail hero summary uses real listing data instead of gallery guide copy", () => {
  const summary = buildPropertyHeroSummary({
    property_type: "apartment",
    bedrooms: 2,
    bathrooms: 1,
    property_size_sqft: 750,
    features: ["balcony", "near metro"],
  } as any, "Guwahati, India");

  assert.match(summary, /apartment in Guwahati, India/);
  assert.match(summary, /2 bedrooms and 1 bathroom/);
  assert.match(summary, /750 sq ft/);
  assert.match(summary, /Highlights include Balcony, Near Metro\./);
  assert.doesNotMatch(propertyDetailSource, /Start with the lead image here/);
  assert.doesNotMatch(summary, /full-screen gallery|curated photo set|distraction-free look/i);

  const describedSummary = buildPropertyHeroSummary({
    property_type: "house",
    bedrooms: 3,
    bathrooms: 2,
    description: "  Bright home near the riverside.  ",
  } as any, "Guwahati, India");

  assert.match(describedSummary, /house in Guwahati, India/);
  assert.match(describedSummary, /3 bedrooms and 2 bathrooms/);
  assert.match(describedSummary, /Bright home near the riverside\./);
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

test("broker-selected rental fast-track start sends the resolved manager while backend resolves the selected lead", () => {
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
  assert.equal(request?.manager_id, "manager-stale-lead");
});

test("property detail fast-track continue opens the live workspace route directly", () => {
  assert.equal(
    buildPropertyFastTrackDashboardPath({
      caseId: "case-active-1",
      finalStatus: "in_progress",
    }),
    "/user/dashboard/fast-track?case=case-active-1&section=documents",
  );
  assert.equal(
    buildPropertyFastTrackDashboardPath({
      caseId: "case-done-1",
      finalStatus: "completed",
    }),
    "/user/dashboard/fast-track?case=case-done-1&section=overview&celebrate=1",
  );
  assert.equal(
    buildPropertyFastTrackDashboardPath(null, "case-from-query"),
    "/user/dashboard/fast-track?case=case-from-query&section=documents",
  );
  assert.equal(buildPropertyFastTrackDashboardPath(null, ""), "/user/dashboard/fast-track");
  assert.match(
    propertyDetailSource,
    /if \(startAction === 'resume_existing_case'\) \{\s*openFastTrackDashboard\(currentWorkspace\.fastTrackCase\);\s*return;\s*\}/,
  );
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

test("viewing concierge highlight rows are actionable buttons", () => {
  assert.match(propertyDetailSource, /10-minute live broker response/);
  assert.match(propertyDetailSource, /Message the broker directly/);
  assert.match(propertyDetailSource, /Reserve a slot in minutes/);
  assert.match(propertyDetailSource, /focusViewingRequestForm/);
  assert.match(propertyDetailSource, /void handleStartFastTrack\(\)/);
  assert.match(propertyDetailSource, /void handleOpenConversation\(\)/);
  assert.match(propertyDetailSource, /<button\s+key=\{item\.label\}/);
  assert.match(propertyDetailSource, /ref=\{viewingFormRef\}/);
});

test("property detail fast-track CTA resumes active broker-request journeys instead of advertising a new start", () => {
  assert.match(propertyDetailSource, /const hasActiveFastTrackJourney = isActiveFastTrackCase\(activeFastTrackCase\);/);
  assert.match(propertyDetailSource, /Continue 24-hour journey/);
  assert.match(propertyDetailSource, /Continue 24-Hour Fast Track/);
  assert.match(propertyDetailSource, /fastTrackConciergeActionLabel/);
  assert.doesNotMatch(propertyDetailSource, /activeFastTrackCase\?\.workspaceFinalStatus === 'active' \|\| activeFastTrackCase\?\.finalStatus === 'in_progress'/);
});
