import test from "node:test";
import assert from "node:assert/strict";

import {
  getUserVerificationQueueStats,
  getUserVerificationWorkflowStatus,
  getUserVerificationWorkflowStatusLabel,
  userMatchesVerificationTab,
} from "./userVerificationQueue";

const baseUser = {
  user_id: "user-1",
  email: "user@example.test",
  full_name: "Test User",
  verification_level: "basic" as const,
  has_identity_doc: false,
  has_address_doc: false,
  has_financial_doc: false,
  documents_uploaded: false,
  documents_verified: false,
  lead_count: 1,
  pending_leads: 1,
  created_at: "2026-04-29T00:00:00Z",
  last_active: "2026-04-29T00:00:00Z",
};

test("user verification queue stats use the shared admin verification vocabulary", () => {
  const needsUpload = { ...baseUser, user_id: "needs-upload" };
  const pendingReview = {
    ...baseUser,
    user_id: "pending-review",
    documents_uploaded: true,
  };
  const verified = {
    ...baseUser,
    user_id: "verified",
    verification_level: "verified" as const,
    has_identity_doc: true,
    has_address_doc: true,
    documents_uploaded: true,
    documents_verified: true,
  };

  assert.deepEqual(getUserVerificationQueueStats([needsUpload, pendingReview, verified]), {
    all: 3,
    pending: 1,
    inReview: 1,
    approved: 1,
  });
  assert.equal(getUserVerificationWorkflowStatusLabel(getUserVerificationWorkflowStatus(needsUpload)), "Pending");
  assert.equal(getUserVerificationWorkflowStatusLabel(getUserVerificationWorkflowStatus(pendingReview)), "In Review");
  assert.equal(getUserVerificationWorkflowStatusLabel(getUserVerificationWorkflowStatus(verified)), "Approved");
  assert.equal(userMatchesVerificationTab(needsUpload, "pending"), true);
  assert.equal(userMatchesVerificationTab(pendingReview, "pending"), false);
  assert.equal(userMatchesVerificationTab(pendingReview, "review"), true);
  assert.equal(userMatchesVerificationTab(verified, "approved"), true);
});

test("verification queue keeps uploaded documents in the in-review workflow state", () => {
  const pendingUsers = Array.from({ length: 6 }, (_, index) => ({
    ...baseUser,
    user_id: `pending-review-${index + 1}`,
    documents_uploaded: true,
  }));

  assert.deepEqual(getUserVerificationQueueStats(pendingUsers), {
    all: 6,
    pending: 0,
    inReview: 6,
    approved: 0,
  });
});
