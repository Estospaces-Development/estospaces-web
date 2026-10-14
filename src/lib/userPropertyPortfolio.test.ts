import test from "node:test";
import assert from "node:assert/strict";

import {
  buildUserPropertyPortfolio,
  getPortfolioFooterStatusLabel,
  summarizeUserPropertyPortfolio,
} from "@/lib/userPropertyPortfolio";
import type { Application } from "@/services/applicationsService";
import type { SaleProgression } from "@/services/salesService";
import type { FastTrackCase } from "@/services/fastTrackService";
import type { Contract } from "@/types/booking";

const applications: Application[] = [
  {
    id: "rent-app-1",
    property_id: "property-rent-1",
    user_id: "user-1",
    property_title: "Canal Loft",
    property_address: "15 Canal Street",
    property_image: "https://example.com/rent.png",
    property_price: 2400,
    listing_type: "rent",
    move_in_date: "2026-05-01",
    status: "approved",
    created_at: "2026-04-01T09:00:00Z",
    updated_at: "2026-04-02T09:00:00Z",
  },
  {
    id: "sale-app-1",
    property_id: "property-sale-1",
    user_id: "user-1",
    fast_track_case_id: "case-sale-1",
    lead_id: "lead-sale-1",
    property_title: "Harbour Villa",
    property_address: "20 Harbour Road",
    property_image: "https://example.com/sale.png",
    property_price: 725000,
    listing_type: "sale",
    move_in_date: "2026-05-01",
    status: "completed",
    created_at: "2026-03-25T08:00:00Z",
    updated_at: "2026-04-04T08:00:00Z",
  },
];

const contracts: Contract[] = [
  {
    id: "contract-1",
    application_id: "rent-app-1",
    property_id: "property-rent-1",
    manager_id: "manager-1",
    user_id: "user-1",
    monthly_rent: 2400,
    status: "active",
    start_date: "2026-05-01",
    created_at: "2026-04-02T10:00:00Z",
    updated_at: "2026-04-03T10:00:00Z",
  },
];

const saleProgressions: SaleProgression[] = [
  {
    id: "sale-progression-1",
    property_id: "property-sale-1",
    user_id: "user-1",
    manager_id: "manager-1",
    lead_id: "lead-sale-1",
    fast_track_case_id: "case-sale-1",
    current_stage: "completion",
    status: "completed",
    completed_at: "2026-04-05T11:30:00Z",
    created_at: "2026-03-28T10:00:00Z",
    updated_at: "2026-04-05T11:30:00Z",
  },
];

test("buildUserPropertyPortfolio returns rented and bought homes with deep links", () => {
  const portfolio = buildUserPropertyPortfolio({
    contracts,
    applications,
    saleProgressions,
  });

  assert.equal(portfolio.length, 2);
  assert.equal(portfolio[0].ownershipLabel, "Bought");
  assert.equal(portfolio[0].statusLabel, "Purchase completed");
  assert.equal(
    portfolio[0].targetPath,
    "/user/applications?application=sale-app-1&progression=sale-progression-1&case=case-sale-1&lead=lead-sale-1&property=property-sale-1",
  );

  assert.equal(portfolio[1].ownershipLabel, "Rented");
  assert.equal(portfolio[1].statusLabel, "Rented");
  assert.equal(portfolio[1].priceLabel, "\u20b92,400/mo");
  assert.equal(
    portfolio[1].targetPath,
    "/user/dashboard/contracts?application=rent-app-1&contract=contract-1&property=property-rent-1",
  );
});

test("summarizeUserPropertyPortfolio counts every visible rental card", () => {
  const portfolio = buildUserPropertyPortfolio({
    contracts: [
      ...contracts,
      {
        ...contracts[0],
        id: "contract-in-progress",
        status: "pending_user_signature",
      },
    ],
    applications,
    saleProgressions,
  });

  assert.deepEqual(summarizeUserPropertyPortfolio(portfolio), {
    total: 3,
    bought: 1,
    rented: 2,
  });
});

test("buildUserPropertyPortfolio falls back to completed sale applications when no progression exists", () => {
  const portfolio = buildUserPropertyPortfolio({
    contracts: [],
    applications,
    saleProgressions: [],
  });

  assert.equal(portfolio.length, 1);
  assert.equal(portfolio[0].ownershipLabel, "Bought");
  assert.equal(portfolio[0].propertyTitle, "Harbour Villa");
});

test("active rented card says each status once: no repeated RENTED footer and no redundant active sentence (#712)", () => {
  const portfolio = buildUserPropertyPortfolio({ contracts, applications, saleProgressions });
  const rented = portfolio.find((item) => item.ownershipLabel === "Rented")!;

  assert.equal(rented.portfolioStatus, "Active");
  assert.equal(rented.statusSummary, "");
  assert.equal(getPortfolioFooterStatusLabel(rented), "");
  assert.equal(getPortfolioFooterStatusLabel({ ownershipLabel: "Rented", statusLabel: "Rent in progress" }), "Rent in progress");
  assert.equal(getPortfolioFooterStatusLabel({ ownershipLabel: "Bought", statusLabel: "Purchase completed" }), "Purchase completed");
});

test("a completed Fast Track rental is listed once, unless a contract already covers it", () => {
  const ftCase = (overrides: Record<string, unknown>) => ({
    caseId: "case-rent-2",
    propertyId: "property-rent-2",
    propertyTitle: "Garden Flat",
    applicationId: "rent-app-2",
    journeyMode: "rent",
    workspaceFinalStatus: "completed",
    handover: { completedAt: "2026-04-10T10:00:00Z" },
    ...overrides,
  }) as unknown as FastTrackCase;

  const listed = buildUserPropertyPortfolio({ contracts: [], applications: [], saleProgressions: [], fastTrackCases: [ftCase({})] });
  assert.equal(listed.length, 1);
  assert.equal(listed[0].statusLabel, "Rented through Fast Track");
  assert.equal(listed[0].ownershipLabel, "Rented");
  assert.equal(listed[0].targetPath, "/user/dashboard/fast-track?case=case-rent-2&property=property-rent-2");

  // The existing contract for property-rent-1 / rent-app-1 already lists that home.
  const covered = buildUserPropertyPortfolio({
    contracts,
    applications: applications.slice(0, 1),
    saleProgressions: [],
    fastTrackCases: [ftCase({ caseId: "case-rent-1", propertyId: "property-rent-1", applicationId: "rent-app-1" })],
  });
  assert.equal(covered.length, 1);
  assert.equal(covered[0].id, "rent:contract-1");

  for (const skipped of [{ workspaceFinalStatus: "active" }, { journeyMode: "sale" }]) {
    assert.equal(buildUserPropertyPortfolio({ contracts: [], applications: [], saleProgressions: [], fastTrackCases: [ftCase(skipped)] }).length, 0);
  }
});
