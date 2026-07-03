import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildAdminOverrideConfirmationMessage,
  FastTrackDocumentFileChooser,
  findRecoveredThreadMessage,
  formatFastTrackCaseDeadline,
  formatFastTrackCaseStage,
  getFastTrackDocumentUploadCopy,
  isThreadSendTimeoutError,
  isAdminOverrideActivityEntry,
  isAdminOverrideFastTrackCase,
  isFastTrackCaseVisibleForFilter,
} from "./FastTrackWorkspace";
import type { Message } from "@/services/messagesService";
import type { FastTrackCase } from "@/services/fastTrackService";

const buildFastTrackCase = (overrides: Partial<FastTrackCase> = {}): FastTrackCase => ({
  id: "case-record-1",
  caseId: "case-1",
  propertyId: "property-1",
  propertyTitle: "Example property",
  propertyType: "Apartment",
  clientId: "user-1",
  clientName: "Example user",
  managerId: "manager-1",
  listingType: "rent",
  journeyMode: "rent",
  journeyType: "rent",
  submittedAt: "2026-04-14T00:00:00Z",
  hoursRemaining: -6,
  overdue: true,
  stage: "viewing",
  currentStep: "viewing_scheduled",
  backendCurrentStep: "viewing_scheduled",
  workspaceFinalStatus: "active",
  finalStatus: "in_progress",
  documents: {
    identityProof: "pending",
    addressProof: "pending",
    items: [],
    allUploaded: false,
    allApproved: false,
  },
  viewing: { status: "pending" },
  decision: { mode: "rent", status: "pending" },
  agreement: { status: "pending", paymentStatus: "not_requested" },
  handover: { status: "pending" },
  activity: [],
  documentPhase: "not_requested",
  ...overrides,
});

test("fast-track document file chooser exposes a named file input with visible focus", () => {
  const markup = renderToStaticMarkup(
    <FastTrackDocumentFileChooser
      documentId="address-proof"
      label="Address"
      onFileSelected={() => {}}
    />,
  );

  assert.match(markup, /type="file"/);
  assert.match(markup, /accept="application\/pdf,image\/jpeg,image\/png,image\/webp"/);
  assert.match(markup, /data-fast-track-document-file-input="address-proof"/);
  assert.match(markup, /aria-label="Choose file for Address"/);
  assert.match(markup, /peer-focus-visible:ring-2/);
});

test("fast-track user document upload copy makes uploaded and reupload states visible", () => {
  assert.deepEqual(
    getFastTrackDocumentUploadCopy({ status: "pending", hasAttachedFile: false }),
    {
      chooserSummary: "No file selected",
      actionLabel: "Upload file",
      statusMessage: "Upload the requested file so your manager can review it.",
    },
  );

  assert.deepEqual(
    getFastTrackDocumentUploadCopy({ status: "uploaded", hasAttachedFile: true }),
    {
      chooserSummary: "No reupload selected",
      actionLabel: "Reupload file",
      statusMessage: "Uploaded and visible to your manager. Preview is ready in this workspace.",
    },
  );

  assert.deepEqual(
    getFastTrackDocumentUploadCopy({ status: "reupload_needed", hasAttachedFile: true }),
    {
      chooserSummary: "No replacement selected",
      actionLabel: "Reupload file",
      statusMessage: "Reupload requested. Choose a replacement file and submit it here.",
    },
  );
});

const workspaceSource = () => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "FastTrackWorkspace.tsx"),
  "utf8",
);

test("fast-track preview buttons open a modal with zoom controls", () => {
  const source = workspaceSource();

  assert.match(source, /ensureDocumentPreview\(item, \{ openInModal: true, busyAction: 'preview' \}\)/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-label="Zoom out document preview"/);
  assert.match(source, /aria-label="Reset document preview zoom"/);
  assert.match(source, /aria-label="Zoom in document preview"/);
});

test("fast-track uploaded document preview uses signed access URL without blob fetching", () => {
  const source = workspaceSource();

  assert.match(source, /const access = await getDocumentAccessUrl\(item\.documentRecordId\)/);
  assert.doesNotMatch(source, /getDocumentAccessBlob/);
  assert.match(source, /nextUrl = access\.url/);
});

