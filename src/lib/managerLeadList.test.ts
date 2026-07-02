import test from "node:test";
import assert from "node:assert/strict";

import { isManagerLeadLiveProcessing, paginateManagerLeads, sortManagerLeads, summarizeManagerLeads } from "./managerLeadList";

test("manager lead sorting supports newest, client, budget, and score order", () => {
  const leads = [
    {
      id: "lead-low",
      name: "Zara Tenant",
      email: "zara@example.com",
      budget: "GBP 1,200/mo",
      score: 20,
      created_at: "2026-04-28T10:00:00Z",
    },
    {
      id: "lead-high",
      name: "Ada Buyer",
      email: "ada@example.com",
      budget: "GBP 4,800/mo",
      score: 95,
      created_at: "2026-04-29T10:00:00Z",
    },
  ];

  assert.deepEqual(sortManagerLeads(leads, "newest").map((lead) => lead.id), ["lead-high", "lead-low"]);
  assert.deepEqual(sortManagerLeads(leads, "client_az").map((lead) => lead.id), ["lead-high", "lead-low"]);
  assert.deepEqual(sortManagerLeads(leads, "budget_desc").map((lead) => lead.id), ["lead-high", "lead-low"]);
  assert.deepEqual(sortManagerLeads(leads, "score_desc").map((lead) => lead.id), ["lead-high", "lead-low"]);
});

test("manager lead pagination clamps requested pages and exposes total pages", () => {
  const leads = Array.from({ length: 23 }, (_, index) => ({ id: `lead-${index + 1}` }));

  const firstPage = paginateManagerLeads(leads, 1, 10);
  assert.equal(firstPage.currentPage, 1);
  assert.equal(firstPage.totalPages, 3);
  assert.deepEqual(firstPage.items.map((lead) => lead.id), [
    "lead-1",
    "lead-2",
    "lead-3",
    "lead-4",
    "lead-5",
    "lead-6",
    "lead-7",
    "lead-8",
    "lead-9",
    "lead-10",
  ]);

  const clampedPage = paginateManagerLeads(leads, 99, 10);
  assert.equal(clampedPage.currentPage, 3);
  assert.deepEqual(clampedPage.items.map((lead) => lead.id), ["lead-21", "lead-22", "lead-23"]);
});

test("manager lead summary counts document-stage leads as live matching work", () => {
  const now = Date.parse("2026-07-02T10:00:00Z");
  const leads = [
    {
      id: "lead-docs-requested",
      status: "broker_responded",
      documents_requested: true,
      created_at: "2026-07-02T09:00:00Z",
    },
    {
      id: "lead-under-review",
      status: "broker_responded",
      documents_uploaded: true,
      created_at: "2026-07-02T09:05:00Z",
    },
    {
      id: "lead-approved",
      status: "broker_responded",
      documents_verified: true,
      created_at: "2026-07-02T09:10:00Z",
    },
    {
      id: "lead-closed",
      status: "closed_lost",
      documents_requested: true,
      created_at: "2026-07-02T09:15:00Z",
    },
  ];

  assert.equal(isManagerLeadLiveProcessing(leads[0]), true);
  assert.equal(isManagerLeadLiveProcessing(leads[1]), true);
  assert.equal(isManagerLeadLiveProcessing(leads[2]), true);
  assert.equal(isManagerLeadLiveProcessing(leads[3]), false);

  assert.deepEqual(summarizeManagerLeads(leads, now), {
    total: 4,
    awaitingResponse: 3,
    documentsQueue: 3,
    viewingScheduled: 0,
    breached: 0,
  });
});

test("manager lead summary keeps breached pending leads visible in the breach card", () => {
  const now = Date.parse("2026-07-02T10:00:00Z");
  const leads = [
    {
      id: "lead-breached",
      status: "pending_broker_response",
      response_deadline_at: "2026-07-02T09:59:00Z",
      created_at: "2026-07-02T09:00:00Z",
    },
  ];

  assert.deepEqual(summarizeManagerLeads(leads, now), {
    total: 1,
    awaitingResponse: 1,
    documentsQueue: 0,
    viewingScheduled: 0,
    breached: 1,
  });
});
