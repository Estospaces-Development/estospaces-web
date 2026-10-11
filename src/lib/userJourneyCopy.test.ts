import test from "node:test";
import assert from "node:assert/strict";
import { getBrokerRequestCopy, getJourneyChromeCopy } from "./userJourneyCopy";

test("user Fast Track route identifies itself as the dedicated workspace", () => {
  const copy = getJourneyChromeCopy("user");

  assert.equal(copy.headerTitle, "Fast-track workspace");
  assert.match(copy.headerSubtitle, /documents, viewing, decision, agreement, and handover/);
});

test("broker request copy uses India property-agent wording for PIN contexts", () => {
  const copy = getBrokerRequestCopy("rent", "IN");

  assert.equal(copy.requestFormAction, "Request nearest property agent");
  assert.equal(copy.nearbyBrokersEmpty, "Add a PIN code to see nearby property agents.");
});

test("broker request copy keeps UK letting-agency wording for rent contexts", () => {
  const copy = getBrokerRequestCopy("rent", "GB");

  assert.equal(copy.requestFormAction, "Request nearest letting agency");
  assert.equal(copy.nearbyBrokersEmpty, "Add a postcode to see nearby property agents.");
});

test("the Fast Track opt-out tick box never reuses the submit button's words (web-app#676)", () => {
  for (const [requestType, countryCode] of [
    ["rent", "GB"],
    ["rent", "IN"],
    ["buy", "GB"],
    ["buy", "IN"],
    ["sell", "IN"],
    [undefined, undefined],
  ] as const) {
    const copy = getBrokerRequestCopy(requestType, countryCode);

    assert.equal(copy.fastTrackOptInTitle, "Use the 24-hour home journey (Fast Track)");
    assert.notEqual(copy.fastTrackOptInTitle, copy.requestFormAction);
    assert.notEqual(copy.fastTrackOptInTitle, copy.requestFormActionAgain);
    assert.ok(copy.fastTrackOptInSubtitle.length > 0);
    assert.doesNotMatch(copy.fastTrackOptInSubtitle, /^Request /);
  }

  assert.equal(getBrokerRequestCopy("buy", "IN").requestFormAction, "Request nearest property agent");
});
