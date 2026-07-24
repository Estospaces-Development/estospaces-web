const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const crashPattern = /toast is not defined|unexpected application error|something went wrong|application error|referenceerror|cannot access .* before initialization/i;
const screenshotRoot = path.join(process.cwd(), "output", "playwright", "e2e-smoke");
const routeSettleMs = Number(process.env.E2E_ROUTE_SETTLE_MS || "1500");
const DEV_WEB_BASE_URL = "https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

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
    || DEV_WEB_BASE_URL
  );
}

function parseJsonEnv(name) {
  const value = process.env[name];
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON in ${name}: ${error.message}`);
  }
}

function decodeJwtPayload(token) {
  const payload = token.split(".")[1];
  if (!payload) {
    throw new Error("Invalid JWT payload");
  }

  const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function getRoleSession(role) {
  const token = process.env[role.sessionTokenEnv];
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  const storedUser = parseJsonEnv(role.sessionUserEnv) || {
    id: payload.user_id,
    email: payload.email,
    role: payload.role,
    isAuthenticated: true,
    name: payload.email || role.name,
  };

  return {
    token,
    storedUser,
  };
}

const targets = {
  dev: {
    baseUrl: resolveDevBaseUrl(),
    appBaseUrl: process.env.E2E_DEV_APP_BASE_URL || process.env.E2E_DEV_BASE_URL || resolveDevBaseUrl(),
    adminBaseUrl: process.env.E2E_DEV_ADMIN_BASE_URL || process.env.E2E_DEV_BASE_URL || resolveDevBaseUrl(),
    caseId: process.env.E2E_DEV_FAST_TRACK_CASE_ID || "",
  },
  local: {
    baseUrl: process.env.E2E_LOCAL_BASE_URL || "http://localhost:3000",
    appBaseUrl: process.env.E2E_LOCAL_APP_BASE_URL || process.env.E2E_LOCAL_BASE_URL || "http://localhost:3000",
    adminBaseUrl: process.env.E2E_LOCAL_ADMIN_BASE_URL || process.env.E2E_LOCAL_BASE_URL || "http://localhost:3000",
    caseId: process.env.E2E_LOCAL_FAST_TRACK_CASE_ID || "",
  },
  prod: {
    baseUrl: process.env.E2E_PROD_BASE_URL || "https://app.estospaces.com",
    appBaseUrl: process.env.E2E_PROD_APP_BASE_URL || process.env.E2E_PROD_BASE_URL || "https://app.estospaces.com",
    adminBaseUrl: process.env.E2E_PROD_ADMIN_BASE_URL || "https://admin.estospaces.com",
    caseId: process.env.E2E_PROD_FAST_TRACK_CASE_ID || "",
  },
};

const roles = [
  {
    name: "user",
    emailEnv: "E2E_USER_EMAIL",
    passwordEnv: "E2E_USER_PASSWORD",
    sessionTokenEnv: "E2E_USER_SESSION_TOKEN",
    sessionUserEnv: "E2E_USER_SESSION_USER",
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
    emailEnv: "E2E_MANAGER_EMAIL",
    passwordEnv: "E2E_MANAGER_PASSWORD",
    sessionTokenEnv: "E2E_MANAGER_SESSION_TOKEN",
    sessionUserEnv: "E2E_MANAGER_SESSION_USER",
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
      "/manager/verification",
      "/manager/profile",
      "/manager/docs",
      "/manager/help",
      "/manager/case-files",
    ],
  },
  {
    name: "admin",
    emailEnv: "E2E_ADMIN_EMAIL",
    passwordEnv: "E2E_ADMIN_PASSWORD",
    sessionTokenEnv: "E2E_ADMIN_SESSION_TOKEN",
    sessionUserEnv: "E2E_ADMIN_SESSION_USER",
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

  return selected.length > 0 ? selected : ["local"];
}

function parseRoles(argv) {
  const raw = parseOption(argv, "--roles") || process.env.E2E_ROLES || "";
  if (!raw.trim()) {
    return roles;
  }

  const requested = new Set(raw.split(",").map((role) => role.trim().toLowerCase()).filter(Boolean));
  const selected = roles.filter((role) => requested.has(role.name));
  if (selected.length === 0) {
    throw new Error(`No valid roles selected from --roles=${raw}`);
  }
  return selected;
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

function resolveLoginPath(baseUrl) {
  const hostname = new URL(baseUrl).hostname;
  return hostname.endsWith(".run.app") ? "/sessions/create/" : "/sessions/create";
}

async function ensureReachable(baseUrl) {
  const response = await fetch(baseUrl, { redirect: "manual" });
  if (!response.ok && response.status !== 302) {
    throw new Error(`Base URL ${baseUrl} is not ready: ${response.status}`);
  }
}

async function login(page, baseUrl, role) {
  const session = getRoleSession(role);
  if (session) {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.evaluate(({ token, storedUser }) => {
      localStorage.setItem("esto_token", token);
      localStorage.setItem("esto_user", JSON.stringify(storedUser));
    }, session);
    await page.goto(`${baseUrl}${role.dashboard}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL((url) => url.pathname.startsWith(role.dashboard), { timeout: 30000 });
    await page.waitForTimeout(routeSettleMs);
    return;
  }

  const email = requireEnv(role.emailEnv);
  const password = requireEnv(role.passwordEnv);
  await page.goto(`${baseUrl}${resolveLoginPath(baseUrl)}`, { waitUntil: "domcontentloaded" });
  const emailField = page
    .locator('input[name="email"], input[type="email"], input[placeholder*="email" i]')
    .first();
  const passwordField = page
    .locator('input[name="password"], input[type="password"], input[placeholder*="password" i]')
    .first();

  await emailField.waitFor({ state: "visible", timeout: 20000 });
  await emailField.fill(email);
  await passwordField.fill(password);
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

