import test from "node:test";
import assert from "node:assert/strict";

import { getPropertyDetailDisplayAddress } from "../pages/user/properties/[id]/page";

test("property detail address matches dashboard card launch formatting", () => {
  const address = getPropertyDetailDisplayAddress({
    id: "property-address-1",
    title: "Launch rental",
    status: "published",
    listing_type: "rent",
    property_type: "apartment",
    price: 650000,
    currency: "INR",
    bedrooms: 2,
    bathrooms: 2,
    address_line_1: "Attur",
    city: "Edinburgh",
    postcode: "SW1A 1AA",
    country: "IN",
  } as any);

  assert.equal(address, "Attur, Chennai");
  assert.doesNotMatch(address, /SW1A|Edinburgh|United Kingdom|UK/i);
});