test("fast-track PDFs avoid broken inline iframe previews", () => {
  const source = workspaceSource();

  assert.doesNotMatch(source, /<iframe/);
  assert.match(source, /PDFs open in the browser viewer/);
  assert.match(source, /Open PDF/);
});

test("fast-track identity upload copy names Indian identity documents", () => {
  const source = workspaceSource();

  assert.match(source, /Aadhaar proof, passport, voter ID, driving licence, NREGA job card, or NPR letter/);
  assert.match(source, /PAN card or Form 60 may be requested/);
  assert.match(source, /prefer masked Aadhaar/);
  assert.match(source, /clear PDF, JPG, PNG, or WebP/);
});

test("case chat timeout recovery only accepts a recent matching sender message", () => {
  const sendStartedAt = new Date("2026-07-02T10:00:00Z").getTime();
  const recentMine: Message = {
    id: "message-recent",
    conversation_id: "conversation-1",
    sender_id: "manager-1",
    content: "Please upload the signed agreement.",
    type: "text",
    is_read: false,
    created_at: "2026-07-02T10:00:01Z",
  };
  const recentOtherSender: Message = {
    ...recentMine,
    id: "message-other",
    sender_id: "user-1",
  };
  const oldMine: Message = {
    ...recentMine,
    id: "message-old",
    created_at: "2026-07-02T09:55:00Z",
  };

  assert.equal(
    findRecoveredThreadMessage(
      [oldMine, recentOtherSender, recentMine],
      " Please upload the signed agreement. ",
      "manager-1",
      sendStartedAt,
    )?.id,
    "message-recent",
  );
  assert.equal(findRecoveredThreadMessage([oldMine], oldMine.content, "manager-1", sendStartedAt), null);
  assert.equal(findRecoveredThreadMessage([recentOtherSender], recentOtherSender.content, "manager-1", sendStartedAt), null);
});

test("case chat send timeout path refreshes messages before showing an error", () => {
  const source = workspaceSource();

  assert.equal(isThreadSendTimeoutError("Request timed out"), true);
  assert.equal(isThreadSendTimeoutError("Network failed"), false);
  assert.match(source, /const messages = await getMessages\(conversation\.id, 1, 50\)/);
  assert.match(source, /findRecoveredThreadMessage\(sortedMessages, draftContent, user\.id, sendStartedAt\)/);
  assert.match(source, /toast\.success\(successMessage\)/);
});

test("completed fast-track cases show completed handover instead of old SLA and stage", () => {
  const completedCase = buildFastTrackCase({
    workspaceFinalStatus: "completed",
    finalStatus: "completed",
    stage: "viewing",
    hoursRemaining: -8,
    overdue: true,
    handover: {
      status: "completed",
      completedAt: "2026-05-05T12:00:00Z",
      completedBy: "manager-1",
      confirmedByUser: true,
    },
  });

  assert.equal(formatFastTrackCaseDeadline(completedCase, "manager"), "Completed");
  assert.equal(formatFastTrackCaseStage(completedCase, "manager"), "Handover");
});

test("user still sees handover confirmation when manager has completed the case", () => {
  const waitingForUserCase = buildFastTrackCase({
    workspaceFinalStatus: "completed",
    finalStatus: "completed",
    stage: "handover",
    handover: {
      status: "completed",
      completedAt: "2026-05-05T12:00:00Z",
      completedBy: "manager-1",
      confirmedByUser: false,
    },
  });

  assert.equal(formatFastTrackCaseDeadline(waitingForUserCase, "user"), "Confirm handover");
  assert.equal(formatFastTrackCaseStage(waitingForUserCase, "user"), "Get your keys");
});

test("fast-track document status and upload metadata wrap inside cards", () => {
  const source = workspaceSource();

  assert.match(source, /max-w-full rounded-full border px-3 py-1 text-center text-\[11px\] font-semibold leading-5 break-words/);
  assert.match(source, /mt-2 break-words text-sm font-semibold text-gray-900/);
  assert.match(source, /Last upload \{formatDateTime\(item\.uploadedAt\)\}/);
  assert.match(source, /Reviewed \{formatDateTime\(item\.reviewedAt\)\}/);
});

test("completed manager handover is read-only with clear feedback", () => {
  const source = workspaceSource();

  assert.match(source, /data-fast-track-completed-handover-summary/);
  assert.match(source, /Case already completed/);
  assert.match(source, /No additional handover action is required from this workspace/);
});

