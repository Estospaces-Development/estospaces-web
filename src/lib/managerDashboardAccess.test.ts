import assert from "node:assert/strict";
import test from "node:test";
import {
  canLoadManagerOperationalDashboard,
  getManagerDashboardAccessState,
} from "./managerDashboardAccess";

test("manager operational dashboard only loads for approved profiles", () => {
  assert.equal(
    canLoadManagerOperationalDashboard({
      profile: { verification_status: "approved" },
    }),
    true,
  );

  assert.equal(canLoadManagerOperationalDashboard({ profile: null }), false);
  assert.equal(
    canLoadManagerOperationalDashboard({
      profile: { verification_status: "incomplete" },
    }),
    false,
  );
  assert.equal(
    canLoadManagerOperationalDashboard({
      profile: { verification_status: "submitted" },
    }),
    false,
  );
  assert.equal(
    canLoadManagerOperationalDashboard({
      profile: { verification_status: "under_review" },
    }),
    false,
  );
  assert.equal(
    canLoadManagerOperationalDashboard({
      profile: { verification_status: "rejected" },
    }),
    false,
  );
});

test("manager dashboard access state explains the unverified states", () => {
  assert.equal(getManagerDashboardAccessState({ isLoading: true }), "loading");
  assert.equal(getManagerDashboardAccessState({ profile: null }), "profile_required");
  assert.equal(
    getManagerDashboardAccessState({
      profile: { verification_status: "rejected" },
    }),
    "changes_required",
  );
  assert.equal(
    getManagerDashboardAccessState({
      profile: { verification_status: "submitted" },
    }),
    "review_pending",
  );
});
