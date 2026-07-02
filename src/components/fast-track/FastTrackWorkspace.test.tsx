import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  FastTrackDocumentFileChooser,
  formatFastTrackCaseDeadline,
  formatFastTrackCaseStage,
  getFastTrackDocumentUploadCopy,
} from "./FastTrackWorkspace";
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
