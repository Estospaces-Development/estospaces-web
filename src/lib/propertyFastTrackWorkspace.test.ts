import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  resolvePropertyFastTrackPanelLabels,
  resolvePropertyFastTrackWorkspaceSelection,
} from "./propertyFastTrackWorkspace";

test("property fast-track workspace prefers the active case over an expired lead", () => {
  const staleLead = {
    id: "lead-stale",
    status: "expired",
    created_at: "2026-04-28T10:00:00Z",
    broker_request_id: "request-stale",
  };
  const activeCase = {
    id: "case-row-1",
    caseId: "FT-1001",
    leadId: "lead-stale",
    brokerRequestId: "request-live",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
    stage: "documents",
    hoursRemaining: 18,
    submittedAt: "2026-04-29T10:00:00Z",
  };

  const selection = resolvePropertyFastTrackWorkspaceSelection({
    propertyLeads: [staleLead as any],
    propertyCases: [activeCase as any],
    requestedCaseId: null,
    brokerRequestQuery: null,
  });
  const labels = resolvePropertyFastTrackPanelLabels(
    selection.lead as any,
    [],
    selection.fastTrackCase as any,
  );

  assert.equal(selection.fastTrackCase?.caseId, "FT-1001");
  assert.equal(selection.lead?.id, "lead-stale");
  assert.equal(labels.stage, "Documents");
  assert.equal(labels.deadline, "18h left");
});

test("property fast-track workspace keeps a valid case deep link selected", () => {
  const olderCase = {
    id: "case-row-old",
    caseId: "FT-OLD",
    leadId: "lead-old",
    brokerRequestId: "request-old",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
    stage: "selected",
    hoursRemaining: 6,
    submittedAt: "2026-04-29T11:00:00Z",
  };
  const requestedCase = {
    id: "case-row-docs",
    caseId: "FT-DOCS",
    leadId: "lead-docs",
    brokerRequestId: "request-docs",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
    stage: "documents",
    hoursRemaining: 22,
    submittedAt: "2026-04-29T09:00:00Z",
  };

  const selection = resolvePropertyFastTrackWorkspaceSelection({
    propertyLeads: [
      { id: "lead-old", status: "new", created_at: "2026-04-29T11:00:00Z" } as any,
      { id: "lead-docs", status: "new", created_at: "2026-04-29T09:00:00Z" } as any,
    ],
    propertyCases: [olderCase as any, requestedCase as any],
    requestedCaseId: "FT-DOCS",
    brokerRequestQuery: null,
  });

  assert.equal(selection.fastTrackCase?.caseId, "FT-DOCS");
  assert.equal(selection.lead?.id, "lead-docs");
});

test("property detail keeps the newly created fast-track case available before refresh catches up", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/user/properties/[id]/page.tsx"), "utf8");

  assert.match(source, /setActiveFastTrackCase\(fastTrackResult\.data\)/);
  assert.match(source, /setLiveWorkspaceLoaded\(Boolean\(refreshedWorkspace\.lead \|\| refreshedWorkspace\.fastTrackCase \|\| fastTrackResult\.data\)\)/);
});
