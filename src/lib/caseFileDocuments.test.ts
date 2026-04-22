import test from "node:test";
import assert from "node:assert/strict";

import {
  filterReusableDocumentsForRequest,
  inferCaseFileUploadDescriptor,
  matchCaseFileRequestForFileName,
  summarizeCaseFileDocuments,
} from "./caseFileDocuments";

test("case-file upload descriptor maps identity and address requests to verification uploads", () => {
  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Identity document",
      requirement_codes: ["identity_proof"],
    }),
    {
      uploadType: "identity",
      documentType: "government_id",
      documentCategory: "identity",
      linkFamily: "client_reusable",
      visibility: "shared_with_user",
    },
  );

  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Proof of address",
      requirement_codes: ["address_proof"],
      visibility: "manager_only",
    }),
    {
      uploadType: "address",
      documentType: "address_proof",
      documentCategory: "address",
      linkFamily: "client_reusable",
      visibility: "manager_only",
    },
  );
});

test("case-file upload descriptor maps buyer qualification and transactional requests correctly", () => {
  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Proof of funds / MIP",
      requirement_codes: ["proof_of_funds", "mortgage_in_principle"],
      link_family: "client_reusable",
    }),
    {
      uploadType: "proof_of_funds",
      documentType: "proof_of_funds",
      documentCategory: "financial",
      linkFamily: "client_reusable",
      visibility: "shared_with_user",
    },
  );

  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Signed tenancy agreement",
      requirement_codes: ["tenancy_agreement_signed"],
      link_family: "case_transactional",
    }),
    {
      uploadType: "transactional",
      documentType: "transaction_document",
      documentCategory: "transactional",
      linkFamily: "case_transactional",
      visibility: "shared_with_user",
    },
  );
});

test("case-file upload descriptor covers employment, reference, and generic supporting requests", () => {
  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Employment reference",
      requirement_codes: ["employment", "salary"],
    }),
    {
      uploadType: "employment",
      documentType: "employment_proof",
      documentCategory: "employment",
      linkFamily: "client_reusable",
      visibility: "shared_with_user",
    },
  );

  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Landlord reference letter",
      requirement_codes: ["reference"],
    }),
    {
      uploadType: "reference",
      documentType: "reference_letter",
      documentCategory: "reference",
      linkFamily: "client_reusable",
      visibility: "shared_with_user",
    },
  );

  assert.deepEqual(
    inferCaseFileUploadDescriptor({
      title: "Additional supporting evidence",
      requirement_codes: ["custom_supporting_item"],
    }),
    {
      uploadType: "supporting_document",
      documentType: "supporting_document",
      documentCategory: "supporting",
      linkFamily: "client_reusable",
      visibility: "shared_with_user",
    },
  );
});

test("case-file summary counts document states and open requests", () => {
  assert.deepEqual(
    summarizeCaseFileDocuments(
      [
        { status: "approved" },
        { status: "uploaded" },
        { status: "under_review" },
        { status: "reupload_required" },
      ],
      [
        { status: "requested" },
        { status: "approved" },
        { status: "under_review" },
      ],
    ),
    {
      approvedCount: 1,
      pendingReviewCount: 2,
      reuploadCount: 1,
      openRequestCount: 2,
      totalRequestCount: 3,
    },
  );
});

test("reusable document filtering keeps only documents relevant to the request", () => {
  const documents = [
    {
      id: "doc-1",
      document: {
        document_category: "identity",
        document_type: "government_id",
      },
    },
    {
      id: "doc-2",
      document: {
        document_category: "financial",
        document_type: "proof_of_funds",
      },
    },
    {
      id: "doc-3",
      document: {
        document_category: "transactional",
        document_type: "transaction_document",
      },
    },
  ];

  assert.deepEqual(
    filterReusableDocumentsForRequest(documents, {
      title: "Source of funds evidence",
      requirement_codes: ["source_of_funds"],
    }).map((item) => item.id),
    ["doc-2"],
  );
});

test("reusable document filtering accepts top-level user-document payloads from the case-file API", () => {
  const documents = [
    {
      id: "doc-1",
      document_category: "address",
      document_type: "address_proof",
    },
    {
      id: "doc-2",
      document_category: "identity",
      document_type: "government_id",
    },
  ];

  assert.deepEqual(
    filterReusableDocumentsForRequest(documents, {
      title: "Proof of address",
      requirement_codes: ["address"],
    }).map((item) => item.id),
    ["doc-1"],
  );
});

test("request matching can infer the most likely case-file request from the uploaded filename", () => {
  const match = matchCaseFileRequestForFileName("alice-proof-of-funds-bank-statement.pdf", [
    {
      id: "request-1",
      title: "Proof of funds / MIP",
      requirement_codes: ["proof_of_funds", "mortgage_in_principle"],
    },
    {
      id: "request-2",
      title: "Passport copy",
      requirement_codes: ["identity_proof"],
    },
  ]);

  assert.equal(match.request?.id, "request-1");
  assert.equal(match.ambiguous, false);
});

test("request matching leaves the upload for manual review when multiple requests look equally likely", () => {
  const match = matchCaseFileRequestForFileName("supporting-document.pdf", [
    {
      id: "request-1",
      title: "Additional evidence",
      requirement_codes: ["custom_supporting_item"],
    },
    {
      id: "request-2",
      title: "Further supporting evidence",
      requirement_codes: ["supporting_document"],
    },
  ]);

  assert.equal(match.request, null);
  assert.equal(match.ambiguous, true);
});
