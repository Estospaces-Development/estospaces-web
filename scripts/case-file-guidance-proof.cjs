const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ||
  "C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web/output/playwright/case-file-guidance-proof-local.json";

const LOGIN_URL = `${BASE_URL}/login?switch=true`;

const CASE_FILE_ROUTE_BY_ROLE = {
  user: "/user/dashboard/case-file",
  manager: "/manager/case-files",
};

const FAST_TRACK_ROUTE_BY_ROLE = {
  user: "/user/dashboard/fast-track",
  manager: "/manager/fast-track",
};

const CREDENTIALS = {
  user: { email: "user@gmail.com", password: "Estospaces@123" },
  manager: { email: "siranjeeviworks@gmail.com", password: "Estospaces@123" },
};

function attachDiagnostics(page, result) {
  page.on("pageerror", (error) => {
    result.pageErrors.push(String(error));
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      result.consoleErrors.push(msg.text());
    }
  });
  page.on("response", (response) => {
    if (response.status() < 400) {
      return;
    }
    const url = response.url();
    if (!/127\.0\.0\.1:3000|127\.0\.0\.1:8080|127\.0\.0\.1:8081|localhost:3000|localhost:8080|localhost:8081|a\.run\.app/i.test(url)) {
      return;
    }
    result.networkErrors.push({ status: response.status(), url });
  });
}

async function loginViaUi(page, credentials) {
  await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('input[name="email"]').fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForFunction(() => !window.location.pathname.includes("/login"), null, {
    timeout: 20000,
  });
}

async function resolveCaseIdFromFastTrack(page, role) {
  await page.goto(`${BASE_URL}${FAST_TRACK_ROUTE_BY_ROLE[role]}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  const cards = page.locator("[data-fast-track-case-card]");
  await cards.first().waitFor({ timeout: 20000 });
  const count = await cards.count();
  const caseIds = [];
  for (let index = 0; index < Math.min(count, 8); index += 1) {
    const caseId = await cards.nth(index).getAttribute("data-fast-track-case-card");
    if (caseId) {
      caseIds.push(caseId);
    }
  }
  if (caseIds.length === 0) {
    throw new Error(`Unable to resolve fast-track case ids for ${role}`);
  }
  return caseIds;
}

async function openAccessibleCaseFile(page, role, caseIds) {
  for (const caseId of caseIds) {
    const overviewUrl = `${BASE_URL}${CASE_FILE_ROUTE_BY_ROLE[role]}?case=${caseId}&tab=overview&section=overview`;
    await page.goto(overviewUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
    try {
      await page.locator("[data-case-file-live-workflow]").waitFor({ timeout: 6000 });
      return { caseId, overviewUrl };
    } catch {
      const unavailable = await page.getByText("Shared case file unavailable").count();
      if (unavailable > 0) {
        continue;
      }
    }
  }

  throw new Error(`Unable to load an accessible case file for ${role}`);
}

async function verifyRole(browser, role, result) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 980 } });
  const page = await context.newPage();
  attachDiagnostics(page, result);

  await loginViaUi(page, CREDENTIALS[role]);
  const caseIds = await resolveCaseIdFromFastTrack(page, role);
  const probePage = await context.newPage();
  const { caseId, overviewUrl } = await openAccessibleCaseFile(probePage, role, caseIds);
  await probePage.close();
  await page.goto(overviewUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator("[data-case-file-live-workflow]").waitFor({ timeout: 10000 });

  const hasBillingLink = (await page.locator('text="Open billing details"').count()) > 0;
  const hasPaymentLink = (await page.locator('text="Open payment details"').count()) > 0;
  const primaryLabel = String(
    (await page.locator("[data-case-file-live-workflow-primary]").textContent()) || "",
  ).trim();

  await page.locator("[data-case-file-live-workflow-primary]").click({ timeout: 10000 });
  await page.waitForURL((url) => url.pathname === FAST_TRACK_ROUTE_BY_ROLE[role], {
    timeout: 20000,
  });
  const primaryDestination = page.url();

  await page.goto(overviewUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.locator('[data-case-file-quick-link="Open document lane"]').click({ timeout: 10000 });
  await page.waitForURL((url) => {
    return (
      url.pathname === FAST_TRACK_ROUTE_BY_ROLE[role] &&
      url.searchParams.get("section") === "documents"
    );
  }, { timeout: 20000 });
  const documentsDestination = page.url();

  const screenshotDir = path.join(path.dirname(OUTPUT_PATH), "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });
  const screenshot = path.join(
    screenshotDir,
    `${path.basename(OUTPUT_PATH, ".json")}-${role}-case-file.png`,
  );
  await page.screenshot({ path: screenshot, fullPage: true });

  result.roles[role] = {
    caseId,
    primaryLabel,
    hasBillingLink,
    hasPaymentLink,
    primaryDestination,
    documentsDestination,
    screenshot,
  };

  await context.close();
}

async function main() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const result = {
    baseUrl: BASE_URL,
    roles: {},
    pageErrors: [],
    consoleErrors: [],
    networkErrors: [],
    overallOk: false,
  };

  const browser = await chromium.launch({ headless: true });
  try {
    await verifyRole(browser, "user", result);
    await verifyRole(browser, "manager", result);

    result.overallOk =
      Object.values(result.roles).every((item) => {
        return (
          item.primaryLabel === "Continue in fast-track" &&
          item.hasBillingLink === false &&
          item.hasPaymentLink === false &&
          item.primaryDestination.includes("/fast-track") &&
          item.documentsDestination.includes("section=documents")
        );
      }) &&
      result.pageErrors.length === 0 &&
      result.consoleErrors.length === 0 &&
      result.networkErrors.length === 0;
  } finally {
    await browser.close();
  }

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(
    OUTPUT_PATH,
    `${JSON.stringify(
      {
        baseUrl: BASE_URL,
        error: String(error && error.stack ? error.stack : error),
        overallOk: false,
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
});
