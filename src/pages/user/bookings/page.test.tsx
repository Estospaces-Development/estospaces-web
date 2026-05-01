import test from "node:test";
import assert from "node:assert/strict";

import {
  BOOKING_STATUS_GROUPS,
  MAX_BOOKING_CANCEL_REASON_LENGTH,
  MAX_BOOKING_GUEST_COUNT,
  MAX_BOOKING_SPECIAL_REQUESTS_LENGTH,
  groupBookingsByStatus,
  normalizeBookingCancelReason,
  normalizeBookingSpecialRequests,
  validateBookingCancelReason,
  validateBookingReservationForm,
} from "./page";

const validForm = {
  property_id: "property-1",
  manager_id: "manager-1",
  check_in_date: "2026-05-10",
  check_out_date: "2026-05-12",
  guest_count: "2",
  special_requests: "",
};

test("booking reservation validation requires property manager dates and guests", () => {
  assert.deepEqual(
    validateBookingReservationForm({
      property_id: "",
      manager_id: "",
      check_in_date: "",
      check_out_date: "",
      guest_count: "",
      special_requests: "",
    }),
    {
      property_id: "Enter a property ID.",
      manager_id: "Enter a manager ID.",
      check_in_date: "Choose a check-in date.",
      check_out_date: "Choose a check-out date.",
      guest_count: "Enter at least 1 guest.",
    },
  );
});

test("booking reservation validation rejects invalid boundaries", () => {
  assert.deepEqual(
    validateBookingReservationForm({
      ...validForm,
      check_in_date: "not-a-date",
      check_out_date: "2026-05-10",
      guest_count: String(MAX_BOOKING_GUEST_COUNT + 1),
    }),
    {
      check_in_date: "Enter a valid check-in date.",
      guest_count: "Keep guests to 20 or fewer.",
    },
  );
  assert.deepEqual(
    validateBookingReservationForm({
      ...validForm,
      check_out_date: "2026-05-10",
    }),
    { check_out_date: "Choose a check-out date after check-in." },
  );
});

test("booking reservation validation caps and normalizes special requests", () => {
  assert.equal(normalizeBookingSpecialRequests("  Late   arrival\nplease.  "), "Late arrival please.");
  assert.equal(MAX_BOOKING_SPECIAL_REQUESTS_LENGTH, 1000);
  assert.deepEqual(validateBookingReservationForm({
    ...validForm,
    special_requests: "x".repeat(MAX_BOOKING_SPECIAL_REQUESTS_LENGTH),
  }), {});
  assert.deepEqual(
    validateBookingReservationForm({
      ...validForm,
      special_requests: "x".repeat(MAX_BOOKING_SPECIAL_REQUESTS_LENGTH + 1),
    }),
    { special_requests: "Keep special requests to 1000 characters or fewer." },
  );
});

test("booking cancellation reason validation requires and normalizes reason text", () => {
  assert.equal(validateBookingCancelReason(""), "Enter a cancellation reason.");
  assert.equal(validateBookingCancelReason("   "), "Enter a cancellation reason.");
  assert.equal(normalizeBookingCancelReason("  Travel   dates\nchanged.  "), "Travel dates changed.");
});

test("booking cancellation reason validation enforces maximum length", () => {
  assert.equal(MAX_BOOKING_CANCEL_REASON_LENGTH, 500);
  assert.equal(validateBookingCancelReason("x".repeat(MAX_BOOKING_CANCEL_REASON_LENGTH)), null);
  assert.equal(
    validateBookingCancelReason("x".repeat(MAX_BOOKING_CANCEL_REASON_LENGTH + 1)),
    "Keep the cancellation reason to 500 characters or fewer.",
  );
});

test("booking status grouping returns stable visible groups", () => {
  const bookings = [
    { id: "completed-1", status: "completed" },
    { id: "pending-1", status: "pending" },
    { id: "cancelled-1", status: "cancelled" },
    { id: "confirmed-1", status: "confirmed" },
  ] as any[];

  const groups = groupBookingsByStatus(bookings);

  assert.deepEqual(BOOKING_STATUS_GROUPS.map((group) => group.status), ["pending", "confirmed", "completed", "cancelled"]);
  assert.deepEqual(groups.map((group) => group.items.map((booking) => booking.id)), [
    ["pending-1"],
    ["confirmed-1"],
    ["completed-1"],
    ["cancelled-1"],
  ]);
});
