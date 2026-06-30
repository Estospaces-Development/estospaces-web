const assert = require("node:assert/strict");
const test = require("node:test");

const { selectCoreApiToken } = require("./fast-track-token.cjs");

test("selectCoreApiToken prefers Core API token over session access token", () => {
  const token = selectCoreApiToken({
    data: {
      token: "core-api-token",
      session: {
        access_token: "session-token",
      },
    },
  });

  assert.equal(token, "core-api-token");
});

test("selectCoreApiToken keeps legacy token fallbacks", () => {
  assert.equal(selectCoreApiToken({ token: "root-token" }), "root-token");
  assert.equal(selectCoreApiToken({ data: { access_token: "access-token" } }), "access-token");
  assert.equal(
    selectCoreApiToken({ data: { session: { access_token: "session-token" } } }),
    "session-token",
  );
});
