import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  BOOKING_STATUS_GROUPS,
  MAX_BOOKING_CANCEL_REASON_LENGTH,
  MAX_BOOKING_GUEST_COUNT,
  MAX_BOOKING_SPECIAL_REQUESTS_LENGTH,
  groupBookingsByStatus,
  normalizeBookingCancelReason,
  normalizeBookingSpecialRequests,
  validateBookingCancelReason,
  buildBookingDetailRows,
  getBookingCheckOutMin,
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

test("booking reservation validation requires a home, dates and guests", () => {
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
      property_id: "Choose a home to reserve.",
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

test("booking detail rows expose the selected booking record", () => {
  const rows = buildBookingDetailRows({
    id: "booking-123456",
    property_id: "property-123456",
    user_id: "user-1",
    manager_id: "manager-123456",
    check_in_date: "2026-05-24",
    check_out_date: "2026-05-26",
    guest_count: 2,
    total_amount: 1260,
    currency: "GBP",
    status: "pending",
    created_at: "2026-05-18T10:00:00Z",
  });

  assert.deepEqual(rows.map((row) => row.label), [
    "Booking ID",
    "Status",
    "Property ID",
    "Manager ID",
    "Check-in",
    "Check-out",
    "Guests",
    "Total",
  ]);
  assert.equal(rows.find((row) => row.label === "Booking ID")?.value, "booking-123456");
  assert.equal(rows.find((row) => row.label === "Total")?.value, "GBP1,260");
});

// The server refuses past check-in dates, so the pickers must not offer them (QA E2E 10 Oct).
test("check-out can only be picked after the check-in day (and never before tomorrow)", () => {
  assert.equal(getBookingCheckOutMin("", "2026-10-11"), "2026-10-12");
  assert.equal(getBookingCheckOutMin("not-a-date", "2026-10-11"), "2026-10-12");
  assert.equal(getBookingCheckOutMin("2026-10-20", "2026-10-11"), "2026-10-21");
  assert.equal(getBookingCheckOutMin("2026-10-01", "2026-10-11"), "2026-10-12", "a past check-in does not lower the minimum");
  assert.equal(getBookingCheckOutMin("2026-10-31", "2026-10-11"), "2026-11-01");
  assert.equal(getBookingCheckOutMin("2026-12-31", "2026-10-11"), "2027-01-01");
});

test("the reservation date pickers disable past days and keep check-out after check-in", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/user/bookings/page.tsx"), "utf8");
  const picker = (label: string) => source.split("<DateField").find((block) => block.includes(`ariaLabel="${label}"`)) ?? "";

  assert.match(picker("Booking check-in date"), /min=\{getLocalTodayInputValue\(\)\}/);
  assert.match(picker("Booking check-out date"), /min=\{getBookingCheckOutMin\(reservationForm\.check_in_date\)\}/);
});
