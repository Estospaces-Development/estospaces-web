const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  createAuthedContext,
  isIgnorableConsoleError,
  loginViaApi,
  resolveTarget,
} = require('./platform-proof-shared.cjs');

const argv = process.argv.slice(2);
const serviceTarget = resolveTarget(argv);
const baseUrl = process.env.MOBILE_AUDIT_BASE_URL || serviceTarget.appBaseUrl;
const settleMs = Number(process.env.MOBILE_AUDIT_SETTLE_MS || '900');
const auditViewport = {
  width: Number(process.env.MOBILE_AUDIT_VIEWPORT_WIDTH || '390'),
  height: Number(process.env.MOBILE_AUDIT_VIEWPORT_HEIGHT || '844'),
};
const auditSuffix = auditViewport.width === 390 && auditViewport.height === 844
  ? ''
  : `-${auditViewport.width}x${auditViewport.height}`;
const outputRoot = path.join(process.cwd(), 'output', 'playwright', `mobile-responsive-audit${auditSuffix}`);

const routes = {
  user: [
    '/user/dashboard',
    '/user/dashboard/bookings',
    '/user/dashboard/discover',
    '/user/dashboard/saved',
    '/user/dashboard/applications',
    '/user/dashboard/viewings',
    '/user/dashboard/contracts',
    '/user/dashboard/case-file',
    '/user/dashboard/docs',
    '/user/dashboard/fast-track',
    '/user/dashboard/messages',
    '/user/dashboard/notifications',
    '/user/dashboard/overseas',
    '/user/dashboard/profile',
    '/user/dashboard/reviews',
    '/user/dashboard/settings',
    '/user/dashboard/virtual-storage',
    '/user/dashboard/help',
  ],
  manager: [
    '/manager/dashboard',
    '/manager/fast-track',
    '/manager/dashboard/properties',
    '/manager/dashboard/properties/add',
    '/manager/leads',
    '/manager/clients',
    '/manager/applications',
    '/manager/appointments',
    '/manager/case-files',
    '/manager/contracts',
    '/manager/community',
    '/manager/docs',
    '/manager/help',
    '/manager/messages',
    '/manager/notifications',
    '/manager/profile',
    '/manager/user-verifications',
    '/manager/verification',
    '/manager/analytics',
  ],
  admin: [
    '/admin/dashboard',
    '/admin/analytics',
    '/admin/chat',
    '/admin/community',
    '/admin/fast-track',
    '/admin/help',
    '/admin/notifications',
    '/admin/profile',
    '/admin/properties',
    '/admin/research',
    '/admin/reviews',
    '/admin/settings',
    '/admin/users',
    '/admin/verifications',
  ],
};

const representativeRoutes = new Set([
  '/user/dashboard',
  '/user/dashboard/applications',
  '/manager/dashboard',
  '/manager/analytics',
  '/admin/dashboard',
  '/admin/users',
]);

const crashPattern = /unexpected application error|something went wrong|application error|referenceerror|cannot access .* before initialization/i;
const safeName = (value) => value.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/g, '');
const optionalCompatibilityPaths = new Set([
  '/api/v1/admin/research/summary',
  '/api/v1/admin/research/sessions',
  '/__dev_proxy/core/api/v1/admin/research/summary',
  '/__dev_proxy/core/api/v1/admin/research/sessions',
]);

const staleCatalogPathPattern = /^(?:\/__dev_proxy\/core)?\/api\/v1\/properties\/catalog\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isExpectedFallbackResponse(response, url) {
  if (response.status() !== 404) return false;
  if (optionalCompatibilityPaths.has(url.pathname)) return true;
  if (response.request().method() === 'GET' && staleCatalogPathPattern.test(url.pathname)) return true;
  return url.pathname.startsWith('/__dev_proxy/media/uploads/')
    && ['image', 'media'].includes(response.request().resourceType());
}

