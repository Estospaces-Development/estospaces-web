import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { UserVirtualStoragePageContent } from "./page";

test("virtual storage page renders vault metrics, categories, and upload state", () => {
  const markup = renderToStaticMarkup(
    <MemoryRouter initialEntries={["/user/virtual-storage"]}>
      <UserVirtualStoragePageContent
        currentUser={{
          id: "user-virtual-storage-test",
          email: "vault-user@example.test",
          name: "Vault User",
          role: "user",
          isAuthenticated: true,
        }}
      />
    </MemoryRouter>,
  );

  assert.match(markup, /Virtual Storage/);
  assert.match(markup, /Identity/);
  assert.match(markup, /Address/);
  assert.match(markup, /Custom categories/);
  assert.match(markup, /30/);
});
