const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const CORE_URL = process.env.CORE_URL || "http://localhost:8080";
const BOOKING_URL = process.env.BOOKING_URL || "http://localhost:8081";
const OUTPUT_PATH =
  process.env.OUTPUT_PATH ||
  "C:/Users/jeevi/Estospaces/esto-app-projects/estospaces-web/output/playwright/fast-track-redesign-proof-local.json";

const FAST_TRACK_ROUTE_BY_ROLE = {
  user: "/user/dashboard/fast-track",
  manager: "/manager/fast-track",
  admin: "/admin/fast-track",
};

const CREDENTIALS = {
  user: { email: requireEnv("E2E_USER_EMAIL"), password: requireEnv("E2E_USER_PASSWORD") },
  manager: { email: requireEnv("E2E_MANAGER_EMAIL"), password: requireEnv("E2E_MANAGER_PASSWORD") },
  admin: { email: requireEnv("E2E_ADMIN_EMAIL"), password: requireEnv("E2E_ADMIN_PASSWORD") },
};

const DEFAULT_PREFERENCES = {
  layout_mode: "balanced_compact",
  case_rail_collapsed: false,
  secondary_density: "compact",
  show_metrics_strip: true,
  visible_modules: [
    "core_files",
    "case_chat",
    "activity",
    "preview",
    "connected_records",
  ],
  module_order: [
    "core_files",
    "case_chat",
    "activity",
    "preview",
    "connected_records",
  ],
  default_active_module: "core_files",
};

async function parseJson(response, label) {
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned non-JSON: ${text}`);
  }

  if (!response.ok) {
    throw new Error(
      `${label} failed: ${payload?.message || payload?.error || text || response.status}`,
    );
  }

  return payload;
}

async function coreRequest(route, method, token, body, label) {
  const response = await fetch(`${CORE_URL}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return parseJson(response, label);
}

async function bookingRequest(route, method, token, body, label) {
  const response = await fetch(`${BOOKING_URL}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return parseJson(response, label);
}

function unwrapData(payload) {
  return payload?.data ?? payload;
}

async function login(email, password) {
  const payload = await coreRequest(
    "/api/v1/auth/login",
    "POST",
    null,
    { email, password },
    `login ${email}`,
  );
  const rawUser = payload?.data?.user ?? payload?.user;
  const token =
    payload?.data?.session?.access_token ??
    payload?.data?.access_token ??
    payload?.data?.token ??
    payload?.token;
  const fullName =
    [rawUser?.first_name, rawUser?.last_name]
      .filter(Boolean)
      .join(" ")
      .trim() || rawUser?.email || email;

  return {
    token,
    rawUser,
    storedUser: {
      id: String(rawUser?.id || ""),
      email: String(rawUser?.email || ""),
      name: fullName,
      role: String(rawUser?.role || "user"),
      isAuthenticated: true,
      first_name: rawUser?.first_name || undefined,
      last_name: rawUser?.last_name || undefined,
      avatar_url: rawUser?.avatar || rawUser?.avatar_url || undefined,
      avatar: rawUser?.avatar || rawUser?.avatar_url || undefined,
      user_metadata: {
        full_name: fullName,
      },
    },
  };
}

function normalizeCase(caseItem) {
  const normalized = unwrapData(caseItem);
  return {
    ...normalized,
    caseId: normalized?.caseId || normalized?.case_id || normalized?.id,
    propertyTitle:
      normalized?.propertyTitle ||
      normalized?.property_title ||
      "Fast-track case",
    finalStatus:
      normalized?.finalStatus ||
      normalized?.final_status ||
      normalized?.workspaceFinalStatus ||
      normalized?.workspace_final_status ||
      "active",
    submittedAt: normalized?.submittedAt || normalized?.submitted_at || null,
  };
}

async function listFastTrackCases(token) {
  const payload = await bookingRequest(
    "/api/v1/fast-track",
    "GET",
    token,
    null,
    "list fast-track cases",
  );
  const cases = Array.isArray(payload?.data)
    ? payload.data
    : payload?.data?.cases || [];
  return cases.map(normalizeCase);
}

function pickCase(cases, finalStatus) {
  const matching = cases.filter((caseItem) => caseItem.finalStatus === finalStatus);
  const sorted = [...(matching.length > 0 ? matching : cases)].sort((left, right) => {
    const leftTime = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
    const rightTime = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
    return rightTime - leftTime;
  });
  if (sorted.length === 0) {
    throw new Error(`No fast-track case found for status ${finalStatus}`);
  }
  return sorted[0];
}

async function resetWorkspacePreferences(token, role) {
  const payload = await coreRequest(
    `/api/v1/users/workspace-preferences/fast-track?role=${role}`,
    "PUT",
    token,
    DEFAULT_PREFERENCES,
    `reset workspace preferences ${role}`,
  );
  return unwrapData(payload);
}

async function getWorkspacePreferences(token, role) {
  const payload = await coreRequest(
    `/api/v1/users/workspace-preferences/fast-track?role=${role}`,
    "GET",
    token,
    null,
    `get workspace preferences ${role}`,
  );
  return unwrapData(payload);
}

async function waitForWorkspacePreferences(token, role, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastPreferences = null;
  while (Date.now() < deadline) {
    lastPreferences = await getWorkspacePreferences(token, role);
    if (predicate(lastPreferences)) {
      return lastPreferences;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Workspace preferences for ${role} did not reach expected state: ${JSON.stringify(lastPreferences)}`,
  );
}

