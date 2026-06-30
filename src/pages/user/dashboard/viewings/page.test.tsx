import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_VIEWING_CANCELLATION_REASON_LENGTH,
  normalizeViewingCancellationReason,
  validateViewingCancellationReason,
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