async function inspectMobilePage(page, role, route) {
  const pageErrors = [];
  const consoleErrors = [];
  const responseErrors = [];
  const onPageError = (error) => pageErrors.push(error.message);
  const onConsole = (message) => {
    const text = message.text();
    if (
      message.type() === 'error'
      && !/^Failed to load resource:/i.test(text)
      && !isIgnorableConsoleError(text)
    ) {
      consoleErrors.push(text);
    }
  };
  const onResponse = (response) => {
    const status = response.status();
    if (status < 400) return;
    const url = new URL(response.url());
    if (isExpectedFallbackResponse(response, url)) return;
    const isApiRequest = url.pathname.startsWith('/__api/') || url.pathname.startsWith('/api/');
    const isFrontendRequest = url.origin === new URL(baseUrl).origin;
    if (status >= 500 || isApiRequest || isFrontendRequest) {
      responseErrors.push(`${status} ${url.origin}${url.pathname}`);
    }
  };
  page.on('pageerror', onPageError);
  page.on('console', onConsole);
  page.on('response', onResponse);

  try {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(settleMs);
    await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {});

    const result = await page.evaluate(({ expectedRole, crashSource }) => {
      const viewportWidth = window.innerWidth;
      const isVisible = (element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0;
      };
      const describe = (element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          text: String(element.getAttribute('aria-label') || element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
          className: String(element.className || '').slice(0, 180),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };

      const hasIntentionalHorizontalContainer = (element) => {
        let current = element.parentElement;
        while (current && current !== document.body && current !== document.documentElement) {
          const style = window.getComputedStyle(current);
          const locallyScrollable = (style.overflowX === 'auto' || style.overflowX === 'scroll')
            && current.scrollWidth > current.clientWidth + 2;
          if (locallyScrollable) return true;
          current = current.parentElement;
        }
        return false;
      };

      const isDecorativeOverflow = (element) => {
        let current = element;
        while (current && current !== document.body && current !== document.documentElement) {
          const style = window.getComputedStyle(current);
          const isPositioned = style.position === 'absolute' || style.position === 'fixed';
          const isVisualOnly = style.pointerEvents === 'none'
            || Number(style.opacity) <= 0.1
            || String(current.className || '').includes('blur-[');
          if (isPositioned && isVisualOnly) return true;
          current = current.parentElement;
        }
        return false;
      };

      const overflowElements = Array.from(document.body.querySelectorAll('*'))
        .filter((element) => {
          if (!isVisible(element)) return false;
          if (element.closest('.leaflet-container')) return false;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          if (style.position === 'fixed' && rect.width <= viewportWidth + 2) return false;
          if (hasIntentionalHorizontalContainer(element) || isDecorativeOverflow(element)) return false;
          return rect.right > viewportWidth + 2 || rect.left < -2;
        })
        .slice(0, 12)
        .map(describe);

      const smallTargets = Array.from(document.querySelectorAll('button, [role="button"], nav a'))
        .filter((element) => {
          if (!isVisible(element)) return false;
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          const isSwitch = element.getAttribute('role') === 'switch'
            || /\b(h-6|h-7)\b/.test(String(element.className || ''));
          const isMapControl = Boolean(element.closest('.leaflet-control-container'));
          if (isSwitch || isMapControl || style.pointerEvents === 'none') return false;
          return rect.width < 43.5 || rect.height < 43.5;
        })
        .slice(0, 12)
        .map(describe);

      const bodyText = document.body.innerText || '';
      const roleNavigation = expectedRole === 'user'
        ? document.querySelector('nav[aria-label="Main navigation"]')
        : document.querySelector(`[data-mobile-role-navigation="${expectedRole}"]`);
      const clippedNavigationLabels = roleNavigation
        ? Array.from(roleNavigation.querySelectorAll('a span, button span'))
          .filter((element) => isVisible(element) && element.scrollWidth > element.clientWidth + 1)
          .map(describe)
          .slice(0, 8)
        : [];
      const brokenImages = Array.from(document.images)
        .filter((image) => isVisible(image) && image.complete && image.naturalWidth === 0)
        .map(describe)
        .slice(0, 8);

      return {
        viewportWidth,
        documentWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        overflowElements,
        smallTargets,
        bodyLength: bodyText.trim().length,
        crashText: new RegExp(crashSource, 'i').test(bodyText),
        mobileNavigationVisible: Boolean(roleNavigation && isVisible(roleNavigation)),
        clippedNavigationLabels,
        brokenImages,
        workspaceRole: document.querySelector('[data-workspace-role]')?.getAttribute('data-workspace-role') || '',
      };
    }, { expectedRole: role, crashSource: crashPattern.source });

    const finalPath = new URL(page.url()).pathname;
    const redirectedToLogin = finalPath.startsWith('/login');
    const failures = [];
    if (redirectedToLogin) failures.push('redirected to login');
    if (result.workspaceRole !== role) failures.push(`workspace role is ${result.workspaceRole || 'missing'}`);
    if (result.documentWidth > result.viewportWidth + 2) failures.push(`document overflows by ${result.documentWidth - result.viewportWidth}px`);
    if (result.overflowElements.length > 0) failures.push(`${result.overflowElements.length} visible elements cross viewport edges`);
    if (result.smallTargets.length > 0) failures.push(`${result.smallTargets.length} touch targets are below 44px`);
    if (!result.mobileNavigationVisible) failures.push('mobile role navigation is not visible');
    if (result.clippedNavigationLabels.length > 0) failures.push(`${result.clippedNavigationLabels.length} mobile navigation labels are clipped`);
    if (result.brokenImages.length > 0) failures.push(`${result.brokenImages.length} visible images failed to load`);
    if (result.bodyLength < 30) failures.push('page rendered too little content');
    if (result.crashText) failures.push('crash text is visible');
    if (pageErrors.length > 0) failures.push(`${pageErrors.length} page errors`);
    if (consoleErrors.length > 0) failures.push(`${consoleErrors.length} console errors`);
    if (responseErrors.length > 0) failures.push(`${responseErrors.length} failed application requests`);

    const status = failures.length === 0 ? 'passed' : 'failed';
    await page.evaluate(() => window.scrollTo(0, 0));
    if (representativeRoutes.has(route)) {
      await page.screenshot({
        path: path.join(outputRoot, `${role}-${safeName(route)}-viewport.png`),
        fullPage: false,
      });
    }
    if (status === 'failed' || route.endsWith('/dashboard')) {
      await page.screenshot({
        path: path.join(outputRoot, `${role}-${safeName(route)}.png`),
        fullPage: true,
      });
    }

    return {
      role,
      route,
      finalPath,
      status,
      failures,
      ...result,
      pageErrors,
      consoleErrors: consoleErrors.slice(0, 8),
      responseErrors: responseErrors.slice(0, 12),
    };
  } finally {
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    page.off('response', onResponse);
  }
}

