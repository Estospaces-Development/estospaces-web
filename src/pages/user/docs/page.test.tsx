import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { UserDocumentsPageContent } from "./page";

test("user docs route aliases the Virtual Storage experience", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/user/docs"]}>
      <UserDocumentsPageContent
        currentUser={{
          id: "user-docs-test",
          email: "docs-user@example.test",
          name: "Docs User",
          role: "user",
          isAuthenticated: true,
        }}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /Virtual Storage/);
  assert.match(markup, /Identity/);
  assert.match(markup, /Address/);
  assert.doesNotMatch(markup, /Guide to the current user dashboard/);
});
