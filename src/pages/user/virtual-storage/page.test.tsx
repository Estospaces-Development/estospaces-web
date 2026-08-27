import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import React, { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Window } from "happy-dom";

import type { FastTrackCase } from "@/services/fastTrackService";
import type { UserDocument } from "@/services/leadsService";
import {
  formatVirtualStorageCategoryName,
  getVirtualStorageDocumentPage,
  groupVirtualStorageDocuments,
  VirtualStorageFilePicker,
  UserVirtualStoragePageContent,
} from "./page";

const virtualStoragePageSource = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

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

test("virtual storage documents paginate and remain visible on a single page", () => {
  const groups = Array.from({ length: 9 }, (_, index) => ({
    key: `document-${index + 1}`,
    document: { id: `document-${index + 1}` } as UserDocument,
    categoryStatuses: [],
    storageStates: ["saved"],
    linkedEntities: [],
  }));

  const secondPage = getVirtualStorageDocumentPage(groups, 2);
  assert.equal(secondPage.totalPages, 2);
  assert.equal(secondPage.currentPage, 2);
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.items[0].key, "document-9");
  assert.match(virtualStoragePageSource, /storedDocumentPagination\.items\.map/);
  assert.match(virtualStoragePageSource, /itemLabel="stored documents"[\s\S]*showWhenSinglePage/);
});

test("virtual storage category labels use consistent title case", () => {
  assert.equal(
    formatVirtualStorageCategoryName({
      id: "category-1",
      name: "school_admissions",
      slug: "school-admissions",
      source: "user",
    }),
    "School Admissions",
  );
  assert.equal(
    formatVirtualStorageCategoryName({
      id: "category-2",
      name: "SHAYANTIKA",
      slug: "shayantika",
      source: "user",
    }),
    "Shayantika",
  );
});

test("virtual storage file picker exposes complete empty and selected states", () => {
  const browserWindow = new Window({ url: "https://estospaces.test/user/dashboard/virtual-storage" });
  const globals = globalThis as typeof globalThis & Record<string, unknown>;
  const globalKeys = ["window", "document", "HTMLElement", "Node", "File", "Event", "IS_REACT_ACT_ENVIRONMENT"] as const;
  const previousDescriptors = new Map(
    globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
  );

  Object.entries({
    window: browserWindow,
    document: browserWindow.document,
    HTMLElement: browserWindow.HTMLElement,
    Node: browserWindow.Node,
    File: browserWindow.File,
    Event: browserWindow.Event,
    IS_REACT_ACT_ENVIRONMENT: true,
  }).forEach(([key, value]) => {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  });

  const FilePickerHarness = () => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    return <VirtualStorageFilePicker selectedFile={selectedFile} onFileChange={setSelectedFile} />;
  };
  const host = browserWindow.document.createElement("div");
  browserWindow.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);

  try {
    act(() => root.render(<FilePickerHarness />));
    const input = host.querySelector("#virtual-storage-file") as unknown as HTMLInputElement | null;
    const label = host.querySelector('label[for="virtual-storage-file"]') as unknown as HTMLLabelElement | null;
    assert.ok(input, "file input should render");
    assert.ok(label, "file input should have an associated label");
    assert.equal(input.tabIndex, 0);
    assert.match(label.textContent || "", /FileChoose fileNo file chosen/);
    assert.doesNotMatch(label.textContent || "", /Ready to upload/);

    act(() => input.focus());
    assert.equal(browserWindow.document.activeElement, input);

    const selectedFile = new browserWindow.File(
      ["verification-proof"],
      "complete-address-verification-proof-2026.pdf",
      { type: "application/pdf" },
    );
    Object.defineProperty(input, "files", {
      configurable: true,
      value: [selectedFile],
    });
    const changeEvent = new browserWindow.Event("change", { bubbles: true }) as unknown as Event;
    act(() => input.dispatchEvent(changeEvent));

    assert.match(label.textContent || "", /complete-address-verification-proof-2026\.pdf/);
    assert.match(label.textContent || "", /Ready to upload/);
    assert.doesNotMatch(label.textContent || "", /No file chosen/);
  } finally {
    act(() => root.unmount());
    browserWindow.close();
    previousDescriptors.forEach((descriptor, key) => {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globals[key];
    });
  }
});