function firstPropertyId(payload) {
  const candidates = [
    payload?.data?.data,
    payload?.data?.properties,
    payload?.data,
    payload?.properties,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate[0]?.id) return String(candidate[0].id);
  }
  return '';
}

async function resolveDynamicRoutes(role, session) {
  const headers = session.token ? { Authorization: `Bearer ${session.token}` } : {};
  const endpoint = role === 'manager'
    ? '/api/v1/properties/mine?limit=1'
    : role === 'admin'
      ? '/api/v1/admin/properties?limit=1'
      : '/api/v1/properties?page=1&limit=1';
  const payload = await fetch(`${serviceTarget.services.core}${endpoint}`, { headers })
    .then((response) => response.ok ? response.json() : null)
    .catch(() => null);
  const propertyId = firstPropertyId(payload);
  if (!propertyId) return [];
  const encodedId = encodeURIComponent(propertyId);
  if (role === 'manager') {
    return [
      `/manager/dashboard/properties/${encodedId}`,
      `/manager/dashboard/properties/edit/${encodedId}`,
    ];
  }
  if (role === 'admin') return [`/admin/properties/${encodedId}`];
  return [`/user/dashboard/properties/${encodedId}`];
}

async function main() {
  fs.mkdirSync(outputRoot, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const role of Object.keys(routes)) {
      const session = await loginViaApi(serviceTarget, role);
      const context = await createAuthedContext(browser, session);
      await context.addInitScript(() => {
        window.localStorage.setItem('estospaces_cookie_consent', 'rejected');
      });
      await context.setDefaultTimeout(15000);
      const page = await context.newPage();
      await page.setViewportSize(auditViewport);

      const roleRoutes = [...routes[role], ...await resolveDynamicRoutes(role, session)];
      for (const route of roleRoutes) {
        const result = await inspectMobilePage(page, role, route);
        results.push(result);
        process.stdout.write(`${result.status === 'passed' ? 'PASS' : 'FAIL'} ${role} ${route}${result.failures.length ? ` — ${result.failures.join('; ')}` : ''}\n`);
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }

  const reportPath = path.join(outputRoot, 'report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    frontendBaseUrl: baseUrl,
    serviceTarget: serviceTarget.name,
    viewport: auditViewport,
    results,
  }, null, 2));
  const failed = results.filter((result) => result.status === 'failed');
  process.stdout.write(`\n${results.length - failed.length}/${results.length} mobile routes passed. Report: ${reportPath}\n`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
