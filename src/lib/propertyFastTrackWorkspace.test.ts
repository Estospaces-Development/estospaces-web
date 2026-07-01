import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  resolveCreatedPropertyFastTrackCase,
  resolvePropertyFastTrackSummaryDocuments,
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

test("property summary ignores older lead documents when a fresh active case is selected", () => {
  const activeCase = {
    id: "case-new",
    caseId: "FT-NEW",
    leadId: "lead-reused",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
  };
  const staleDocument = {
    id: "doc-old",
    lead_id: "lead-reused",
    document_category: "identity",
    status: "uploaded",
    linked_entities: [{
      type: "fast_track_case",
      id: "case-old",
      fast_track_case_id: "case-old",
    }],
  };

  const documents = resolvePropertyFastTrackSummaryDocuments(
    [staleDocument as any],
    activeCase as any,
  );

  assert.deepEqual(documents, []);
});

test("property summary keeps documents linked to the selected active case", () => {
  const activeCase = {
    id: "case-new",
    caseId: "FT-NEW",
    leadId: "lead-reused",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
  };
  const activeDocument = {
    id: "doc-current",
    lead_id: "lead-reused",
    document_category: "identity",
    status: "uploaded",
    linked_entities: [{
      type: "fast_track_case",
      id: "case-new",
      fast_track_case_id: "case-new",
    }],
  };

  const documents = resolvePropertyFastTrackSummaryDocuments(
    [activeDocument as any],
    activeCase as any,
  );

  assert.equal(documents.length, 1);
  assert.equal(documents[0].id, "doc-current");
});

test("created property fast-track case wins when refresh returns a different active case", () => {
  const createdCase = {
    id: "case-new",
    caseId: "FT-NEW",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
  };
  const staleRefreshedCase = {
    id: "case-dev-smoke",
    caseId: "FT-OLD",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
  };

  const selectedCase = resolveCreatedPropertyFastTrackCase(
    createdCase as any,
    staleRefreshedCase as any,
  );

  assert.equal(selectedCase.caseId, "FT-NEW");
});

test("created property fast-track case accepts refreshed data for the same case", () => {
  const createdCase = {
    id: "case-new",
    caseId: "FT-NEW",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
    stage: "selected",
  };
  const refreshedCase = {
    id: "case-new",
    caseId: "FT-NEW",
    finalStatus: "in_progress",
    workspaceFinalStatus: "active",
    stage: "documents",
  };

  const selectedCase = resolveCreatedPropertyFastTrackCase(
    createdCase as any,
    refreshedCase as any,
  );

  assert.equal(selectedCase.stage, "documents");
});

test("property detail keeps the newly created fast-track case available before refresh catches up", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/user/properties/[id]/page.tsx"), "utf8");

  assert.match(source, /const createdFastTrackCase = fastTrackResult\.data/);
  assert.match(source, /resolveCreatedPropertyFastTrackCase\(\s*createdFastTrackCase,\s*refreshedWorkspace\.fastTrackCase,\s*\)/);
  assert.match(source, /setActiveFastTrackCase\(selectedFastTrackCase\)/);
});
