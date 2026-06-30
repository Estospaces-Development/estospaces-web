import test from "node:test";
import assert from "node:assert/strict";

import {
  getUserVerificationQueueStats,
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

test("user verification queue stats do not count missing documents as pending uploads", () => {
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
    unverified: 1,
    pendingDocs: 1,
    verified: 1,
  });
  assert.equal(userMatchesVerificationTab(needsUpload, "pending_docs"), false);
  assert.equal(userMatchesVerificationTab(pendingReview, "pending_docs"), true);
});
