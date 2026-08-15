const FAST_TRACK_ROUTE_BY_ROLE = {
  user: "/user/dashboard/fast-track",
  manager: "/manager/fast-track",
  admin: "/admin/fast-track",
};

function buildHealthCheckUrls(target) {
  return [
    target.baseUrl,
    target.appBaseUrl,
    target.adminBaseUrl,
    `${target.adminBaseUrl}/login/`,
    `${target.services.core}/health`,
    `${target.services.booking}/health`,
    `${target.services.payment}/health`,
    `${target.services.notification}/health`,
    `${target.services.search}/health`,
    `${target.services.media}/health`,
    `${target.services.messaging}/health`,
  ];
}

function isExpectedUnavailablePropertyResponse(status, url) {
  if (status !== 404) {
    return false;
  }

  try {
    const pathname = new URL(url).pathname.replace(
      /^\/(?:__api|__dev_proxy)\/core(?=\/api\/v1\/)/,
      "",
    );
    return /^\/api\/v1\/properties\/catalog\/[^/]+$/.test(pathname);
  } catch {
    return false;
  }
}

function isExpectedUnavailablePropertyConsoleError(message, locationUrl) {
  return /Failed to load resource: the server responded with a status of 404/i.test(message)
    && isExpectedUnavailablePropertyResponse(404, locationUrl);
}

async function gotoWithRetry(page, url, options = {}, maxAttempts = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      const message = String(error?.message || error);
      const retryable = /Timeout \d+ms exceeded|ERR_QUIC_PROTOCOL_ERROR|net::ERR_/i.test(message);
      if (!retryable || attempt === maxAttempts - 1) {
        throw error;
      }
      await page.waitForTimeout(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

async function gotoFastTrackWorkspace(page, baseUrl, role, caseId, section = "documents") {
  const params = new URLSearchParams({ case: caseId, section });
  await gotoWithRetry(page, `${baseUrl}${FAST_TRACK_ROUTE_BY_ROLE[role]}?${params.toString()}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  const headerReady = await page
    .locator("[data-fast-track-header]")
    .waitFor({ timeout: 30000 })
    .then(() => true)
    .catch((error) => {
      const message = String(error?.message || error);
      if (/Timeout \d+ms exceeded/i.test(message)) {
        return false;
      }
      throw error;
    });
  if (!headerReady) {
    return false;
  }
  await page.locator("[data-fast-track-masthead]").waitFor({ timeout: 30000 });
  await page.locator("[data-fast-track-stepper]").waitFor({ timeout: 30000 });
  const utilityDock = page.locator("[data-fast-track-utility-dock]").first();
  if (role === "user" && !(await utilityDock.isVisible().catch(() => false))) {
    await openFastTrackUserDetails(page);
    await closeFastTrackUserDetails(page);
    await page.waitForTimeout(1200);
    return true;
  }
  if (!(await utilityDock.isVisible().catch(() => false))) {
    const disclosure = page.locator("details:has([data-fast-track-utility-dock]) > summary").first();
    if (await disclosure.isVisible().catch(() => false)) {
      await disclosure.click({ timeout: 10000 });
    }
  }
  await page.locator("[data-fast-track-utility-dock]").waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  return true;
}

async function openFastTrackUserDetails(page) {
  await page.getByRole("button", { name: /^See details$/ }).click({ timeout: 10000 });
  await page.locator("[data-fast-track-utility-dock]").first().waitFor({ timeout: 30000 });
}

async function closeFastTrackUserDetails(page) {
  await page.getByRole("button", { name: /^Close details$/ }).click({ timeout: 10000 });
  await page.locator("[data-fast-track-utility-dock]").first().waitFor({
    state: "detached",
    timeout: 10000,
  });
}

module.exports = {
  buildHealthCheckUrls,
  closeFastTrackUserDetails,
  gotoFastTrackWorkspace,
  gotoWithRetry,
  isExpectedUnavailablePropertyConsoleError,
  isExpectedUnavailablePropertyResponse,
  openFastTrackUserDetails,
};
