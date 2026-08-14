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

async function gotoFastTrackWorkspace(page, baseUrl, role, caseId, section = "documents") {
  const params = new URLSearchParams({ case: caseId, section });
  await page.goto(`${baseUrl}${FAST_TRACK_ROUTE_BY_ROLE[role]}?${params.toString()}`, {
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

module.exports = {
  buildHealthCheckUrls,
  gotoFastTrackWorkspace,
};
