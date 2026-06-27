import test from "node:test";
import assert from "node:assert/strict";

import { buildUserPropertyPortfolio } from "@/lib/userPropertyPortfolio";
import type { Application } from "@/services/applicationsService";
import type { SaleProgression } from "@/services/salesService";
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
