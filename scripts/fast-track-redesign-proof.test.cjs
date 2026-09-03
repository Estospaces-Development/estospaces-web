const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const proofSource = fs.readFileSync(
  path.join(__dirname, "fast-track-redesign-proof.cjs"),
  "utf8",
);
const helperSource = fs.readFileSync(
  path.join(__dirname, "platform-proof-browser-helpers.cjs"),
  "utf8",
);

test("stores the current session token and dismisses cookie consent", () => {
  assert.match(proofSource, /sessionStorage\.setItem\("esto_session_token", token\)/);
  assert.match(proofSource, /localStorage\.setItem\("estospaces_cookie_consent", "rejected"\)/);
  assert.doesNotMatch(proofSource, /localStorage\.setItem\("esto_token", token\)/);
});

test("selects only an exact final-status case", () => {
  assert.match(proofSource, /const sorted = \[\.\.\.matching\]\.sort/);
  assert.doesNotMatch(proofSource, /matching\.length > 0 \? matching : cases/);
  assert.match(
    proofSource,
    /pickCase\(managerCases, "active"\) \|\| pickCase\(managerCases, "completed"\)/,
  );
});

test("returns true after the Fast Track workspace is ready", () => {
  assert.match(helperSource, /await page\.waitForTimeout\(1200\);\s*return true;/);
});

test("uses the mobile details action instead of requiring an always-visible utility dock", () => {
  assert.match(proofSource, /detailsActionVisible: tabletDetailsActionVisible/);
  assert.doesNotMatch(proofSource, /result\.userTablet\.utilityDockVisible/);
});

test("skips celebration proof when no completed case exists", () => {
  assert.match(proofSource, /if \(userCompletedCase\)/);
  assert.match(proofSource, /reason: "no completed case available"/);
});

test("reports orphaned property references as a separate release gate", () => {
  assert.match(proofSource, /result\.dataIntegrityOk = result\.unavailablePropertyUrls\.length === 0/);
  assert.match(
    proofSource,
    /result\.functionalOk && result\.diagnosticsOk && result\.dataIntegrityOk/,
  );
});

test("marks a no-case proof as an explicit clean skip", () => {
  assert.match(
    proofSource,
    /result\.functionalOk = true;\s*result\.diagnosticsOk = true;\s*result\.dataIntegrityOk = true;\s*result\.overallOk = true;/,
  );
});
