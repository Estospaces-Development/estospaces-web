import test from "node:test";
import assert from "node:assert/strict";

import {
  filterVisibleManagerLeads,
  getManagerLeadOperationalState,
  isManagerLeadBreached,
  isActiveManagerLeadWorkspaceCase,
  isInternalAutomationManagerLead,
  isManagerLeadLiveProcessing,
  paginateManagerLeads,
  resolveManagerLeadWorkspaceCase,
  shouldShowManagerLeadWorkspaceMissingNotice,
  sortManagerLeads,
  summarizeManagerLeads,
} from "./managerLeadList";

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

test("breached active manager leads require escalation instead of normal awaiting copy", () => {
  const now = Date.parse("2026-07-02T10:00:00Z");
  const breachedLead = {
    id: "lead-breached-docs",
    status: "pending_broker_response",
    documents_uploaded: true,
    sla_status: "breach",
    created_at: "2026-07-02T09:00:00Z",
  };

  const state = getManagerLeadOperationalState(breachedLead, now, "Awaiting response");

  assert.equal(isManagerLeadBreached(breachedLead, now), true);
  assert.equal(state.isBreached, true);
  assert.equal(state.requiresEscalation, true);
  assert.equal(state.statusLabel, "Escalation required");
  assert.equal(state.showResponseCountdown, false);
});

test("closed breached manager leads do not keep an escalation action", () => {
  const now = Date.parse("2026-07-02T10:00:00Z");
  const closedLead = {
    id: "lead-closed-breached",
    status: "closed_lost",
    stage: "rejected",
    sla_status: "breach",
    created_at: "2026-07-02T09:00:00Z",
  };

  const state = getManagerLeadOperationalState(closedLead, now, "Lost");

  assert.equal(state.isBreached, true);
  assert.equal(state.requiresEscalation, false);
  assert.equal(state.statusLabel, "Lost");
});

test("manager lead list hides internal QA titles and raw automation identifiers", () => {
  const leads = [
    {
      id: "real-lead",
      status: "broker_responded",
      created_at: "2026-07-02T09:00:00Z",
      property: {
        title: "Two-bedroom apartment in Chennai",
      },
    },
    {
      id: "qa-lead",
      status: "broker_responded",
      created_at: "2026-07-02T09:01:00Z",
      property: {
        title: "QA Manual FT E2E 2026-06-25T18-30-15-991Z",
      },
    },
    {
      id: "mobile-live-lead",
      status: "broker_responded",
      created_at: "2026-07-02T09:02:00Z",
      propertyInterested: "Mobile Live Approval mobile-live-1781788492687917",
    },
    {
      id: "raw-timestamp-lead",
      status: "pending_broker_response",
      created_at: "2026-07-02T09:03:00Z",
      property_name: "QA Admin Notice Dashboard Search 20260702001933",
    },
  ];

  assert.equal(isInternalAutomationManagerLead(leads[0]), false);
  assert.equal(isInternalAutomationManagerLead(leads[1]), true);
  assert.equal(isInternalAutomationManagerLead(leads[2]), true);
  assert.equal(isInternalAutomationManagerLead(leads[3]), true);
  assert.deepEqual(filterVisibleManagerLeads(leads).map((lead) => lead.id), ["real-lead"]);
});

test("manager lead workspace links require an active case matched to the lead", () => {
  const lead = {
    id: "lead-active",
    property_id: "property-1",
    status: "broker_responded",
    documents_requested: true,
    created_at: "2026-07-02T09:00:00Z",
  };
  const cases = [
    {
      id: "property-only-case",
      caseId: "case-property-only",
      propertyId: "property-1",
      workspaceFinalStatus: "active",
      finalStatus: "in_progress",
    },
    {
      id: "cancelled-case",
      caseId: "case-cancelled",
      leadId: "lead-active",
      propertyId: "property-1",
      workspaceFinalStatus: "cancelled",
      finalStatus: "rejected",
    },
    {
      id: "active-case",
      caseId: "case-active",
      leadId: "lead-active",
      propertyId: "property-1",
      workspaceFinalStatus: "active",
      finalStatus: "in_progress",
    },
  ];

  assert.equal(isActiveManagerLeadWorkspaceCase(cases[0]), true);
  assert.equal(isActiveManagerLeadWorkspaceCase(cases[1]), false);
  assert.equal(resolveManagerLeadWorkspaceCase(lead, cases)?.caseId, "case-active");
  assert.equal(resolveManagerLeadWorkspaceCase(lead, cases.slice(0, 2)), null);
});

test("manager lead card explains missing live workspace instead of exposing stale navigation", () => {
  const lead = {
    id: "lead-without-case",
    status: "broker_responded",
    documents_uploaded: true,
    created_at: "2026-07-02T09:00:00Z",
  };

  assert.equal(shouldShowManagerLeadWorkspaceMissingNotice(lead, false), true);
  assert.equal(shouldShowManagerLeadWorkspaceMissingNotice(lead, true), false);
});