async function newAuthedContext(browser, session, theme, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(({ token, storedUser, initialTheme }) => {
    localStorage.setItem("esto_token", token);
    localStorage.setItem("esto_user", JSON.stringify(storedUser));
    if (initialTheme) {
      localStorage.setItem("estospaces-theme", initialTheme);
    }
  }, {
    token: session.token,
    storedUser: session.storedUser,
    initialTheme: theme,
  });
  return context;
}

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
    if (!/localhost:3000|localhost:8080|localhost:8081|a\.run\.app/i.test(url)) {
      return;
    }
    result.networkErrors.push({ status: response.status(), url });
  });
}

async function gotoFastTrackWorkspace(page, role, caseId, section = "documents") {
  const params = new URLSearchParams({ case: caseId, section });
  await page.goto(`${BASE_URL}${FAST_TRACK_ROUTE_BY_ROLE[role]}?${params.toString()}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000,
  });
  await page.locator("[data-fast-track-header]").waitFor({ timeout: 120000 });
  await page.locator("[data-fast-track-masthead]").waitFor({ timeout: 120000 });
  await page.locator("[data-fast-track-stepper]").waitFor({ timeout: 120000 });
  await page.locator("[data-fast-track-utility-dock]").waitFor({ timeout: 120000 });
  await page.waitForTimeout(1200);
}

async function hasVisibleLocator(page, selector) {
  const locator = page.locator(selector);
  const count = await locator.count();
  if (count === 0) {
    return false;
  }
  return locator.first().isVisible();
}

async function getRailWidth(page) {
  const locator = page.locator("[data-fast-track-case-rail]").first();
  const box = await locator.boundingBox();
  return box ? Math.round(box.width) : null;
}

async function getElementWidth(page, selector) {
  const locator = page.locator(selector).first();
  const box = await locator.boundingBox();
  return box ? Math.round(box.width) : null;
}

async function getComputedPosition(locator) {
  return locator.evaluate((element) => window.getComputedStyle(element).position);
}

async function saveScreenshot(target, filePath) {
  await target.screenshot({ path: filePath, fullPage: true });
}

async function run() {
  const artifactDir = path.dirname(OUTPUT_PATH);
  fs.mkdirSync(artifactDir, { recursive: true });
  const screenshotDir = path.join(artifactDir, "screenshots");
  fs.mkdirSync(screenshotDir, { recursive: true });

  const result = {
    baseUrl: BASE_URL,
    coreUrl: CORE_URL,
    bookingUrl: BOOKING_URL,
    userDesktop: {},
    managerDesktop: {},
    adminDesktop: {},
    userTablet: {},
    dashboardCelebration: {},
    pageErrors: [],
    consoleErrors: [],
    networkErrors: [],
    overallOk: false,
  };

  const browser = await chromium.launch({ headless: true });

  try {
    const userSession = await login(CREDENTIALS.user.email, CREDENTIALS.user.password);
    const managerSession = await login(CREDENTIALS.manager.email, CREDENTIALS.manager.password);
    const adminSession = await login(CREDENTIALS.admin.email, CREDENTIALS.admin.password);

    await resetWorkspacePreferences(userSession.token, "user");
    await resetWorkspacePreferences(managerSession.token, "manager");
    await resetWorkspacePreferences(adminSession.token, "admin");

    const [userCases, managerCases, adminCases] = await Promise.all([
      listFastTrackCases(userSession.token),
      listFastTrackCases(managerSession.token),
      listFastTrackCases(adminSession.token),
    ]);

    const userActiveCase = pickCase(userCases, "active");
    const userCompletedCase = pickCase(userCases, "completed");
    const managerActiveCase = pickCase(managerCases, "active");
    const adminActiveCase = pickCase(adminCases, "active");

    const userContext = await newAuthedContext(
      browser,
      userSession,
      "light",
      { width: 1600, height: 980 },
    );
    const userPage = await userContext.newPage();
    attachDiagnostics(userPage, result);

    await gotoFastTrackWorkspace(userPage, "user", userActiveCase.caseId);
    const userInitialRailWidth = await getRailWidth(userPage);
    const userMastheadWidthBeforeCollapse = await getElementWidth(
      userPage,
      "[data-fast-track-masthead]",
    );
    const userMetricsInitiallyVisible = await hasVisibleLocator(
      userPage,
      "[data-fast-track-metrics-strip]",
    );
    const userStepperPosition = await getComputedPosition(
      userPage.locator("[data-fast-track-stepper]").first(),
    );

    await userPage.locator("[data-fast-track-toggle-rail]").click({ timeout: 10000 });
    await userPage.waitForTimeout(700);
    const userRailVisibleAfterCollapse = await hasVisibleLocator(
      userPage,
      "[data-fast-track-case-rail]",
    );
    const userMastheadWidthAfterCollapse = await getElementWidth(
      userPage,
      "[data-fast-track-masthead]",
    );
    await userPage.locator("[data-fast-track-toggle-rail]").click({ timeout: 10000 });
    await userPage.waitForTimeout(700);

    await userPage.locator("[data-fast-track-customize-open-inline]").click({ timeout: 10000 });
    await userPage.locator("[data-fast-track-customization-drawer]").waitFor({ timeout: 10000 });
    await userPage.locator("[data-fast-track-toggle='metrics-strip']").click({ timeout: 10000 });
    await userPage.locator("[data-fast-track-module-toggle='connected_records']").click({ timeout: 10000 });
    await userPage.locator("[data-fast-track-module-default='case_chat']").click({ timeout: 10000 });
    await userPage.locator("[data-fast-track-customization-done]").click({ timeout: 10000 });
    await userPage.locator("[data-fast-track-customization-drawer]").waitFor({
      state: "hidden",
      timeout: 10000,
    });

    const savedUserPreferences = await waitForWorkspacePreferences(
      userSession.token,
      "user",
      (preferences) =>
        preferences?.show_metrics_strip === false &&
        preferences?.default_active_module === "case_chat" &&
        Array.isArray(preferences?.visible_modules) &&
        !preferences.visible_modules.includes("connected_records"),
    );

    await userPage.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    await userPage.locator("[data-fast-track-header]").waitFor({ timeout: 120000 });
    await userPage.waitForTimeout(1200);

    const userMetricsAfterReload = await hasVisibleLocator(
      userPage,
      "[data-fast-track-metrics-strip]",
    );
    const userDefaultPanelAfterReload = await userPage
      .locator("[data-fast-track-utility-panel]")
      .first()
      .getAttribute("data-fast-track-utility-panel");
    const connectedRecordsTabVisible = await hasVisibleLocator(
      userPage,
      '[data-fast-track-utility-tab="connected_records"]',
    );

    const userDesktopScreenshot = path.join(
      screenshotDir,
      path.basename(OUTPUT_PATH, ".json") + "-user-desktop.png",
    );
    await saveScreenshot(userPage, userDesktopScreenshot);

    result.userDesktop = {
      caseId: userActiveCase.caseId,
      railWidth: userInitialRailWidth,
      mastheadWidthBeforeCollapse: userMastheadWidthBeforeCollapse,
      mastheadWidthAfterCollapse: userMastheadWidthAfterCollapse,
      contentExpandedOnCollapse:
        userRailVisibleAfterCollapse === false &&
        typeof userMastheadWidthBeforeCollapse === "number" &&
        typeof userMastheadWidthAfterCollapse === "number" &&
        userMastheadWidthAfterCollapse > userMastheadWidthBeforeCollapse + 120,
      metricsInitiallyVisible: userMetricsInitiallyVisible,
      metricsAfterReload: userMetricsAfterReload,
      stepperPosition: userStepperPosition,
      defaultPanelAfterReload: userDefaultPanelAfterReload,
      connectedRecordsHiddenAfterReload: connectedRecordsTabVisible === false,
      savedPreferences: savedUserPreferences,
      screenshot: userDesktopScreenshot,
    };

    await userContext.close();

    const managerContext = await newAuthedContext(
      browser,
      managerSession,
      "dark",
      { width: 1600, height: 980 },
    );
    const managerPage = await managerContext.newPage();
    attachDiagnostics(managerPage, result);
    await gotoFastTrackWorkspace(managerPage, "manager", managerActiveCase.caseId);

    const managerRailWidth = await getRailWidth(managerPage);
    const managerMastheadWidthBeforeCollapse = await getElementWidth(
      managerPage,
      "[data-fast-track-masthead]",
    );
    const managerMetricsVisible = await hasVisibleLocator(
      managerPage,
      "[data-fast-track-metrics-strip]",
    );
    await managerPage.locator("[data-fast-track-toggle-rail]").click({ timeout: 10000 });
    await managerPage.waitForTimeout(700);
    const managerRailVisibleAfterCollapse = await hasVisibleLocator(
      managerPage,
      "[data-fast-track-case-rail]",
    );
    const managerMastheadWidthAfterCollapse = await getElementWidth(
      managerPage,
      "[data-fast-track-masthead]",
    );
    await managerPage.locator("[data-fast-track-toggle-rail]").click({ timeout: 10000 });
    await managerPage.waitForTimeout(700);
    const managerPreferences = await getWorkspacePreferences(managerSession.token, "manager");

    const managerDesktopScreenshot = path.join(
      screenshotDir,
      path.basename(OUTPUT_PATH, ".json") + "-manager-desktop.png",
    );
    await saveScreenshot(managerPage, managerDesktopScreenshot);

    result.managerDesktop = {
      caseId: managerActiveCase.caseId,
      railWidth: managerRailWidth,
      mastheadWidthBeforeCollapse: managerMastheadWidthBeforeCollapse,
      mastheadWidthAfterCollapse: managerMastheadWidthAfterCollapse,
      contentExpandedOnCollapse:
        managerRailVisibleAfterCollapse === false &&
        typeof managerMastheadWidthBeforeCollapse === "number" &&
        typeof managerMastheadWidthAfterCollapse === "number" &&
        managerMastheadWidthAfterCollapse > managerMastheadWidthBeforeCollapse + 120,
      metricsVisible: managerMetricsVisible,
      preferences: managerPreferences,
      screenshot: managerDesktopScreenshot,
    };

    await managerContext.close();

    const adminContext = await newAuthedContext(
      browser,
      adminSession,
      "dark",
      { width: 1600, height: 980 },
    );
    const adminPage = await adminContext.newPage();
    attachDiagnostics(adminPage, result);
    await gotoFastTrackWorkspace(adminPage, "admin", adminActiveCase.caseId);

    const adminDesktopScreenshot = path.join(
      screenshotDir,
      path.basename(OUTPUT_PATH, ".json") + "-admin-desktop.png",
    );
    await saveScreenshot(adminPage, adminDesktopScreenshot);

    result.adminDesktop = {
      caseId: adminActiveCase.caseId,
      loaded: await hasVisibleLocator(adminPage, "[data-fast-track-masthead]"),
      screenshot: adminDesktopScreenshot,
    };

    await adminContext.close();

    const tabletContext = await newAuthedContext(
      browser,
      userSession,
      "light",
      { width: 900, height: 1180 },
    );
    const tabletPage = await tabletContext.newPage();
    attachDiagnostics(tabletPage, result);
    await gotoFastTrackWorkspace(tabletPage, "user", userActiveCase.caseId);

    await tabletPage.locator("[data-fast-track-toggle-rail]").click({ timeout: 10000 });
    await tabletPage.locator("[data-fast-track-case-rail]:visible").first().waitFor({ timeout: 10000 });

    const userTabletScreenshot = path.join(
      screenshotDir,
      path.basename(OUTPUT_PATH, ".json") + "-user-tablet.png",
    );
    await saveScreenshot(tabletPage, userTabletScreenshot);

    result.userTablet = {
      railDrawerOpened: await hasVisibleLocator(tabletPage, "[data-fast-track-case-rail]"),
      mastheadVisible: await hasVisibleLocator(tabletPage, "[data-fast-track-masthead]"),
      utilityDockVisible: await hasVisibleLocator(tabletPage, "[data-fast-track-utility-dock]"),
      screenshot: userTabletScreenshot,
    };

    await tabletContext.close();

    const dashboardContext = await newAuthedContext(
      browser,
      userSession,
      "light",
      { width: 1440, height: 960 },
    );
    const dashboardPage = await dashboardContext.newPage();
    attachDiagnostics(dashboardPage, result);

    await dashboardPage.goto(
      `${BASE_URL}/user/dashboard?celebrate=1&fastTrackCase=${userCompletedCase.caseId}`,
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    await dashboardPage.locator('[data-fast-track-celebration-overlay="true"]').waitFor({
      timeout: 15000,
    });
    await dashboardPage.waitForFunction(
      () => !window.location.search.includes("celebrate=1"),
      null,
      { timeout: 15000 },
    );

    const celebrationScreenshot = path.join(
      screenshotDir,
      path.basename(OUTPUT_PATH, ".json") + "-dashboard-celebration.png",
    );
    await saveScreenshot(dashboardPage, celebrationScreenshot);

    const revisitPage = await dashboardContext.newPage();
    attachDiagnostics(revisitPage, result);
    await revisitPage.goto(`${BASE_URL}/user/dashboard`, {
      waitUntil: "domcontentloaded",
      timeout: 120000,
    });
    await revisitPage.locator("#greeting-section").waitFor({ timeout: 120000 });
    await revisitPage.waitForTimeout(2500);

    const plainDashboardCelebrationVisible = await hasVisibleLocator(
      revisitPage,
      '[data-fast-track-celebration-overlay="true"]',
    );

    result.dashboardCelebration = {
      caseId: userCompletedCase.caseId,
      celebrateRouteOverlayVisible: true,
      celebrateQueryCleared:
        !(new URL(dashboardPage.url())).searchParams.has("celebrate"),
      plainDashboardCelebrationVisible,
      screenshot: celebrationScreenshot,
    };

    await dashboardContext.close();

    await Promise.all([
      resetWorkspacePreferences(userSession.token, "user"),
      resetWorkspacePreferences(managerSession.token, "manager"),
      resetWorkspacePreferences(adminSession.token, "admin"),
    ]);

    result.overallOk =
      typeof result.userDesktop.railWidth === "number" &&
      result.userDesktop.railWidth <= 360 &&
      result.userDesktop.contentExpandedOnCollapse === true &&
      result.userDesktop.metricsInitiallyVisible === true &&
      result.userDesktop.metricsAfterReload === false &&
      result.userDesktop.stepperPosition === "sticky" &&
      result.userDesktop.defaultPanelAfterReload === "case_chat" &&
      result.userDesktop.connectedRecordsHiddenAfterReload === true &&
      result.managerDesktop.metricsVisible === true &&
      result.managerDesktop.contentExpandedOnCollapse === true &&
      result.managerDesktop.preferences?.show_metrics_strip === true &&
      result.adminDesktop.loaded === true &&
      result.userTablet.railDrawerOpened === true &&
      result.userTablet.mastheadVisible === true &&
      result.userTablet.utilityDockVisible === true &&
      result.dashboardCelebration.celebrateRouteOverlayVisible === true &&
      result.dashboardCelebration.celebrateQueryCleared === true &&
      result.dashboardCelebration.plainDashboardCelebrationVisible === false &&
      result.pageErrors.length === 0 &&
      result.consoleErrors.length === 0 &&
      result.networkErrors.length === 0;
  } catch (error) {
    result.error = String(error);
  } finally {
    await browser.close();
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));

  if (!result.overallOk) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
