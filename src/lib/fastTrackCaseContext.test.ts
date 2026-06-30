import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveExactFastTrackCase,
  sanitizeWorkspaceCaseId,
  stripCaseSearchParam,
} from "./fastTrackCaseContext";

test("sanitizeWorkspaceCaseId keeps a valid case id", () => {
  assert.deepEqual(sanitizeWorkspaceCaseId("case-1", ["case-1", "case-2"]), {
    caseId: "case-1",
    removedCaseId: null,
  });
});

test("sanitizeWorkspaceCaseId accepts copied case ids with casing and whitespace changes", () => {
  assert.deepEqual(sanitizeWorkspaceCaseId(" CASE-2 ", ["case-1", "case-2"]), {
    caseId: "case-2",
    removedCaseId: null,
  });
});

test("sanitizeWorkspaceCaseId strips a deleted case id", () => {
  assert.deepEqual(sanitizeWorkspaceCaseId("case-9", ["case-1", "case-2"]), {
    caseId: null,
    removedCaseId: "case-9",
  });
});

test("sanitizeWorkspaceCaseId strips malformed and overlong case ids", () => {
  assert.deepEqual(sanitizeWorkspaceCaseId("<script>alert(1)</script>", ["case-1"]), {
    caseId: null,
    removedCaseId: "<script>alert(1)</script>",
  });

  const overlongCaseId = "x".repeat(120);
  assert.deepEqual(sanitizeWorkspaceCaseId(overlongCaseId, ["case-1"]), {
    caseId: null,
    removedCaseId: overlongCaseId,
  });
});

test("stripCaseSearchParam only removes the case key", () => {
  const next = stripCaseSearchParam(
    new URLSearchParams("application=app-1&case=case-1&property=property-1"),
  );

  assert.equal(next.toString(), "application=app-1&property=property-1");
});

test("resolveExactFastTrackCase only matches explicitly known case ids", () => {
  const cases = [{ caseId: "case-1" }, { caseId: "case-2" }];

  assert.equal(
    resolveExactFastTrackCase(cases, "case-2", "case-9")?.caseId,
    "case-2",
  );
  assert.equal(resolveExactFastTrackCase(cases, "lead-1", "property-1"), null);
});
