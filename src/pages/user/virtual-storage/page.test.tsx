import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import type { FastTrackCase } from "@/services/fastTrackService";
import { UserVirtualStoragePageContent } from "./page";

test("virtual storage page renders vault metrics, categories, and upload state", () => {
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
        initialFastTrackCases={[fastTrackCase, inactiveFastTrackCase]}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /Virtual Storage/);
  assert.match(markup, /Identity/);
  assert.match(markup, /Address/);
  assert.match(markup, /Custom categories/);
  assert.match(markup, /Fast-track activity/);
  assert.match(markup, /1 active/);
  assert.match(markup, /1 inactive/);
  assert.match(markup, /Active fast-track/);
  assert.match(markup, /Palm View Apartment/);
  assert.match(markup, /Upload the core files/);
  assert.match(markup, /\/user\/dashboard\/fast-track\?case=case-my-activity-1&amp;section=documents/);
  assert.match(markup, /Inactive fast-track/);
  assert.match(markup, /Completed Villa/);
  assert.match(markup, /\/user\/dashboard\/fast-track\?case=case-my-activity-2&amp;section=handover/);
});
