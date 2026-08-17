import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  buildAdminOverrideConfirmationMessage,
  FastTrackDocumentReviewControls,
  FastTrackDocumentFileChooser,
  FastTrackUserDocumentPreparationCallout,
  findRecoveredThreadMessage,
  formatFastTrackCaseDeadline,
  formatFastTrackCaseStage,
  getFastTrackDocumentUploadCopy,
  isThreadSendTimeoutError,
  isAdminOverrideActivityEntry,
  isAdminOverrideFastTrackCase,
  isFastTrackCaseVisibleForFilter,
} from "./FastTrackWorkspace";
import { getCountryDocumentGuidance } from "@/lib/countryDocumentGuidance";
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
      statusMessage: "Uploaded and visible to your manager. Use Preview or Open when you want to review the file.",
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

test("selected-stage guidance lets users prepare documents before manager review", () => {
  const markup = renderToStaticMarkup(<FastTrackUserDocumentPreparationCallout />);

  assert.match(markup, /Open Share your documents now/);
  assert.match(markup, /switch between Identity and Address/);
  assert.doesNotMatch(markup, /Once that happens, you can upload/);
});

test("approved fast-track documents cannot be approved twice", () => {
  const approvedMarkup = renderToStaticMarkup(
    <FastTrackDocumentReviewControls
      item={{ id: "identity", label: "Identity", status: "approved" }}
      hasAttachedFile
      busy={false}
      onReview={() => {}}
    />,
  );

  assert.doesNotMatch(approvedMarkup, /aria-label="Approve Identity"/);
  assert.match(approvedMarkup, /Approved\. No further approval is needed\./);
  assert.match(approvedMarkup, /aria-label="Request replacement for Identity"/);

  const uploadedMarkup = renderToStaticMarkup(
    <FastTrackDocumentReviewControls
      item={{ id: "address", label: "Address", status: "uploaded" }}
      hasAttachedFile
      busy={false}
      onReview={() => {}}
    />,
  );

  assert.match(uploadedMarkup, /aria-label="Approve Address"/);
  assert.match(uploadedMarkup, /aria-label="Request replacement for Address"/);
});

const workspaceSource = () => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "FastTrackWorkspace.tsx"),
  "utf8",
);

const workspaceLayoutSource = () => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "FastTrackWorkspaceLayout.tsx"),
  "utf8",
);

test("fast-track preview buttons open a modal with zoom controls", () => {
  const source = workspaceSource();

  assert.match(source, /ensureDocumentPreview\(item, \{ openInModal: true, busyAction: 'preview' \}\)/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /createPortal\(content, document\.body\)/);
  assert.match(source, /fixed inset-0 z-\[9999\] flex items-center justify-center/);
  assert.match(source, /aria-label="Zoom out document preview"/);
  assert.match(source, /aria-label="Reset document preview zoom"/);
  assert.match(source, /aria-label="Zoom in document preview"/);
});

test("fast-track document open buttons use the full external viewer", () => {
  const source = workspaceSource();

  assert.match(source, /window\.open\('about:blank', '_blank'\)/);
  assert.match(source, /externalWindow\.location\.href = url/);
  assert.match(source, /const openedWindow = window\.open\(url, '_blank', 'noopener,noreferrer'\)/);
  assert.match(source, /window\.location\.assign\(url\)/);
  assert.match(source, /ensureDocumentPreview\(item, \{ openInNewTab: true, busyAction: 'open' \}\)/);
  assert.match(source, /onClick=\{\(\) => void handleRailOpen\(item\)\}/);
  assert.match(source, /onClick=\{\(\) => void handleRailOpen\(activeDocument\)\}/);
  assert.match(source, /Open PDF/);
  assert.match(source, /ensureDocumentPreview\(previewItem, \{ openInNewTab: true, busyAction: 'download' \}\)/);
  assert.doesNotMatch(source, /ensureDocumentPreview\(item, \{ openInSameTab: true, busyAction: 'open' \}\)/);
  assert.doesNotMatch(source, /ensureDocumentPreview\(item, \{ openInModal: true, busyAction: 'open' \}\)/);
});

