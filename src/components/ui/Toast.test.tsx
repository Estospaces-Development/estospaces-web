import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

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
});