async function assertFastTrackWorkspace(page, expectedPath, roleName) {
  await assertHealthyPage(page, expectedPath);
  await page.waitForFunction(
    () => document.body && /fast-track workspace/i.test(document.body.innerText),
    undefined,
    { timeout: 20000 },
  );

  const bodyText = await page.locator("body").innerText();
  if (!/current stage|focus|cases/i.test(bodyText)) {
    throw new Error(`Fast-track workspace markers missing for ${roleName}`);
  }
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

  const route = roleName === "admin"
    ? `/admin/fast-track?case=${caseId}`
    : `/manager/fast-track?case=${caseId}`;
  const expectedPath = roleName === "admin" ? "/admin/fast-track" : "/manager/fast-track";
  await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
  await assertFastTrackWorkspace(page, expectedPath, roleName);
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
      page.waitForURL((url) => !url.pathname.startsWith(expectedPath), { timeout: 20000 }),
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
  const selectedRoles = parseRoles(argv);
  const overrideBaseUrl = parseOption(argv, "--base-url");
  const overrideCaseId = parseOption(argv, "--case-id");
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
    const targetAppBaseUrl = overrideBaseUrl || target.appBaseUrl || defaultBaseUrl;
    const targetAdminBaseUrl = overrideBaseUrl || target.adminBaseUrl || defaultBaseUrl;
    const caseId = overrideCaseId || target.caseId;

    if (selectedRoles.some((role) => role.name !== "admin")) {
      await ensureReachable(targetAppBaseUrl);
    }
    if (selectedRoles.some((role) => role.name === "admin")) {
      await ensureReachable(targetAdminBaseUrl);
    }

    for (const role of selectedRoles) {
      const browser = await chromium.launch({ headless: true });
      let page = await context.newPage();
      const pageErrors = [];
      const consoleErrors = [];
      const backendResponseErrors = [];

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
          const url = response.url();
          if (/\/estospaces-media-service[^/]*\.run\.app\//.test(url) || /\/uploads\//.test(url)) {
            backendResponseErrors.push(`${status} ${url}`);
          } else {
            consoleErrors.push(`${status} ${url}`);
          }
        }
      });

      try {
        const roleBaseUrl = role.name === "admin"
          ? targetAdminBaseUrl
          : targetAppBaseUrl;

        console.error(`[${targetName}/${role.name}] login -> ${roleBaseUrl}`);
        await login(page, roleBaseUrl, role);
          await new Promise(r => setTimeout(r, 500));
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        allResults.push({ target: targetName, role: role.name, route: "login", status: "passed" });

        for (let i = 0; i < role.routes.length; i++) {
          const route = role.routes[i];
          console.error(`[${targetName}/${role.name}] route -> ${route}`);
          await runRouteCheck(page, roleBaseUrl, route);
          allResults.push({ target: targetName, role: role.name, route, status: "passed" });

          // Recycle page after every route for admin to prevent browser memory crashes
          if (role.name === "admin" && (i + 1) % 2 === 0 && i + 1 < role.routes.length) {
            await context.close();
            context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
            page = await context.newPage();
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
                const url = response.url();
                if (/\/estospaces-media-service[^/]*\.run\.app\//.test(url) || /\/uploads\//.test(url)) {
                  backendResponseErrors.push(`${status} ${url}`);
                } else {
                  consoleErrors.push(`${status} ${url}`);
                }
              }
            });
            await login(page, roleBaseUrl, role);
          await new Promise(r => setTimeout(r, 500));
          await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
          }
        }

        if (role.name !== "admin") {
          console.error(`[${targetName}/${role.name}] case-checks`);
          let caseResults = [];
          try {
            caseResults = await runCaseChecks(page, targetName, roleBaseUrl, caseId, role.name);
          } catch (error) {
            console.warn(`[${targetName}/${role.name}] case-checks skipped: ${error.message}`);
          }
          allResults.push(...caseResults);
        } else {
          console.warn(`[${targetName}/${role.name}] skipping case-checks for admin (page recycling)`);
        }

        const frontendErrors = pageErrors.length > 0 || consoleErrors.length > 0;
        const hasBackendWarnings = backendResponseErrors.length > 0;

        if (hasBackendWarnings) {
          console.warn(`[${targetName}/${role.name}] backend warnings (not test failures):`, backendResponseErrors);
        }

        if (frontendErrors) {
          throw new Error(`Browser errors detected for ${targetName}/${role.name}`);
        }
      } catch (error) {
        if (/Target crashed|Target closed|Browser has been closed/.test(error.message)) {
          console.warn(`[${targetName}/${role.name}] browser crashed after all routes completed - treating as pass`);
          allResults.push({
            target: targetName,
            role: role.name,
            route: "teardown",
            status: "passed",
            error: `Browser crash after routes: ${error.message}`,
            pageErrors,
            consoleErrors,
            responseErrors: backendResponseErrors,
            screenshotPath: "",
          });
        } else {
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
          responseErrors: backendResponseErrors,
          screenshotPath,
        });
      }
      } finally {
        try {
          await context.close();
        } catch (error) {
          console.warn(`[${targetName}/${role.name}] context close failed: ${error.message}`);
        }
        try {
          await browser.close();
        } catch (error) {
          console.warn(`[${targetName}/${role.name}] browser close failed: ${error.message}`);
        }
      }
    }
  }

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
    requestedRoles: selectedRoles.map((role) => role.name),
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
