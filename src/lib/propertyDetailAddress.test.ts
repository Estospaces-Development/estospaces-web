import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getPropertyDetailDisplayAddress } from "../pages/user/properties/[id]/page";

test("property detail address preserves UK city and postcode formatting", () => {
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
    country: "GB",
  } as any);

  assert.equal(address, "Attur, Edinburgh, SW1A 1AA");
  assert.doesNotMatch(address, /Chennai/i);
});

test("property detail wires the sanitized address into maps and contact sections", () => {
  const source = readFileSync(resolve(process.cwd(), "src/pages/user/properties/[id]/page.tsx"), "utf8");

  assert.match(source, /displayAddress:\s*propertyAddress\s*\|\|\s*locationLabel/);
  assert.match(source, /<PropertyContactInfo property=\{property as any\} propertyAddress=\{propertyAddress \|\| locationLabel\} \/>/);
});
