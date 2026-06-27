import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  FastTrackDocumentFileChooser,
  getFastTrackDocumentUploadCopy,
} from "./FastTrackWorkspace";

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

  assert.match(source, /ensureDocumentPreview\(item, \{ openInModal: true \}\)/);
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

  assert.match(source, /Aadhaar, PAN, passport, voter ID, or driving licence/);
  assert.match(source, /clear PDF, JPG, PNG, or WebP/);
});
