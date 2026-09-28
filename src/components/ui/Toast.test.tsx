import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import Toast from "./Toast";

test("toast announcements expose accessible live regions", () => {
  const errorMarkup = renderToStaticMarkup(
    <Toast
      id="error-toast"
      message="Unable to create the lead."
      type="error"
      isVisible
      onClose={() => {}}
    />,
  );

  assert.match(errorMarkup, /role="alert"/);
  assert.match(errorMarkup, /aria-live="assertive"/);
  assert.match(errorMarkup, /aria-atomic="true"/);

  const successMarkup = renderToStaticMarkup(
    <Toast
      id="success-toast"
      message="Lead created."
      type="success"
      isVisible
      onClose={() => {}}
    />,
  );

  assert.match(successMarkup, /role="status"/);
  assert.match(successMarkup, /aria-live="polite"/);
  assert.match(successMarkup, /bg-green-700/);
  assert.doesNotMatch(successMarkup, /text-white\/90/);
});

test("toast renders an optional in-app action link", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter>
      <Toast
        id="plan-limit-toast"
        title="Plan limit reached"
        message="You've reached your plan's limit of 2 published properties."
        type="error"
        action={{ label: "Upgrade your plan", href: "/manager/subscription" }}
        isVisible
        onClose={() => {}}
      />
    </MemoryRouter>,
  );

  assert.match(markup, new RegExp('<a[^>]+href="/manager/subscription"[^>]*>Upgrade your plan</a>'));

  const plainMarkup = renderToStaticMarkup(
    <Toast id="plain" message="Saved." type="success" isVisible onClose={() => {}} />,
  );
  assert.doesNotMatch(plainMarkup, new RegExp("<a "));
});
