import assert from "node:assert/strict";
import test from "node:test";

import { shouldResetPropertyPinForAddressChange } from "./managerPropertyPinReset";

const saved = { countryCode: "IN", postalCode: "560001" };

test("editing the city, street or other details keeps the saved pin", () => {
  assert.equal(shouldResetPropertyPinForAddressChange(saved, { ...saved }), false);
  assert.equal(shouldResetPropertyPinForAddressChange(saved, { countryCode: "in", postalCode: " 560 001 " }), false);
  assert.equal(
    shouldResetPropertyPinForAddressChange({ countryCode: "GB", postalCode: "SW1A 1AA" }, { countryCode: "GB", postalCode: "sw1a1aa" }),
    false,
  );
});

test("a new PIN code or country clears the pin so it is placed again", () => {
  assert.equal(shouldResetPropertyPinForAddressChange(saved, { ...saved, postalCode: "560066" }), true);
  assert.equal(shouldResetPropertyPinForAddressChange(saved, { countryCode: "GB", postalCode: "560001" }), true);
  assert.equal(shouldResetPropertyPinForAddressChange(saved, { ...saved, postalCode: "" }), true);
});
