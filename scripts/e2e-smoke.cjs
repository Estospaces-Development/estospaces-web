const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const crashPattern = /toast is not defined|unexpected application error|something went wrong|application error|referenceerror|cannot access .* before initialization/i;
const screenshotRoot = path.join(process.cwd(), "output", "playwright", "e2e-smoke");
const routeSettleMs = Number(process.env.E2E_ROUTE_SETTLE_MS || "1500");

function readFrontendUrlFromEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) {
    return "";
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const [key, ...valueParts] = line.split("=");
    if (key === "FRONTEND_URL") {
      return valueParts.join("=").trim();
    }
  }

  return "";
}

function resolveDevBaseUrl() {
  return (
    process.env.E2E_DEV_BASE_URL
    || readFrontendUrlFromEnvFile(".env.development")
    || readFrontendUrlFromEnvFile(".env.gcp-dev")
    || "http://localhost:4173"
  );
}

const targets = {
  dev: {
    baseUrl: resolveDevBaseUrl(),
    caseId: process.env.E2E_DEV_FAST_TRACK_CASE_ID || "",
  },
  local: {
    baseUrl: process.env.E2E_LOCAL_BASE_URL || "http://localhost:3000",
    caseId: process.env.E2E_LOCAL_FAST_TRACK_CASE_ID || "",
  },
};

const roles = [
  {
    name: "user",
    email: process.env.E2E_USER_EMAIL || "user@gmail.com",
    password: process.env.E2E_USER_PASSWORD || "Estospaces@123",
    dashboard: "/user/dashboard",
    routes: [
      "/user/dashboard",
      "/user/saved",
      "/user/applications",
      "/user/dashboard/viewings",
      "/user/dashboard/messages",
      "/user/dashboard/contracts",
      "/user/dashboard/profile",
      "/user/dashboard/settings",
      "/user/docs",
      "/user/dashboard/help",
      "/user/dashboard/fast-track",
    ],
  },
  {
    name: "manager",
    email: process.env.E2E_MANAGER_EMAIL || "siranjeeviworks@gmail.com",
    password: process.env.E2E_MANAGER_PASSWORD || "Estospaces@123",
    dashboard: "/manager/dashboard",
    routes: [
      "/manager/dashboard",
      "/manager/fast-track",
      "/manager/dashboard/properties",
      "/manager/leads",
      "/manager/user-verifications",
      "/manager/applications",
      "/manager/contracts",
      "/manager/appointments",
      "/manager/messages",
      "/manager/analytics",
      "/manager/billing",
      "/manager/verification",
      "/manager/profile",
      "/manager/docs",
      "/manager/help",
      "/manager/case-files",
    ],
  },
  {
    name: "admin",
    email: process.env.E2E_ADMIN_EMAIL || "admin@estospaces.com",
    password: process.env.E2E_ADMIN_PASSWORD || "admin123",
    dashboard: "/admin/dashboard",
    routes: [
      "/admin/dashboard",
      "/admin/analytics",
      "/admin/fast-track",
      "/admin/help",
      "/admin/notifications",
      "/admin/profile",
      "/admin/properties",
      "/admin/reviews",
      "/admin/settings",
      "/admin/users",
      "/admin/verifications",
    ],
  },
];

function parseTargets(argv) {
  const selected = [];

  argv.forEach((arg, index) => {
    if (arg === "--target" && argv[index + 1]) {
      selected.push(argv[index + 1]);
      return;
    }

    if (arg.startsWith("--target=")) {
      selected.push(arg.slice("--target=".length));
    }
  });

  return selected.length > 0 ? selected : ["dev"];
}

function parseOption(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === name && argv[index + 1]) {
      return argv[index + 1];
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1);
    }
  }
  return "";
}

async function ensureReachable(baseUrl) {
  const response = await fetch(baseUrl, { redirect: "manual" });
  if (!response.ok && response.status !== 302) {
    throw new Error(`Base URL ${baseUrl} is not ready: ${response.status}`);
  }
}

async function login(page, baseUrl, role) {
  await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
  const emailField = page
    .locator('input[name="email"], input[type="email"], input[placeholder*="email" i]')
    .first();
  const passwordField = page
    .locator('input[name="password"], input[type="password"], input[placeholder*="password" i]')
    .first();

  await emailField.waitFor({ state: "visible", timeout: 20000 });
  await emailField.fill(role.email);
  await passwordField.fill(role.password);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith(role.dashboard), { timeout: 30000 }),
    page.getByRole("button", { name: /^Sign In$/ }).click(),
  ]);
  await page.waitForTimeout(routeSettleMs);
}

async function assertHealthyPage(page, expectedPath) {
  const currentPath = new URL(page.url()).pathname;
  if (!currentPath.startsWith(expectedPath)) {
    throw new Error(`Redirected to ${page.url()}`);
  }

  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForFunction(
    () => document.body && document.body.innerText.trim().length >= 40,
    undefined,
    { timeout: 15000 },
  ).catch(() => {});

  const bodyText = await page.locator("body").innerText();
  if (crashPattern.test(bodyText)) {
    throw new Error(`Crash text detected on ${expectedPath}`);
  }
  if (bodyText.trim().length < 40) {
    throw new Error(`Page ${expectedPath} rendered too little content`);
  }
}