test("fast-track uploaded document preview uses signed access URL without blob fetching", () => {
  const source = workspaceSource();

  assert.match(source, /const access = await getDocumentAccessUrl\(item\.documentRecordId\)/);
  assert.doesNotMatch(source, /getDocumentAccessBlob/);
  assert.match(source, /nextUrl = access\.url/);
});

test("fast-track PDFs render inside the preview modal with an external fallback", () => {
  const source = workspaceSource();

  assert.match(source, /<iframe/);
  assert.match(source, /title=\{`\$\{previewDisplayItem\.fileName \|\| previewDisplayItem\.label\} PDF preview`\}/);
  assert.match(source, /If your browser blocks the inline PDF viewer/);
  assert.match(source, /Open PDF/);
  assert.doesNotMatch(source, /<object/);
});

test("fast-track identity upload copy names Indian identity documents", () => {
  const source = workspaceSource();
  const indiaGuidance = getCountryDocumentGuidance("IN");

  assert.match(indiaGuidance.identityDetail, /Aadhaar proof, PAN card or Form 60, passport, voter ID, driving licence, NREGA job card, or NPR letter/);
  assert.match(indiaGuidance.identityDetail, /Prefer masked Aadhaar/);
  assert.match(source, /application\/pdf,image\/jpeg,image\/png,image\/webp/);
  assert.match(source, /documentGuidance\.identityDetail/);
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

test("manager review submit stays disabled until a star rating is selected", () => {
  const source = workspaceSource();

  assert.match(source, /const managerReviewSubmitDisabled = managerReviewRating < 1 \|\| managerReviewRating > 5;/);
  assert.match(source, /disabled=\{managerReviewSubmitDisabled\}/);
  assert.match(source, /Choose a star rating before submitting feedback\./);
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

test("fast-track notification deep links load the requested case before stale-link recovery", () => {
  const source = workspaceSource();

  assert.match(source, /const \[requestedCaseLookup, setRequestedCaseLookup\]/);
  assert.match(source, /getFastTrackCaseById\(normalizedRequestedCaseParam, \{ suppressErrorToast: true \}\)/);
  assert.match(source, /pendingSelectedCaseIdRef\.current = result\.data\.caseId/);
  assert.match(source, /setCases\(\(previous\) => sortFastTrackWorkspaceCases\(\[/);
  assert.match(source, /if \(result\.notFound\) \{/);
  assert.match(source, /setRequestedCaseLookup\(\{ caseId: normalizedRequestedCaseParam, status: 'miss' \}\)/);
  assert.match(source, /setRequestedCaseLookup\(\{ caseId: normalizedRequestedCaseParam, status: 'unavailable' \}\)/);
  assert.match(source, /setError\(result\.error \|\| 'The Fast Track service is temporarily unavailable\. Please try again\.'\);/);
  assert.match(source, /requestedCaseLookup\.status !== 'unavailable'/);
  assert.match(source, /setRequestedCaseRetryToken\(\(current\) => current \+ 1\)/);
  assert.match(source, /}, WORKSPACE_SYNC_INTERVALS\.WORKFLOW\);/);
  assert.match(source, /requestedCaseRetryToken,\s*\]\);/);
  assert.match(source, /if \(!silent\) \{\s*setError\(null\);\s*\}/);
  assert.match(source, /if \(result\.data\) \{\s*setError\(null\);/);
  assert.match(source, /&& requestedCaseLookupMissed/);
  assert.match(source, /shouldDeferFastTrackSelectionURLSync\(\{/);
  assert.match(source, /const recoveredCase = cases\.find\(\(item\) => \(/);
  assert.match(source, /item\.caseId\.trim\(\)\.toLowerCase\(\) === recoveredCaseLink\.trim\(\)\.toLowerCase\(\)/);
  assert.match(source, /setRecoveredCaseLink\(null\);\s*pendingSelectedCaseIdRef\.current = recoveredCase\.caseId;/);
  assert.match(source, /buildFastTrackSelectionSearchParams\(previous, recoveredCase\.caseId\)/);
  assert.ok(
    source.indexOf("getFastTrackCaseById(normalizedRequestedCaseParam") <
      source.indexOf("setRequestedCaseLookup({ caseId: normalizedRequestedCaseParam, status: 'miss' })"),
  );

  const lookupEffectStart = source.indexOf("const loadRequestedCase = async () => {");
  const staleLinkEffectStart = source.indexOf("if (!shouldRemoveFastTrackStaleCaseLink({", lookupEffectStart);
  assert.ok(lookupEffectStart >= 0 && staleLinkEffectStart > lookupEffectStart);
  assert.doesNotMatch(
    source.slice(lookupEffectStart, staleLinkEffectStart),
    /\n\s*requestedCaseLookup(?:Pending|Missed),/,
    "lookup state must not cancel its own in-flight request before a miss can clean the URL",
  );
});

test("selecting an accessible case clears a failed deep-link error", () => {
  const source = workspaceSource();
  const handlerStart = source.indexOf("const handleSelectCase = useCallback((caseId: string) => {");
  const handlerEnd = source.indexOf("const stepperItems = useMemo", handlerStart);

  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart);
  const handler = source.slice(handlerStart, handlerEnd);
  assert.match(handler, /setError\(null\);/);
  assert.match(handler, /setRequestedCaseLookup\(null\);/);
  assert.match(handler, /buildFastTrackSelectionSearchParams\(previous, caseId\)/);
});

test("compact case rail drawer sits above manager chrome without blurring the workspace", () => {
  const source = workspaceSource();

  assert.match(source, /renderFastTrackPortal\(\(/);
  assert.match(source, /fixed inset-0 z-\[9999\] xl:hidden/);
  assert.match(source, /data-fast-track-case-rail-drawer/);
  assert.match(source, /const fastTrackCaseRailOverlayStyle: React\.CSSProperties = \{\s*zIndex: 2147483646,/);
  assert.match(source, /style=\{fastTrackCaseRailOverlayStyle\}/);
  assert.match(source, /lg:left-\[var\(--workspace-sidebar-offset,0rem\)\]/);
  assert.match(source, /className="absolute inset-0 bg-gray-950\/75"/);
  assert.doesNotMatch(source, /fixed inset-0 z-40 xl:hidden/);
  assert.doesNotMatch(source, /absolute inset-0 bg-black\/30 backdrop-blur-sm/);
});

test("fast-track customization closes compact case rail overlay before opening", () => {
  const source = workspaceSource();

  assert.match(source, /const handleOpenCustomization = useCallback\(\(\) => \{\s*setCaseRailDrawerOpen\(false\);\s*setCustomizationOpen\(true\);\s*\}, \[\]\);/);
  assert.match(source, /compactDrawerOpen: caseRailDrawerOpen && !customizationOpen/);
  assert.match(source, /\[caseRailDrawerOpen, compactCaseRailViewport, customizationOpen, workspacePreferences\.caseRailCollapsed\]/);
  assert.match(source, /onOpenCustomize=\{handleOpenCustomization\}/);
  assert.doesNotMatch(source, /onOpenCustomize=\{\(\) => setCustomizationOpen\(true\)\}/);
});

test("fast-track customization drawer renders above manager header through a body portal", () => {
  const source = workspaceLayoutSource();
  const closeButtonLabels = source.match(/aria-label="Close workspace customization drawer"/g) || [];

  assert.match(source, /createPortal\(content, document\.body\)/);
  assert.match(source, /renderFastTrackLayoutPortal\(/);
  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /fixed isolate z-\[2147483647\] flex justify-end overflow-hidden/);
  assert.match(source, /bottom-0 left-0 right-0 top-16 bg-transparent lg:left-\[var\(--workspace-sidebar-offset,16rem\)\]/);
  assert.match(source, /data-fast-track-customization-scrim/);
  assert.match(source, /aria-label="Dismiss workspace customization overlay"/);
  assert.match(source, /flex-1 cursor-default bg-transparent/);
  assert.equal(closeButtonLabels.length, 1);
  assert.match(source, /data-fast-track-customization-drawer/);
  assert.match(source, /h-full max-h-full w-full max-w-md overflow-y-auto overscroll-contain/);
  assert.match(source, /data-fast-track-customization-panel/);
  assert.match(source, /const fastTrackChromeOverlayStyle: React\.CSSProperties = \{\s*zIndex: 2147483647,/);
  assert.doesNotMatch(source, /top: 'var\(--workspace-header-height, 4rem\)'/);
  assert.doesNotMatch(source, /left: 'var\(--workspace-sidebar-offset, 0rem\)'/);
  assert.match(source, /style=\{fastTrackChromeOverlayStyle\}/);
  assert.doesNotMatch(source, /h-dvh max-h-dvh/);
  assert.doesNotMatch(source, /data-fast-track-customization-scrim[\s\S]{0,200}aria-label="Close workspace customization drawer"/);
  assert.doesNotMatch(source, /fixed inset-0[^"]*backdrop-blur/);
  assert.doesNotMatch(source, /data-fast-track-customization-scrim[\s\S]{0,160}backdrop-blur/);
  assert.doesNotMatch(source, /bg-gray-950\/25|bg-gray-950\/55|bg-black\/30/);
});
test("fast-track viewing response actions are mutually exclusive", () => {
  const source = workspaceSource();

  assert.ok(source.includes("getFastTrackViewingResponseConflictMessage(selectedCase, 'confirm_viewing')"));
  assert.ok(source.includes("getFastTrackViewingResponseConflictMessage(selectedCase, 'request_viewing_change')"));
  assert.ok(source.includes("disabled={confirmViewingDisabled}"));
  assert.ok(source.includes("disabled={requestViewingChangeDisabled}"));
});

test("fast-track stage navigation uses workflow readiness instead of current plus one", () => {
  const source = workspaceSource();

  assert.ok(source.includes('canNavigateToStage'), 'should define a canNavigateToStage guard');
  assert.ok(source.includes('isFastTrackStageUnlocked(selectedCase, targetStage)'),
    'should resolve navigation from authoritative workflow readiness');
  assert.ok(source.includes("setActiveStageOverride(nextStage === selectedCase.stage ? null : nextStage)"),
    'should preserve an explicitly selected unlocked historical stage');
  assert.ok(source.includes("toast.info('Complete the current stage before moving to the next one.')"),
    'should show toast when user tries to skip ahead');
});

test("fast-track stepper disables locked future stages", () => {
  const layoutSource = workspaceLayoutSource();

  assert.ok(layoutSource.includes('item.locked'), 'stepper items should carry a locked flag');
  assert.ok(layoutSource.includes('disabled={item.locked}'), 'locked stepper buttons should be disabled');
  assert.ok(layoutSource.includes('cursor-not-allowed'), 'locked stepper buttons should show not-allowed cursor');
  assert.ok(layoutSource.includes("'Complete the current stage first'"),
    'locked stepper buttons should have an explanatory title');
});

test("fast-track polls workflow changes promptly for users and managers", () => {
    const source = workspaceSource();

    assert.match(
        source,
        /intervalMs:\s*WORKSPACE_SYNC_INTERVALS\.WORKFLOW/,
        "cross-role workflow changes should refresh on the workflow cadence",
    );
    assert.doesNotMatch(source, /role === ['"]user['"] \? 60000/);
});

test("fast-track preserves deep-linked stage while the requested case changes", () => {
    const source = workspaceSource();

    assert.ok(source.includes('shouldDeferFastTrackStageResolution(requestedCaseForStageNavigation, selectedCase.caseId)'));
    assert.ok(source.includes("'mark_payment_received'"), 'legacy payment holds should expose a recovery action');
    assert.ok(source.includes('Confirm previous payment'));
    assert.ok(source.includes('shouldRemoveFastTrackStaleCaseLink({'),
        'stale-link recovery must use the deferred lookup state machine');
});
