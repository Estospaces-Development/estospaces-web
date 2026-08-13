import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPropertyShareTargets,
  getPublicPropertySharePath,
  isPropertyPubliclyShareable,
} from "./propertySharing";

test("manager shares resolve to the public signed-out property route", () => {
  assert.equal(
    getPublicPropertySharePath("property 123"),
    "/user/properties/property%20123",
  );
});

test("only public property states can be shared socially", () => {
  ["published", "available", "active", "online", "coming_soon"].forEach(
    (status) => assert.equal(isPropertyPubliclyShareable(status), true),
  );
  ["draft", "pending", "pending_approval", "rejected", "suspended"].forEach(
    (status) => assert.equal(isPropertyPubliclyShareable(status), false),
  );
});

test("social targets encode the public URL and listing copy", () => {
  const url = "https://app.estospaces.com/user/properties/home-1";
  const targets = buildPropertyShareTargets({
    title: "Chennai Beach Home",
    price: "₹1,20,00,000",
    url,
  });

  assert.match(targets.facebook, /facebook\.com\/sharer\/sharer\.php/);
  assert.match(targets.twitter, /twitter\.com\/intent\/tweet/);
  assert.match(targets.linkedin, /linkedin\.com\/sharing\/share-offsite/);
  assert.match(targets.whatsapp, /wa\.me/);
  assert.match(targets.email, /^mailto:/);
  Object.values(targets).forEach((target) => {
    assert.match(target, new RegExp(encodeURIComponent(url)));
    assert.doesNotMatch(target, /manager\/dashboard\/properties\/edit/);
  });
});
