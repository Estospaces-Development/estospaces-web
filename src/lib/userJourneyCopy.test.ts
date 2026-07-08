import test from "node:test";
import assert from "node:assert/strict";
import { getBrokerRequestCopy } from "./userJourneyCopy";

test("broker request copy uses India property-agent wording for PIN contexts", () => {
  const copy = getBrokerRequestCopy("rent", "IN");

  assert.equal(copy.requestFormAction, "Request nearest property agent");
  assert.equal(copy.useDispatchSubtitle, "We look for the nearest available property agent first.");
  assert.equal(copy.nearbyBrokersEmpty, "Add a PIN code to see nearby property agents.");
});

test("broker request copy keeps UK letting-agency wording for rent contexts", () => {
  const copy = getBrokerRequestCopy("rent", "GB");

  assert.equal(copy.requestFormAction, "Request nearest letting agency");
  assert.equal(copy.useDispatchSubtitle, "We look for the nearest available broker or letting agency first.");
  assert.equal(copy.nearbyBrokersEmpty, "Add a postcode to see nearby property agents.");
});
