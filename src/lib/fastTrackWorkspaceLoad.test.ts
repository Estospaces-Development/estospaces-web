import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFastTrackCasesSignature,
  loadFastTrackWorkspaceCases,
  sortFastTrackWorkspaceCases,
} from "./fastTrackWorkspaceLoad";

const fastTrackCase = (patch: Record<string, unknown> = {}) => ({
  caseId: "case-1",
  stage: "selected",
  workspaceFinalStatus: "active",
  hoursRemaining: 24,
  submittedAt: "2026-05-05T20:00:00Z",
  statusReason: "",
  nextAction: "",
  documents: {
    items: [],
  },
  viewing: {
    status: "pending",
  },
  decision: {
    status: "pending",
  },
  agreement: {
    status: "pending",
    paymentStatus: "not_requested",
  },
  handover: {
    status: "pending",
  },
  activity: [],
  ...patch,
} as any);

test("sortFastTrackWorkspaceCases keeps active cases before completed cases", () => {
  const sorted = sortFastTrackWorkspaceCases([
    fastTrackCase({
      caseId: "completed",
      workspaceFinalStatus: "completed",
      submittedAt: "2026-05-05T20:02:00Z",
    }),
    fastTrackCase({
      caseId: "active-sooner",
      hoursRemaining: 4,
      submittedAt: "2026-05-05T20:01:00Z",
    }),
    fastTrackCase({
      caseId: "active-later",
      hoursRemaining: 24,
      submittedAt: "2026-05-05T20:03:00Z",
    }),
  ]);

  assert.deepEqual(
    sorted.map((item) => item.caseId),
    ["active-sooner", "active-later", "completed"],
  );
});

test("loadFastTrackWorkspaceCases returns changed false for the same signature", async () => {
  const cases = [fastTrackCase()];
  const signature = buildFastTrackCasesSignature(cases);

  const result = await loadFastTrackWorkspaceCases(
    async () => ({ data: cases, error: null }),
    signature,
  );

  assert.equal(result.error, null);
  assert.equal(result.changed, false);
  assert.equal(result.signature, signature);
  assert.deepEqual(result.cases?.map((item) => item.caseId), ["case-1"]);
});

test("loadFastTrackWorkspaceCases turns malformed case processing into a load error", async () => {
  const result = await loadFastTrackWorkspaceCases(
    async () => ({
      data: [
        {
          caseId: "bad-case",
          workspaceFinalStatus: "active",
          documents: null,
        } as any,
      ],
      error: null,
    }),
    "",
  );

  assert.equal(result.cases, null);
  assert.match(result.error || "", /Unable to load fast-track cases/);
});

test("loadFastTrackWorkspaceCases preserves service errors", async () => {
  const result = await loadFastTrackWorkspaceCases(
    async () => ({ data: null, error: "booking unavailable" }),
    "previous",
  );

  assert.equal(result.cases, null);
  assert.equal(result.signature, "previous");
  assert.equal(result.error, "booking unavailable");
});
