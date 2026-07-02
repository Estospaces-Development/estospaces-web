import test from "node:test";
import assert from "node:assert/strict";

import { getPropertyContactAddress } from "@/components/dashboard/PropertyContactInfo";

test("property contact address prefers the sanitized property detail address", () => {
  const address = getPropertyContactAddress(
    {
      id: "property-address-1",
      address_line_1: "Attur",
      city: "Edinburgh",
      postcode: "SW1A 1AA",
    },
    "Attur, Chennai, 600001",
  );

  assert.equal(address, "Attur, Chennai, 600001");
  assert.doesNotMatch(address, /Edinburgh|SW1A/i);
});

test("property contact address falls back to raw fields when no override is supplied", () => {
  const address = getPropertyContactAddress({
    id: "property-address-2",
    address_line_1: "12 Local Street",
    city: "Chennai",
    postcode: "600001",
  });

  assert.equal(address, "12 Local Street, Chennai, 600001");
});
