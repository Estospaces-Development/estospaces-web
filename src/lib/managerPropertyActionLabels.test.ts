import assert from "node:assert/strict";
import test from "node:test";

import { getManagerPropertyActionLabels } from "./managerPropertyActionLabels";

test("saving a draft does not relabel the submit button as submitting", () => {
  for (const [mode, status] of [["edit", "draft"], ["edit", "rejected"], ["create", "draft"]] as const) {
    const labels = getManagerPropertyActionLabels({ mode, status, pendingAction: "draft" });
    assert.equal(labels.draftLabel, "Saving...");
    assert.doesNotMatch(labels.primaryLabel, /\.\.\.$/, `${mode}/${status}`);
  }
});

test("submitting shows progress only on the submit button", () => {
  const labels = getManagerPropertyActionLabels({ mode: "edit", status: "draft", pendingAction: "submit" });
  assert.deepEqual(labels, { draftLabel: "Save Draft", primaryLabel: "Submitting..." });
});

test("idle labels follow the listing status", () => {
  assert.equal(getManagerPropertyActionLabels({ mode: "create", status: "draft", pendingAction: null }).primaryLabel, "Submit for Approval");
  assert.equal(getManagerPropertyActionLabels({ mode: "edit", status: "rejected", pendingAction: null }).primaryLabel, "Resubmit for Approval");
  assert.equal(getManagerPropertyActionLabels({ mode: "edit", status: "available", pendingAction: null }).primaryLabel, "Save Property");
  assert.equal(getManagerPropertyActionLabels({ mode: "edit", status: "available", pendingAction: "submit" }).primaryLabel, "Saving...");
});
