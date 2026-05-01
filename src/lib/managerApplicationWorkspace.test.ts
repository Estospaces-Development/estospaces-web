import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkspaceSection } from "./liveCaseWorkspace";
import {
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
