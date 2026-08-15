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

  const facebook = new URL(targets.facebook);
  assert.equal(facebook.origin, "https://www.facebook.com");
  assert.equal(facebook.pathname, "/sharer/sharer.php");
  assert.equal(facebook.searchParams.get("u"), url);

  const twitter = new URL(targets.twitter);
  assert.equal(twitter.origin, "https://twitter.com");
  assert.equal(twitter.pathname, "/intent/tweet");
  assert.equal(twitter.searchParams.get("url"), url);
  assert.equal(
    twitter.searchParams.get("text"),
    "Chennai Beach Home - ₹1,20,00,000",
  );

  const linkedin = new URL(targets.linkedin);
  assert.equal(linkedin.origin, "https://www.linkedin.com");
  assert.equal(linkedin.pathname, "/sharing/share-offsite/");
  assert.equal(linkedin.searchParams.get("url"), url);

  const whatsapp = new URL(targets.whatsapp);
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(
    whatsapp.searchParams.get("text"),
    `Chennai Beach Home - ₹1,20,00,000\n${url}`,
  );

  const email = new URL(targets.email);
  assert.equal(email.protocol, "mailto:");
  assert.equal(
    email.searchParams.get("subject"),
    "Chennai Beach Home - Property Listing",
  );
  assert.equal(
    email.searchParams.get("body"),
    `View this property on Estospaces:\n\nChennai Beach Home - ₹1,20,00,000\n${url}`,
  );
});