async function runRouteCheck(page, baseUrl, route) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await assertHealthyPage(page, route);
  await page.waitForTimeout(routeSettleMs);
}

async function runCaseChecks(page, targetName, baseUrl, caseId, roleName) {
  if (!caseId) {
    return [];
  }

  const results = [];

  if (roleName === "user") {
    const route = `/user/dashboard/fast-track?case=${caseId}`;
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await assertHealthyPage(page, "/user/dashboard/fast-track");
    results.push({
      target: targetName,
      role: roleName,
      route,
      status: "passed",
    });
    return results;
  }

  const route = `/manager/fast-track?case=${caseId}`;
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await assertHealthyPage(page, "/manager/fast-track");
  await page.getByRole("button", { name: /Open message thread/i }).waitFor({ state: "visible", timeout: 20000 });
  results.push({
    target: targetName,
    role: roleName,
    route,
    status: "passed",
  });

  const bodyText = await page.locator("body").innerText();
  const nextStageButton = page.locator("button").filter({ hasText: /Next stage/i }).first();
  const hasVisitedStage = /visited|viewing completed/i.test(bodyText);
  const nextStageCount = await nextStageButton.count();

  if (hasVisitedStage && nextStageCount > 0) {
    await nextStageButton.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL((url) => !url.pathname.startsWith("/manager/fast-track"), { timeout: 20000 }),
      nextStageButton.click(),
    ]);

    const nextPath = new URL(page.url()).pathname;
    if (!nextPath.startsWith("/manager/applications")) {
      throw new Error(`Visited next stage redirected to ${page.url()} instead of the applications workspace`);
    }

    await assertHealthyPage(page, "/manager/applications");
    results.push({
      target: targetName,
      role: roleName,
      route: `${route} -> next-stage`,
      status: "passed",
    });
  }

  return results;
}

async function main() {
  const argv = process.argv.slice(2);
  const requestedTargets = parseTargets(argv);
  const overrideBaseUrl = parseOption(argv, "--base-url");
  const overrideCaseId = parseOption(argv, "--case-id");
  const browser = await chromium.launch({ headless: true });
  const allResults = [];
  const summary = {
    passed: 0,
    failed: 0,
  };

  fs.mkdirSync(screenshotRoot, { recursive: true });

  for (const targetName of requestedTargets) {
    const target = targets[targetName];
    if (!target) {
      throw new Error(`Unknown target: ${targetName}`);
    }

    const defaultBaseUrl = overrideBaseUrl || target.baseUrl;
    const caseId = overrideCaseId || target.caseId;

    await ensureReachable(target.appBaseUrl || defaultBaseUrl);
    await ensureReachable(target.adminBaseUrl || defaultBaseUrl);

    for (const role of roles) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
      const page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const responseErrors = [];

      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") {
          const text = message.text();
          if (!/^Failed to load resource:/i.test(text)) {
            consoleErrors.push(text);
          }
        }
      });
      page.on("response", (response) => {
        const status = response.status();
        if (status === 429 || status >= 500) {
          responseErrors.push(`${status} ${response.url()}`);
        }
      });

      try {
        const roleBaseUrl = role.name === "admin"
          ? (target.adminBaseUrl || defaultBaseUrl)
          : (target.appBaseUrl || defaultBaseUrl);

        console.error(`[${targetName}/${role.name}] login -> ${roleBaseUrl}`);
        await login(page, roleBaseUrl, role);
        allResults.push({ target: targetName, role: role.name, route: "login", status: "passed" });

        for (const route of role.routes) {
          console.error(`[${targetName}/${role.name}] route -> ${route}`);
          await runRouteCheck(page, roleBaseUrl, route);
          allResults.push({ target: targetName, role: role.name, route, status: "passed" });
        }

        console.error(`[${targetName}/${role.name}] case-checks`);
        const caseResults = await runCaseChecks(page, targetName, roleBaseUrl, caseId, role.name);
        allResults.push(...caseResults);

        if (pageErrors.length > 0 || consoleErrors.length > 0 || responseErrors.length > 0) {
          throw new Error(`Browser errors detected for ${targetName}/${role.name}`);
        }
      } catch (error) {
        const screenshotPath = path.join(
          screenshotRoot,
          `${targetName}-${role.name}-${Date.now()}.png`,
        );
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        allResults.push({
          target: targetName,
          role: role.name,
          route: "failure",
          status: "failed",
          error: error.message,
          pageErrors,
          consoleErrors,
          responseErrors,
          screenshotPath,
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();

  for (const result of allResults) {
    if (result.status === "passed") {
      summary.passed += 1;
    } else {
      summary.failed += 1;
    }
  }

  const report = {
    ranAt: new Date().toISOString(),
    requestedTargets,
    summary,
    results: allResults,
  };

  console.log(JSON.stringify(report, null, 2));

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
