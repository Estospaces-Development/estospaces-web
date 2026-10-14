import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkspaceSection } from "./liveCaseWorkspace";
import {
  formatApplicationStatusError,
  getManagerApplicationCounts,
  isManagerApplicationClosed,
  isManagerApplicationCompleted,
  getHeaderApproveBlockedReason,
  shouldShowManagerDecisionControls,
  shouldShowManagerManagedPurchaseWorkspace,
  shouldShowManagerWithdrawControl,
  resolveCaseFileRequestedSection,
  resolveManagerApplicationOverviewFocus,
  resolveManagerApplicationTab,
} from "./managerApplicationWorkspace";

test("workspace section helpers keep manager application deep links on the intended tab", () => {
  assert.equal(resolveWorkspaceSection("documents", "overview"), "documents");
  assert.equal(resolveWorkspaceSection("journey", "overview"), "journey");
  assert.equal(resolveWorkspaceSection("activity", "overview"), "activity");
  assert.equal(resolveWorkspaceSection("not-a-real-section", "overview"), "overview");
});

test("manager application workspace routes documents, journey, and activity to the right panels", () => {
  assert.equal(resolveManagerApplicationTab("documents"), "documents");
  assert.equal(resolveManagerApplicationTab("activity"), "history");
  assert.equal(resolveManagerApplicationTab("journey"), "overview");
  assert.equal(resolveManagerApplicationTab("messages"), "overview");

  assert.equal(resolveManagerApplicationOverviewFocus("journey"), "journey");
  assert.equal(resolveManagerApplicationOverviewFocus("messages"), "messages");
  assert.equal(resolveManagerApplicationOverviewFocus("documents"), null);

  assert.equal(resolveCaseFileRequestedSection("documents"), "documents");
  assert.equal(resolveCaseFileRequestedSection("overview"), null);
});

test("manager application detail shows manager decisions instead of user withdrawal controls", () => {
  const submittedRentApplication = {
    source: "application",
    status: "submitted",
    listingType: "rent",
  };

  assert.equal(shouldShowManagerDecisionControls(submittedRentApplication), true);
  assert.equal(shouldShowManagerWithdrawControl(submittedRentApplication), false);
});

test("manager application detail exposes guided purchase checks for submitted sale applications", () => {
  const submittedSaleApplication = {
    source: "application",
    status: "submitted",
    listingType: "sale",
  };

  assert.equal(shouldShowManagerManagedPurchaseWorkspace(submittedSaleApplication), true);
  assert.equal(
    shouldShowManagerManagedPurchaseWorkspace({
      source: "sale_progression",
      status: "offer_submitted",
      listingType: "sale",
    }),
    false,
  );
  assert.equal(
    shouldShowManagerManagedPurchaseWorkspace({
      source: "application",
      status: "completed",
      listingType: "sale",
    }),
    false,
  );
});

test("backend approval refusals read as friendly sentences (E2E-f)", () => {
  assert.equal(
    formatApplicationStatusError("cannot approve the tenancy application until referencing and jurisdiction-specific checks are complete"),
    "This tenancy application can't be approved yet. Complete the referencing and compliance checks first.",
  );
  assert.equal(
    formatApplicationStatusError("cannot approve the sale application until buyer qualification and AML checks are complete"),
    "This sale application can't be approved yet. Complete the buyer qualification and AML checks first.",
  );
  assert.equal(formatApplicationStatusError("rejection reason is required"), "Rejection reason is required.");
  assert.equal(formatApplicationStatusError("  Already done.  "), "Already done.");
  assert.equal(formatApplicationStatusError("Is it ready?"), "Is it ready?");
  assert.equal(formatApplicationStatusError(""), "Failed to update the application status.");
  assert.equal(formatApplicationStatusError(undefined), "Failed to update the application status.");
});

test("the header Approve waits for the rent checks, like the rent workflow Approve (E2E-f)", () => {
  assert.equal(
    getHeaderApproveBlockedReason({ isRentApplication: true, rentApprovalReady: false }),
    "Complete the referencing and compliance checks before approving.",
  );
  assert.equal(getHeaderApproveBlockedReason({ isRentApplication: true, rentApprovalReady: true }), null);
  // Sale applications have no client-side equivalent: the server decides.
  assert.equal(getHeaderApproveBlockedReason({ isRentApplication: false, rentApprovalReady: false }), null);
});

test("a completed application, or one with a completed Fast Track case, is closed and counts as completed", () => {
  assert.equal(isManagerApplicationCompleted({ status: "completed" }), true);
  assert.equal(isManagerApplicationCompleted({ status: "viewing_scheduled", fastTrackCase: { workspaceFinalStatus: "completed" } }), true);
  assert.equal(isManagerApplicationCompleted({ status: "viewing_scheduled", fastTrackCase: { workspaceFinalStatus: "active" } }), false);
  assert.equal(isManagerApplicationClosed({ status: "withdrawn" }), true);
  assert.equal(isManagerApplicationClosed({ status: "completed" }), true);
  assert.equal(isManagerApplicationClosed({ status: "under_review" }), false);
  assert.equal(shouldShowManagerDecisionControls({ status: "under_review", listingType: "rent", fastTrackCase: { workspaceFinalStatus: "completed" } }), false);

  assert.deepEqual(
    getManagerApplicationCounts([
      { status: "completed" },
      { status: "submitted", requiresAction: true },
      { status: "approved" },
    ]),
    { active: 2, pending: 1, actionRequired: 1, completed: 2 },
  );
});
