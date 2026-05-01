import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { UserDocumentsPageContent } from "./page";

test("user docs route renders the verification upload surface", () => {
  const markup = renderToStaticMarkup(
    <UserDocumentsPageContent
      currentUser={{
        id: "user-docs-test",
        email: "docs-user@example.test",
        name: "Docs User",
        role: "user",
        isAuthenticated: true,
      }}
    />,
  );

  assert.match(markup, /Account verification/);
  assert.match(markup, /Identity Document/);
  assert.match(markup, /Proof of Address/);
  assert.doesNotMatch(markup, /Guide to the current user dashboard/);
});
