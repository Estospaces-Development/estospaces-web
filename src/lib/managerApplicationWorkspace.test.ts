import test from "node:test";
import assert from "node:assert/strict";

import { resolveWorkspaceSection } from "./liveCaseWorkspace";
import {
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
