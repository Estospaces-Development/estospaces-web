import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { FastTrackCase } from "@/services/fastTrackService";
import type { UserDocument } from "@/services/leadsService";
import { groupVirtualStorageDocuments, UserVirtualStoragePageContent } from "./page";

test("groups the same stored file once while preserving category and review history", () => {
  const baseDocument = {
    id: "document-identity",
    user_id: "user-1",
    document_type: "identity",
    document_category: "identity",
    file_name: "pasta.jpeg",
    file_url: "https://example.test/pasta.jpeg",
    file_size: 2048,
    mime_type: "image/jpeg",
    status: "pending",
    virtual_storage_state: "saved",
    created_at: "2026-07-16T10:00:00Z",
    updated_at: "2026-07-16T10:00:00Z",
    linked_entities: [{ type: "fast_track_case", id: "case-1" }],
  } as UserDocument;
  const groups = groupVirtualStorageDocuments([
    baseDocument,
    {
      ...baseDocument,
      id: "document-address",
      document_type: "address",
      document_category: "address",
      status: "approved",
      updated_at: "2026-07-16T11:00:00Z",
    },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].document.id, "document-address");
  assert.deepEqual(groups[0].categoryStatuses, [
    { category: "identity", status: "pending" },
    { category: "address", status: "approved" },
  ]);
  assert.equal(groups[0].linkedEntities.length, 1);
});

test("virtual storage page renders vault metrics, categories, and current fast-track state", () => {
  const fastTrackCase = {
    caseId: "case-my-activity-1",
    propertyTitle: "Palm View Apartment",
    submittedAt: "2026-06-20T10:00:00Z",
    hoursRemaining: 8,
    stage: "documents",
    workspaceFinalStatus: "active",
    finalStatus: "in_progress",
    journeyMode: "rent",
    handover: { status: "pending" },
  } as FastTrackCase;
  const inactiveFastTrackCase = {
    ...fastTrackCase,
    caseId: "case-my-activity-2",
    propertyTitle: "Completed Villa",
    workspaceFinalStatus: "completed",
    finalStatus: "completed",
    stage: "handover",
    hoursRemaining: 0,
    handover: { status: "completed" },
  } as FastTrackCase;
  const olderActiveFastTrackCase = {
    ...fastTrackCase,
    caseId: "case-my-activity-3",
    propertyTitle: "Older Active Villa",
    hoursRemaining: 20,
    submittedAt: "2026-06-18T10:00:00Z",
  } as FastTrackCase;

  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/user/virtual-storage"]}>
      <UserVirtualStoragePageContent
        currentUser={{
          id: "user-virtual-storage-test",
          email: "vault-user@example.test",
          name: "Vault User",
          role: "user",
          isAuthenticated: true,
        }}
        initialFastTrackCases={[olderActiveFastTrackCase, fastTrackCase, inactiveFastTrackCase]}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /Virtual Storage/);
  assert.match(markup, /Identity/);
  assert.match(markup, /Address/);
  assert.match(markup, /Custom categories/);
  assert.match(markup, /Fast-track activity/);
  assert.match(markup, /1 current/);
  assert.match(markup, /Current fast-track/);
  assert.match(markup, /Palm View Apartment/);
  assert.match(markup, /Upload the core files/);
  assert.match(markup, /\/user\/dashboard\/fast-track\?case=case-my-activity-1&amp;section=documents/);
  assert.doesNotMatch(markup, /Inactive fast-track/);
  assert.doesNotMatch(markup, /Completed Villa/);
  assert.doesNotMatch(markup, /Older Active Villa/);
  assert.doesNotMatch(markup, /\/user\/dashboard\/fast-track\?case=case-my-activity-2&amp;section=handover/);
});
