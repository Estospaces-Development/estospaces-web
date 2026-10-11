import test from "node:test";
import assert from "node:assert/strict";

import {
  getCaseFileLaneState,
  getCaseFileWaitingCopy,
} from "./caseFileWorkflow";

test("case-file waiting copy reflects missing uploads first", () => {
  const summary = {
    openRequestCount: 1,
    pendingReviewCount: 0,
    reuploadCount: 0,
  };

  assert.equal(
    getCaseFileLaneState(summary, [{ status: "requested" }]),
    "waiting_for_documents",
  );
  assert.deepEqual(getCaseFileWaitingCopy(summary, [{ status: "requested" }]), {
    waitingOn: "Waiting for documents",
    explanation:
      "There are still open checklist items that need a fresh upload or a reusable-file link.",
  });
});

test("case-file waiting copy prefers review and replacement states over generic open requests", () => {
  assert.equal(
    getCaseFileLaneState(
      {
        openRequestCount: 1,
        pendingReviewCount: 1,
        reuploadCount: 0,
      },
      [{ status: "uploaded" }],
    ),
    "waiting_for_manager_review",
  );

  assert.equal(
    getCaseFileLaneState(
      {
        openRequestCount: 1,
        pendingReviewCount: 0,
        reuploadCount: 1,
      },
      [{ status: "reupload_requested" }],
    ),
    "waiting_for_updated_document",
  );
});

test("case-file waiting copy reports ready when the request lane is clear", () => {
  const summary = {
    openRequestCount: 0,
    pendingReviewCount: 0,
    reuploadCount: 0,
  };

  assert.equal(
    getCaseFileLaneState(summary, [{ status: "approved" }]),
    "ready_for_next_step",
  );
  assert.deepEqual(getCaseFileWaitingCopy(summary, [{ status: "approved" }]), {
    waitingOn: "Ready for next workflow step",
    explanation:
      "The document lane is clear, so the manager can move the case into the next operational step.",
  });
});

// MB-0438 (web half): a completed case still read "Ready for next workflow step ... move the case into the next operational step".
test("a closed case says it is closed instead of pointing at a next workflow step", () => {
  const clear = { openRequestCount: 0, pendingReviewCount: 0, reuploadCount: 0 };
  const closedCopy = getCaseFileWaitingCopy(clear, [{ status: "approved" }], true);

  assert.equal(getCaseFileLaneState(clear, [{ status: "approved" }], true), "case_closed");
  assert.equal(closedCopy.waitingOn, "Case closed");
  assert.match(closedCopy.explanation, /no further/i);
  assert.doesNotMatch(closedCopy.explanation, /next operational step|next workflow step/);

  // Leftover open work on a closed case does not make it look like someone is still waiting.
  const openWork = { openRequestCount: 2, pendingReviewCount: 1, reuploadCount: 1 };
  assert.equal(getCaseFileWaitingCopy(openWork, [{ status: "requested" }], true).waitingOn, "Case closed");
});

test("an active case keeps its existing waiting copy", () => {
  const clear = { openRequestCount: 0, pendingReviewCount: 0, reuploadCount: 0 };

  assert.equal(getCaseFileWaitingCopy(clear, []).waitingOn, "Ready for next workflow step");
  assert.equal(getCaseFileWaitingCopy(clear, [], false).waitingOn, "Ready for next workflow step");
  assert.equal(
    getCaseFileWaitingCopy({ openRequestCount: 1, pendingReviewCount: 0, reuploadCount: 0 }, [{ status: "requested" }], false).waitingOn,
    "Waiting for documents",
  );
});
