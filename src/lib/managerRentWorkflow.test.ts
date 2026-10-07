import test from "node:test";
import assert from "node:assert/strict";

import { findLatestApplicationContractId, getManagerRentNextAction } from "./managerRentWorkflow";

test("manager rent next action starts with requesting documents when the shared lane is empty", () => {
  assert.deepEqual(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "documents_requested",
      caseFileSummary: {
        totalRequestCount: 0,
        openRequestCount: 0,
        pendingReviewCount: 0,
        reuploadCount: 0,
      },
    }),
    {
      id: "request_documents",
      label: "Request documents",
      title: "Start the shared document lane",
      description:
        "Create the checklist items here first so both the manager and the client can work from the same case file.",
      panel: "documents",
    },
  );
});

test("manager rent next action follows the document review sequence", () => {
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "documents_requested",
      caseFileSummary: {
        totalRequestCount: 2,
        openRequestCount: 1,
        pendingReviewCount: 0,
        reuploadCount: 0,
      },
    })?.id,
    "upload_for_client",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "documents_requested",
      caseFileSummary: {
        totalRequestCount: 2,
        openRequestCount: 1,
        pendingReviewCount: 1,
        reuploadCount: 0,
      },
    })?.id,
    "review_documents",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "documents_requested",
      caseFileSummary: {
        totalRequestCount: 2,
        openRequestCount: 1,
        pendingReviewCount: 0,
        reuploadCount: 1,
      },
    })?.id,
    "request_replacement",
  );
});

test("manager rent next action advances from documents to referencing, compliance, approval, and contract", () => {
  const clearDocuments = {
    totalRequestCount: 2,
    openRequestCount: 0,
    pendingReviewCount: 0,
    reuploadCount: 0,
  };

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "viewing_scheduled",
      caseFileSummary: clearDocuments,
    })?.id,
    "open_appointment",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "viewing_scheduled",
      caseFileSummary: clearDocuments,
    })?.panel,
    "appointments",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "viewing_completed",
      caseFileSummary: clearDocuments,
      referencingStatus: "pending",
    })?.id,
    "complete_referencing",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "viewing_completed",
      caseFileSummary: clearDocuments,
      referencingStatus: "pending",
    })?.panel,
    "referencing",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "referencing",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "pending",
    })?.id,
    "complete_right_to_rent",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "referencing",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "pending",
    })?.panel,
    "compliance",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "right_to_rent_pending",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: true,
    })?.id,
    "approve_application",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "right_to_rent_pending",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: true,
    })?.panel,
    "approval",
  );

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "approved",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: true,
    })?.id,
    "open_create_contract",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "approved",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: true,
    })?.panel,
    "approval",
  );
});

test("manager rent next action redirects to property readiness before contract creation when the pack is not ready", () => {
  const clearDocuments = {
    totalRequestCount: 2,
    openRequestCount: 0,
    pendingReviewCount: 0,
    reuploadCount: 0,
  };

  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "approved",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: false,
    })?.id,
    "review_property_readiness",
  );
  assert.equal(
    getManagerRentNextAction({
      listingType: "rent",
      applicationStatus: "approved",
      caseFileSummary: clearDocuments,
      referencingStatus: "completed",
      rightToRentStatus: "completed",
      propertyContractReady: false,
    })?.panel,
    "property_readiness",
  );
});

test("an application without a case finds its own newest contract (MB-0499)", () => {
  const contracts = [
    { id: "other-app", application_id: "app-2", created_at: "2026-10-05T10:00:00Z" },
    { id: "older", application_id: "app-1", created_at: "2026-10-01T10:00:00Z" },
    { id: "newest", application_id: "app-1", created_at: "2026-10-03T10:00:00Z" },
  ];

  assert.equal(findLatestApplicationContractId(contracts, "app-1"), "newest");
  assert.equal(findLatestApplicationContractId(contracts, "app-3"), null);
  assert.equal(findLatestApplicationContractId(null, "app-1"), null);
});

test("a withdrawn or ended contract does not stand in for a live one (MB-0499 retest)", () => {
  assert.equal(findLatestApplicationContractId([
    { id: "withdrawn", application_id: "app-1", created_at: "2026-10-07T10:00:00Z", status: "Withdrawn" },
  ], "app-1"), null);
  assert.equal(findLatestApplicationContractId([
    { id: "live", application_id: "app-1", created_at: "2026-10-01T10:00:00Z", status: "sent" },
    { id: "cancelled", application_id: "app-1", created_at: "2026-10-05T10:00:00Z", status: "cancelled" },
    { id: "expired", application_id: "app-1", created_at: "2026-10-06T10:00:00Z", status: "expired" },
  ], "app-1"), "live");
});