test("admin fast-track workspace constrains compact layouts inside the viewport", () => {
  const source = workspaceSource();

  assert.match(source, /min-w-0 max-w-full space-y-6 overflow-x-hidden pb-16/);
  assert.match(source, /grid min-w-0 max-w-full gap-4/);
  assert.match(source, /min-w-0 max-w-full space-y-6/);
  assert.match(source, /min-w-0 max-w-full overflow-hidden rounded-\[26px\]/);
});

test("admin manager-owned fast-track actions require override confirmation", () => {
  const fastTrackCase = buildFastTrackCase({
    managerId: "manager-123",
    propertyTitle: "Live manager case",
  });

  assert.equal(isAdminOverrideFastTrackCase("admin", fastTrackCase), true);
  assert.equal(isAdminOverrideFastTrackCase("manager", fastTrackCase), false);
  assert.equal(isAdminOverrideFastTrackCase("admin", { managerId: "" }), false);
  assert.equal(
    buildAdminOverrideConfirmationMessage(fastTrackCase, "schedule_viewing"),
    "You are about to act on behalf of the assigned manager for Live manager case. Action: schedule a viewing. Continue?",
  );
});

test("admin override warning and activity indicator are rendered from shared workspace source", () => {
  const source = workspaceSource();

  assert.match(source, /data-fast-track-admin-override-banner/);
  assert.match(source, /Admin override mode/);
  assert.match(source, /data-fast-track-admin-override-confirmation/);
  assert.match(source, /Continue as admin/);
  assert.doesNotMatch(source, /window\.confirm/);
  assert.match(source, /admin_override: true/);
  assert.match(source, /data-fast-track-admin-override-activity/);
  assert.equal(isAdminOverrideActivityEntry({ actorRole: "admin" }), true);
  assert.equal(isAdminOverrideActivityEntry({ actorRole: "manager" }), false);
});

test("fast-track filter selection cannot render a stale hidden case", () => {
  const activeCase = buildFastTrackCase({
    caseId: "active-case",
    workspaceFinalStatus: "active",
  });
  const completedCase = buildFastTrackCase({
    caseId: "completed-case",
    workspaceFinalStatus: "completed",
  });
  const source = workspaceSource();

  assert.equal(isFastTrackCaseVisibleForFilter(activeCase, "active"), true);
  assert.equal(isFastTrackCaseVisibleForFilter(completedCase, "active"), false);
  assert.match(source, /requestedCaseStillVisible/);
  assert.match(source, /requestedCaseIsVisible/);
  assert.match(source, /filteredCases\.some\(\(item\) => item\.caseId === requestedCaseParam\)/);
  assert.match(source, /requestedCase && requestedCase !== selectedCaseId && requestedCaseIsVisible/);
  assert.doesNotMatch(
    source,
    /filteredCases\.find\(\(item\) => item\.caseId === selectedCaseId\) \|\| cases\.find/,
  );
});

test("fast-track filter selection resolves from visible filtered cases", () => {
  const source = workspaceSource();

  assert.match(source, /const pendingCaseExists = filteredCases\.some\(\(item\) => item\.caseId === pendingSelectedCaseId\)/);
  assert.match(
    source,
    /resolveFastTrackSelectionCaseId\(\s*filteredCases,\s*selectionParamsForResolution,\s*selectedCaseId,\s*\)/,
  );
  assert.doesNotMatch(source, /resolveFastTrackSelectionCaseId\(cases, selectionParamsForResolution, selectedCaseId\)/);
});

test("compact case rail drawer sits above manager chrome without blurring the workspace", () => {
  const source = workspaceSource();

  assert.match(source, /fixed inset-0 z-\[9999\] xl:hidden/);
  assert.match(source, /data-fast-track-case-rail-drawer/);
  assert.match(source, /lg:left-\[var\(--workspace-sidebar-offset,0rem\)\]/);
  assert.match(source, /className="absolute inset-0 bg-gray-950\/75"/);
  assert.doesNotMatch(source, /fixed inset-0 z-40 xl:hidden/);
  assert.doesNotMatch(source, /absolute inset-0 bg-black\/30 backdrop-blur-sm/);
});
