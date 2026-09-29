import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_VIEWING_CANCELLATION_REASON_LENGTH,
  normalizeViewingCancellationReason,
  validateViewingCancellationReason,
  viewingMatchesFilter,
} from "./page";

test("viewing cancellation validation requires a real reason", () => {
  assert.equal(validateViewingCancellationReason(""), "Enter a cancellation reason.");
  assert.equal(validateViewingCancellationReason("   "), "Enter a cancellation reason.");
});

test("viewing cancellation validation accepts minimum and maximum reason boundaries", () => {
  assert.equal(validateViewingCancellationReason("Plans changed."), null);
  assert.equal(validateViewingCancellationReason("x".repeat(MAX_VIEWING_CANCELLATION_REASON_LENGTH)), null);
});

test("viewing cancellation validation rejects over-limit reasons and normalizes whitespace", () => {
  assert.equal(
    normalizeViewingCancellationReason("  Client   needs\nanother   day.  "),
    "Client needs another day.",
  );
  assert.equal(MAX_VIEWING_CANCELLATION_REASON_LENGTH, 500);
  assert.equal(
    validateViewingCancellationReason("x".repeat(MAX_VIEWING_CANCELLATION_REASON_LENGTH + 1)),
    "Keep the cancellation reason to 500 characters or fewer.",
  );
});

test("completed filter matches only viewings the booking service marked completed", () => {
  const now = new Date("2026-09-28T12:00:00");
  const pastPending = { status: "pending", date: "2026-09-01T10:30:00" };
  const pastConfirmed = { status: "confirmed", date: "2026-09-02T10:30:00" };
  const futurePending = { status: "pending", date: "2026-10-01T10:30:00" };
  const completed = { status: "completed", date: "2026-09-03T10:30:00" };
  const cancelledPast = { status: "cancelled", date: "2026-09-04T10:30:00" };

  assert.equal(viewingMatchesFilter(pastPending, "completed", now), false);
  assert.equal(viewingMatchesFilter(pastConfirmed, "completed", now), false);
  assert.equal(viewingMatchesFilter(futurePending, "completed", now), false);
  assert.equal(viewingMatchesFilter(cancelledPast, "completed", now), false);
  assert.equal(viewingMatchesFilter(completed, "completed", now), true);
  assert.equal(viewingMatchesFilter({ status: "COMPLETED", date: completed.date }, "completed", now), true);
});

test("each status filter keeps pending, completed and cancelled viewings disjoint", () => {
  const now = new Date("2026-09-28T12:00:00");
  const viewings = [
    { status: "pending", date: "2026-09-01T10:30:00" },
    { status: "rescheduled", date: "2026-10-02T10:30:00" },
    { status: "completed", date: "2026-09-03T10:30:00" },
    { status: "cancelled", date: "2026-10-04T10:30:00" },
  ];
  const pick = (filter: string) => viewings.filter((viewing) => viewingMatchesFilter(viewing, filter, now)).map((viewing) => viewing.status);

  assert.deepEqual(pick("pending"), ["pending", "rescheduled"]);
  assert.deepEqual(pick("completed"), ["completed"]);
  assert.deepEqual(pick("cancelled"), ["cancelled"]);
  assert.deepEqual(pick("upcoming"), ["rescheduled"]);
  assert.equal(pick("all").length, 4);
});

test("date-less viewings appear only under All", () => {
  assert.equal(viewingMatchesFilter({ status: "completed", date: null }, "completed"), false);
  assert.equal(viewingMatchesFilter({ status: "pending", date: "" }, "all"), true);
});
