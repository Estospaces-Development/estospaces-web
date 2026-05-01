import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH,
  MAX_MANAGER_APPOINTMENT_NOTE_LENGTH,
  normalizeManagerAppointmentCancelReason,
  normalizeManagerAppointmentNote,
  validateManagerAppointmentCancelReason,
  validateManagerRescheduleForm,
} from "./page";

test("manager reschedule validation requires date and time", () => {
  assert.deepEqual(
    validateManagerRescheduleForm(
      { requested_date: "", requested_time: "", manager_notes: "" },
      new Date("2026-05-01T09:00:00Z"),
    ),
    {
      requested_date: "Choose a new appointment date.",
      requested_time: "Choose a new appointment time.",
    },
  );
});

test("manager reschedule validation rejects invalid and past slots", () => {
  assert.deepEqual(
    validateManagerRescheduleForm(
      { requested_date: "not-a-date", requested_time: "25:99", manager_notes: "" },
      new Date("2026-05-01T09:00:00Z"),
    ),
    {
      requested_date: "Enter a valid appointment date.",
      requested_time: "Enter a valid appointment time.",
    },
  );
  assert.deepEqual(
    validateManagerRescheduleForm(
      { requested_date: "2026-05-01", requested_time: "08:30", manager_notes: "" },
      new Date("2026-05-01T09:00:00Z"),
    ),
    { requested_time: "Choose a future appointment time." },
  );
});

test("manager reschedule validation caps and normalizes manager notes", () => {
  assert.equal(normalizeManagerAppointmentNote("  Client   prefers MORNING.  "), "Client prefers MORNING.");
  assert.equal(MAX_MANAGER_APPOINTMENT_NOTE_LENGTH, 1000);
  assert.deepEqual(
    validateManagerRescheduleForm(
      {
        requested_date: "2026-05-02",
        requested_time: "10:00",
        manager_notes: "x".repeat(MAX_MANAGER_APPOINTMENT_NOTE_LENGTH),
      },
      new Date("2026-05-01T09:00:00Z"),
    ),
    {},
  );
  assert.deepEqual(
    validateManagerRescheduleForm(
      {
        requested_date: "2026-05-02",
        requested_time: "10:00",
        manager_notes: "x".repeat(MAX_MANAGER_APPOINTMENT_NOTE_LENGTH + 1),
      },
      new Date("2026-05-01T09:00:00Z"),
    ),
    { manager_notes: "Keep manager notes to 1000 characters or fewer." },
  );
});

test("manager cancellation reason validation requires and normalizes reason text", () => {
  assert.equal(validateManagerAppointmentCancelReason(""), "Enter a cancellation reason.");
  assert.equal(validateManagerAppointmentCancelReason("   "), "Enter a cancellation reason.");
  assert.equal(normalizeManagerAppointmentCancelReason("  Owner   unavailable\nthis week.  "), "Owner unavailable this week.");
});

test("manager cancellation reason validation enforces maximum length", () => {
  assert.equal(MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH, 500);
  assert.equal(validateManagerAppointmentCancelReason("x".repeat(MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH)), null);
  assert.equal(
    validateManagerAppointmentCancelReason("x".repeat(MAX_MANAGER_APPOINTMENT_CANCEL_REASON_LENGTH + 1)),
    "Keep the cancellation reason to 500 characters or fewer.",
  );
});
