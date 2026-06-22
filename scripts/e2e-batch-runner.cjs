const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const {
  buildSelectionLabel,
  crashPattern,
  filterCatalog,
  generateCatalog,
  getFamily,
  getOutputRoot,
  getReachableBaseUrls,
  getRole,
  getScenarioBaseUrl,
  getScenarioSupport,
  getTarget,
  getWrongRoleName,
  isServiceRequest,
  summarizeCatalog,
  writeJson,
} = require('./e2e-batch-shared.cjs');

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
  return '';
}

function hasFlag(argv, name) {
  return argv.includes(name);
}

function createRunId(envName, selectionLabel) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${stamp}-${process.pid}-${envName}-${selectionLabel}`;
}

function sanitizeName(value) {
  return value.replace(/[^a-zA-Z0-9-_]+/g, '_');
}

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

const DEV_DEFAULT_WORKER_CAP = 2;
const SNAPSHOT_RESULT_INTERVAL = 10;
const SNAPSHOT_TIME_INTERVAL_MS = 30000;
const LOGIN_ATTEMPTS = 5;
const LOGIN_RETRY_DELAY_MS = 4000;
const LOGIN_MIN_INTERVAL_MS = 5000;
const FETCH_TIMEOUT_MS = Number(process.env.E2E_FETCH_TIMEOUT_MS || 15000);
const AUTH_STORAGE_KEY = 'esto_user';
const AUTH_TOKEN_KEY = 'esto_token';
const BROWSER_CLOSED_ERROR_PATTERN = /Target page, context or browser has been closed|browser\.newContext:|Page crashed/i;
let loginQueue = Promise.resolve();
let lastLoginCompletedAt = 0;
const authSessionCache = new Map();

async function runSerializedLogin(task) {
  const previousLogin = loginQueue;
  let releaseLoginQueue;
  loginQueue = new Promise((resolve) => {
    releaseLoginQueue = resolve;
  });

  await previousLogin;
  const waitMs = lastLoginCompletedAt + LOGIN_MIN_INTERVAL_MS - Date.now();
  if (waitMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  try {
    return await task();
  } finally {
    lastLoginCompletedAt = Date.now();
    releaseLoginQueue();
  }
}

function withTimeout(promise, timeoutMs, message) {
  if (!timeoutMs || timeoutMs <= 0) {
    return promise;
  }

  let timeoutId = null;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Fetch timeout after ${timeoutMs}ms: ${url}`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function ensureReachable(baseUrl) {
  const response = await fetchWithTimeout(baseUrl, { redirect: 'manual' });
  if (!response.ok && response.status !== 302) {
    throw new Error(`Base URL ${baseUrl} is not ready: ${response.status}`);
  }
}

function parseMetadata(value) {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  return typeof value === 'object' ? value : {};
}

function getEmailPrefix(email = '') {
  const normalizedEmail = String(email || '').trim();
  if (!normalizedEmail) {
    return 'User';
  }

  const [prefix] = normalizedEmail.split('@');
  return prefix || normalizedEmail;
}

function buildFullName(firstName, lastName, fallbackName, fallbackEmail) {
  const combinedName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
  if (combinedName) {
    return combinedName;
  }

  const normalizedFallbackName = String(fallbackName || '').trim();
  if (normalizedFallbackName) {
    return normalizedFallbackName;
  }

  return getEmailPrefix(fallbackEmail);
}

function buildStoredUser(rawUser, fallbackEmail = '') {
  const metadata = {
    ...parseMetadata(rawUser?.metadata),
    ...parseMetadata(rawUser?.user_metadata),
  };
  const email = String(rawUser?.email || fallbackEmail || '').trim();
  const firstName = String(rawUser?.first_name || '').trim();
  const lastName = String(rawUser?.last_name || '').trim();
  const fullName = buildFullName(firstName, lastName, rawUser?.name || metadata.full_name, email);
  const avatar = rawUser?.avatar || rawUser?.avatar_url || '';
  const phone = rawUser?.phone || metadata.phone || '';

  return {
    id: String(rawUser?.id || ''),
    email,
    name: fullName,
    role: String(rawUser?.role || 'user'),
    isAuthenticated: true,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    avatar_url: avatar || undefined,
    avatar: avatar || undefined,
    phone: phone || undefined,
    address: rawUser?.address || undefined,
    postcode: rawUser?.postcode || undefined,
    user_metadata: {
      ...metadata,
      full_name: fullName,
      phone: phone || undefined,
    },
  };
}

function getAuthCacheKey(target, roleName) {
  return `${target.name}:${roleName}`;
}

async function createAuthSession(target, roleName) {
  const role = getRole(roleName);
  return runSerializedLogin(async () => {
    let lastError = null;

    for (let attempt = 0; attempt < LOGIN_ATTEMPTS; attempt += 1) {
      const loginResponse = await fetchWithTimeout(`${target.coreServiceUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: role.email,
          password: role.password,
        }),
      });

      if (loginResponse.status === 429) {
        lastError = new Error(`Login rate limited for ${roleName}`);
        if (attempt < LOGIN_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
        break;
      }

      try {
        const payload = await loginResponse.json().catch(() => null);
        if (!loginResponse.ok) {
          throw new Error(
            `API login failed for ${roleName}: ${loginResponse.status} ${JSON.stringify(payload || {})}`,
          );
        }

        const token = payload?.token || payload?.data?.token;
        const userData = payload?.user || payload?.data?.user || { email: role.email, role: role.name };
        if (!token) {
          throw new Error(`API login succeeded for ${roleName} without a token`);
        }

        return {
          token,
          user: buildStoredUser(userData, role.email),
        };
      } catch (error) {
        lastError = error;
        if (attempt < LOGIN_ATTEMPTS - 1) {
          await new Promise((resolve) => setTimeout(resolve, LOGIN_RETRY_DELAY_MS * (attempt + 1)));
          continue;
        }
      }
    }

    throw lastError || new Error(`Unable to authenticate as ${roleName}`);
  });
}

async function getAuthSession(target, roleName, workerId, options = {}) {
  const fresh = options.fresh === true;
  const cacheKey = getAuthCacheKey(target, roleName);
  if (!fresh && authSessionCache.has(cacheKey)) {
    return authSessionCache.get(cacheKey);
  }

  const session = await createAuthSession(target, roleName);
  if (!fresh) {
    authSessionCache.set(cacheKey, session);
  }
  return session;
}

function buildAuthStorageState(baseUrl, session, tokenOverride) {
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseUrl).origin,
        localStorage: [
          {
            name: AUTH_TOKEN_KEY,
            value: tokenOverride || session.token,
          },
          {
            name: AUTH_STORAGE_KEY,
            value: JSON.stringify(session.user),
          },
        ],
      },
    ],
  };
}

async function readBodyText(page) {
  try {
    return await page.locator('body').innerText({ timeout: 1000 });
  } catch {
    return '';
  }
}

function shouldEnforceStaleSessionRecovery(scenario) {
  return scenario.auth_state === 'stale_session' && !isSyntheticDependencyScenario(scenario);
}

async function waitForMeaningfulRender(page, scenario, expectedPath = scenario.expected_path || '') {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const currentPath = new URL(page.url()).pathname;
    const bodyText = await readBodyText(page);
    const trimmedBody = bodyText.trim();
    const hasMeaningfulBody = trimmedBody.length >= 20;
    const authPageVisible = /sign in to estospaces|enter your email and password to continue|don't have an account\?|forgot password/i.test(bodyText);
    const sessionRecoveryVisible = /session has expired|log in again|sign in/i.test(bodyText);
    const waitingForStartupRedirect = scenario.auth_state === 'fresh_session'
      && expectedPath
      && expectedPath !== '/'
      && currentPath === '/';
    const currentPathIsPublic = isPublicUserPropertyDetailPath(currentPath);
    const waitingForWrongRoleRedirect = scenario.auth_state === 'wrong_role'
      && expectedPath
      && !currentPathIsPublic
      && currentPath.startsWith(expectedPath);
    const waitingForSignedOutRedirect = scenario.auth_state === 'signed_out'
      && expectedPath
      && !currentPathIsPublic
      && currentPath.startsWith(expectedPath);
    const waitingForStaleSessionRecovery = shouldEnforceStaleSessionRecovery(scenario)
      && expectedPath
      && currentPath.startsWith(expectedPath)
      && !sessionRecoveryVisible;
    const startupShellStillLoading = scenario.family_code === 'F1'
      && currentPath === '/'
      && /Loading\.\.\./i.test(trimmedBody);
    const loadingOnlyVisible = /^Loading\.\.\.$/i.test(trimmedBody);
    const loginPathSettled = currentPath.startsWith('/login') && (hasMeaningfulBody || authPageVisible || sessionRecoveryVisible);
    const expectedPathSettled = !!expectedPath
      && currentPath.startsWith(expectedPath)
      && (hasMeaningfulBody || sessionRecoveryVisible);
    if (
      (!waitingForStartupRedirect && loginPathSettled) ||
      (!waitingForStartupRedirect && expectedPathSettled) ||
      (!waitingForStartupRedirect && !expectedPath && hasMeaningfulBody) ||
      hasMeaningfulBody ||
      authPageVisible ||
      sessionRecoveryVisible
    ) {
      if (
        waitingForStartupRedirect
        || waitingForWrongRoleRedirect
        || waitingForSignedOutRedirect
        || waitingForStaleSessionRecovery
        || startupShellStillLoading
        || loadingOnlyVisible
      ) {
        await page.waitForTimeout(500);
        continue;
      }
      return;
    }

    await page.waitForTimeout(500);
  }
}

const retriableScenarioErrorPattern = /net::ERR_NAME_NOT_RESOLVED|net::ERR_NETWORK_CHANGED|net::ERR_CONNECTION_RESET|net::ERR_ABORTED|Timeout 30000ms exceeded|Target page, context or browser has been closed|Network service crashed|browser\.newContext:|Page crashed/i;

function isRetriableScenarioError(error) {
  const message = typeof error === 'string' ? error : (error?.message || '');
  return retriableScenarioErrorPattern.test(message);
}

function hasRetriableResponseErrors(responseErrors = []) {
  return responseErrors.some((entry) => /^429\s/i.test(String(entry || '')));
}

function isBrowserClosedError(error) {
  const message = typeof error === 'string' ? error : (error?.message || '');
  return BROWSER_CLOSED_ERROR_PATTERN.test(message);
}

function createWorkerBrowserManager(headed) {
  let browser = null;
  let browserPromise = null;

  async function launchBrowser() {
    const launchedBrowser = await chromium.launch({ headless: !headed });
    launchedBrowser.on('disconnected', () => {
      if (browser === launchedBrowser) {
        browser = null;
      }
    });
    return launchedBrowser;
  }

  return {
    async getBrowser() {
      if (browser) {
        return browser;
      }
      if (!browserPromise) {
        browserPromise = launchBrowser().then((launchedBrowser) => {
          browser = launchedBrowser;
          browserPromise = null;
          return launchedBrowser;
        }).catch((error) => {
          browserPromise = null;
          throw error;
        });
      }
      return browserPromise;
    },
    async resetBrowser() {
      const activeBrowser = browser;
      browser = null;
      browserPromise = null;
      await activeBrowser?.close().catch(() => {});
    },
    async closeBrowser() {
      await this.resetBrowser();
    },
  };
}

async function gotoWithRetries(page, url, options = {}, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await page.goto(url, options);
    } catch (error) {
      lastError = error;
      if (!isRetriableScenarioError(error) || attempt === attempts) {
        throw error;
      }
      await page.waitForTimeout(500 * attempt).catch(() => {});
    }
  }
  throw lastError;
}

function createPageMonitor(page) {
  const pageErrors = [];
  const consoleErrors = [];
  const responseErrors = [];
  const serviceRequests = [];

  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const text = message.text();
      if (!isIgnorableConsoleError(text)) {
        consoleErrors.push(text);
      }
    }
  });
  page.on('request', (request) => {
    if (isServiceRequest(request.url())) {
      serviceRequests.push(`${request.method()} ${request.url()}`);
    }
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status === 429 || status >= 500) {
      responseErrors.push(`${status} ${response.url()}`);
    }
  });

  return {
    pageErrors,
    consoleErrors,
    responseErrors,
    serviceRequests,
  };
}

function isIgnorableConsoleError(text) {
  return /^Failed to load resource:/i.test(text)
    || /WebSocket connection to 'ws:\/\/(?:127\.0\.0\.1|localhost):\d+\/' failed: Error in connection establishment: net::ERR_NETWORK_IO_SUSPENDED/i.test(text);
}

async function screenshot(page, outputDir, scenarioId) {
  const filePath = path.join(outputDir, `${sanitizeName(scenarioId)}.png`);
  await page.screenshot({ path: filePath, fullPage: true }).catch(() => {});
  return filePath;
}

function summarizeResults(results) {
  return {
    executed: results.length,
    passed: results.filter((item) => item.status === 'passed').length,
    failed: results.filter((item) => item.status === 'failed').length,
    blocked: results.filter((item) => item.status === 'blocked').length,
  };
}

function sortResults(results) {
  return [...results].sort((left, right) => {
    const leftIndex = Number.isFinite(left.catalog_index) ? left.catalog_index : Number.MAX_SAFE_INTEGER;
    const rightIndex = Number.isFinite(right.catalog_index) ? right.catalog_index : Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    return left.scenario_id.localeCompare(right.scenario_id);
  });
}

function loadExistingResults(outputDir) {
  const finalResultsPath = path.join(outputDir, 'results.json');
  const partialResultsPath = path.join(outputDir, 'results.partial.json');
  const loaded = readJson(finalResultsPath) || readJson(partialResultsPath);
  if (!Array.isArray(loaded)) {
    return [];
  }
  return sortResults(
    loaded.filter((item) => item && typeof item.scenario_id === 'string'),
  );
}

function buildSummary({ runId, envName, baseUrl, filters, selectionSummary, results, partial = false }) {
  return {
    run_id: runId,
    generated_at: new Date().toISOString(),
    env: envName,
    base_url: baseUrl,
    filters,
    selection: selectionSummary,
    partial,
    counts: summarizeResults(results),
    results,
  };
}

function createProgressTracker({
  outputDir,
  runId,
  envName,
  baseUrl,
  filters,
  selectionSummary,
  workerCount,
  requestedWorkers,
  results,
}) {
  const statusPath = path.join(outputDir, 'status.json');
  const partialResultsPath = path.join(outputDir, 'results.partial.json');
  const partialSummaryPath = path.join(outputDir, 'summary.partial.json');
  const finalResultsPath = path.join(outputDir, 'results.json');
  const finalSummaryPath = path.join(outputDir, 'summary.json');
  const startedAt = new Date().toISOString();
  let writeQueue = Promise.resolve();
  let lastSnapshotAt = 0;
  let lastSnapshotCount = 0;

  function queueWrite(task) {
    writeQueue = writeQueue.then(task, task);
    return writeQueue;
  }

  function buildStatus(state, extra = {}) {
    return {
      run_id: runId,
      env: envName,
      base_url: baseUrl,
      filters,
      selection: selectionSummary,
      requested_workers: requestedWorkers,
      worker_count: workerCount,
      started_at: startedAt,
      updated_at: new Date().toISOString(),
      state,
      ...summarizeResults(results),
      ...extra,
    };
  }

  function shouldSnapshot(forceSnapshot) {
    if (forceSnapshot) {
      return true;
    }
    if (results.length === 0) {
      return false;
    }
    if (results.length - lastSnapshotCount >= SNAPSHOT_RESULT_INTERVAL) {
      return true;
    }
    return Date.now() - lastSnapshotAt >= SNAPSHOT_TIME_INTERVAL_MS;
  }

  async function writeSnapshot(partial) {
    const orderedResults = sortResults(results);
    writeJson(partialResultsPath, orderedResults);
    writeJson(
      partialSummaryPath,
      buildSummary({
        runId,
        envName,
        baseUrl,
        filters,
        selectionSummary,
        results: orderedResults,
        partial,
      }),
    );
    lastSnapshotAt = Date.now();
    lastSnapshotCount = orderedResults.length;
  }

  return {
    async start() {
      await queueWrite(async () => {
        writeJson(statusPath, buildStatus('running'));
      });
    },
    async checkpoint(forceSnapshot = false) {
      await queueWrite(async () => {
        writeJson(statusPath, buildStatus('running'));
        if (shouldSnapshot(forceSnapshot)) {
          await writeSnapshot(true);
        }
      });
    },
    async fail(error) {
      await queueWrite(async () => {
        await writeSnapshot(true);
        writeJson(
          statusPath,
          buildStatus('failed', {
            failed_at: new Date().toISOString(),
            error: error.message,
          }),
        );
      });
    },
    async complete() {
      await queueWrite(async () => {
        const orderedResults = sortResults(results);
        const summary = buildSummary({
          runId,
          envName,
          baseUrl,
          filters,
          selectionSummary,
          results: orderedResults,
          partial: false,
        });
        writeJson(finalResultsPath, orderedResults);
        writeJson(partialResultsPath, orderedResults);
        writeJson(partialSummaryPath, summary);
        writeJson(finalSummaryPath, summary);
        lastSnapshotAt = Date.now();
        lastSnapshotCount = orderedResults.length;
        writeJson(
          statusPath,
          buildStatus('completed', {
            completed_at: new Date().toISOString(),
            result_path: finalSummaryPath,
          }),
        );
      });
      return finalSummaryPath;
    },
    interrupt(reason) {
      const orderedResults = sortResults(results);
      writeJson(partialResultsPath, orderedResults);
      writeJson(
        partialSummaryPath,
        buildSummary({
          runId,
          envName,
          baseUrl,
          filters,
          selectionSummary,
          results: orderedResults,
          partial: true,
        }),
      );
      writeJson(
        statusPath,
        buildStatus('interrupted', {
          interrupted_at: new Date().toISOString(),
          reason,
        }),
      );
    },
    flush() {
      return writeQueue;
    },
  };
}

function tryParseJson(bodyText) {
  try {
    return JSON.parse(bodyText);
  } catch {
    return null;
  }
}

function buildSyntheticString(value, suffix, key) {
  if (!value) {
    return value;
  }

  if (/email/i.test(key) && value.includes('@')) {
    const [localPart, domain] = value.split('@');
    return `${localPart}+qa-${suffix}@${domain}`;
  }

  if (/slug|uuid|id|name|title|subject|label|reference|ref|code/i.test(key)) {
    return `${value}-qa-${suffix}`;
  }

  return value;
}

function cloneForLargeDataset(value, suffix, key = '') {
  if (Array.isArray(value)) {
    return value.map((item, index) => cloneForLargeDataset(item, `${suffix}-${index}`));
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      next[entryKey] = cloneForLargeDataset(entryValue, `${suffix}-${entryKey}`, entryKey);
    }
    return next;
  }

  if (typeof value === 'string') {
    return buildSyntheticString(value, suffix, key);
  }

  if (typeof value === 'number' && /(id|count|total|index|position|sequence|rank|order)/i.test(key)) {
    return value + Number(String(suffix).replace(/\D/g, '').slice(-3) || 1);
  }

  return value;
}

function transformEmptyValue(value, state, key = '') {
  if (Array.isArray(value)) {
    if (value.length >= 0) {
      state.changed = true;
    }
    return [];
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      next[entryKey] = transformEmptyValue(entryValue, state, entryKey);
    }
    return next;
  }

  if (typeof value === 'number' && /(count|total|size|pages?|unread|active)/i.test(key)) {
    state.changed = true;
    return 0;
  }

  if (typeof value === 'boolean' && /(has|more|next|available|enabled|active)/i.test(key)) {
    state.changed = true;
    return false;
  }

  return value;
}

function transformLargeDatasetValue(value, state, key = '') {
  if (Array.isArray(value)) {
    const next = value.map((item) => transformLargeDatasetValue(item, state, key));
    if (next.length >= 12) {
      state.changed = true;
      return next;
    }
    if (next.length > 0) {
      const expanded = [...next];
      let copyIndex = 0;
      while (expanded.length < 12) {
        const template = next[copyIndex % next.length];
        expanded.push(cloneForLargeDataset(template, expanded.length + 1, key));
        copyIndex += 1;
      }
      state.changed = true;
      return expanded;
    }
    return next;
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      next[entryKey] = transformLargeDatasetValue(entryValue, state, entryKey);
    }
    return next;
  }

  return value;
}

function mapTerminalStatus(value, key) {
  if (/ticket|support|conversation|message/i.test(key)) {
    return 'closed';
  }
  if (/payment|contract|booking|viewing|application/i.test(key)) {
    return 'completed';
  }
  if (/verification|review|decision/i.test(key)) {
    return 'rejected';
  }
  if (/journey|stage|phase|step/i.test(key)) {
    return 'completed';
  }
  return 'archived';
}

function transformArchivedTerminalValue(value, state, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => transformArchivedTerminalValue(item, state, key));
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      next[entryKey] = transformArchivedTerminalValue(entryValue, state, entryKey);
    }
    return next;
  }

  if (typeof value === 'string' && /(status|state|journey|stage|phase|decision|lifecycle|availability)/i.test(key)) {
    state.changed = true;
    return mapTerminalStatus(value, key);
  }

  if (typeof value === 'boolean') {
    if (/(archived|closed|resolved|completed|disabled|inactive|terminal)/i.test(key)) {
      state.changed = true;
      return true;
    }
    if (/(active|enabled|open|available|visible)/i.test(key)) {
      state.changed = true;
      return false;
    }
  }

  if (typeof value === 'number' && /(count|total|unread|active|pending|open)/i.test(key)) {
    state.changed = true;
    return 0;
  }

  return value;
}

function transformMissingLinkedRecordValue(value, state, key = '') {
  if (Array.isArray(value)) {
    return value.map((item) => transformMissingLinkedRecordValue(item, state, key));
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [entryKey, entryValue] of Object.entries(value)) {
      if (entryValue && typeof entryValue === 'object' && /(property|listing|case|conversation|contract|payment|verification|document|ticket|booking)/i.test(entryKey)) {
        state.changed = true;
        next[entryKey] = null;
        continue;
      }
      next[entryKey] = transformMissingLinkedRecordValue(entryValue, state, entryKey);
    }
    return next;
  }

  if (typeof value === 'string' && /(Id|ID|_id|_uuid|Uuid|UUID|slug)$/i.test(key)) {
    state.changed = true;
    return 'qa-missing-linked-record';
  }

  return value;
}

function transformScenarioPayload(payload, scenario) {
  const state = { changed: false };

  if (scenario.data_state === 'empty') {
    const value = transformEmptyValue(payload, state);
    return { changed: state.changed, value };
  }
  if (scenario.data_state === 'large_dataset') {
    const value = transformLargeDatasetValue(payload, state);
    return { changed: state.changed, value };
  }
  if (scenario.data_state === 'archived_terminal') {
    const value = transformArchivedTerminalValue(payload, state);
    return { changed: state.changed, value };
  }
  if (scenario.data_state === 'missing_linked_record') {
    const value = transformMissingLinkedRecordValue(payload, state);
    return { changed: state.changed, value };
  }

  return { changed: false, value: payload };
}

function shouldTransformResponse(scenario, request) {
  return scenario.network_state === 'normal'
    && request.method() === 'GET'
    && ['empty', 'large_dataset', 'archived_terminal', 'missing_linked_record'].includes(scenario.data_state);
}

function shouldRequireInterception(scenario, currentPath) {
  if (scenario.auth_state !== 'fresh_session') {
    return false;
  }
  if (currentPath.startsWith('/login') || currentPath.startsWith('/auth')) {
    return false;
  }
  return scenario.network_state !== 'normal' || scenario.data_state !== 'nominal';
}

function isSyntheticDependencyScenario(scenario) {
  return scenario.network_state !== 'normal' || scenario.data_state !== 'nominal';
}

async function installScenarioInterceptors(context, scenario) {
  let interceptCount = 0;
  const handler = async (route) => {
    try {
      const request = route.request();
      const url = request.url();
      if (!isServiceRequest(url) || request.resourceType() === 'document') {
        await route.continue();
        return;
      }

      const networkState = scenario.network_state;
      if (networkState !== 'normal') {
        interceptCount += 1;
        await route.fulfill({
          status: Number(networkState),
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: `Injected ${networkState} response` }),
        });
        return;
      }

      if (scenario.data_state === 'degraded_dependency') {
        interceptCount += 1;
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Injected degraded dependency response' }),
        });
        return;
      }

      if (shouldTransformResponse(scenario, request)) {
        const upstream = await route.fetch({ timeout: FETCH_TIMEOUT_MS });
        const bodyText = await upstream.text();
        const payload = tryParseJson(bodyText);
        if (payload === null) {
          await route.continue();
          return;
        }

        const transformed = transformScenarioPayload(payload, scenario);
        if (!transformed.changed && scenario.data_state !== 'empty') {
          await route.continue();
          return;
        }

        interceptCount += 1;
        await route.fulfill({
          response: upstream,
          headers: {
            ...upstream.headers(),
            'content-type': 'application/json; charset=utf-8',
          },
          body: JSON.stringify(transformed.value),
        });
        return;
      }

      await route.continue();
      return;
    } catch (error) {
      if (/Target page, context or browser has been closed|Route is already handled/i.test(error.message || '')) {
        return;
      }
      await route.continue().catch(() => {});
    }
  };

  await context.route('**/*', handler);
  return {
    getInterceptCount: () => interceptCount,
    cleanup: () => context.unroute('**/*', handler),
  };
}

function resolveScenarioRoute(scenario, supportInfo) {
  if (supportInfo.route) {
    return supportInfo.route;
  }
  if (scenario.data_state === 'missing_linked_record' && scenario.missing_path) {
    return scenario.missing_path;
  }
  const family = getFamily(scenario.family_code);
  return family.visitByRole[scenario.role];
}

function resolveExpectedPath(scenario) {
  if (scenario.data_state === 'missing_linked_record' && scenario.missing_path) {
    if (scenario.family_code === 'F8') {
      const family = getFamily(scenario.family_code);
      return family.visitByRole[scenario.role];
    }
    return scenario.missing_path;
  }
  return scenario.expected_path;
}

function isPublicUserPropertyDetailPath(pathname) {
  return /^\/user\/properties\/[^/]+\/?$/.test(String(pathname || ''));
}

async function prepareAuthState(target, baseUrl, scenario, workerId) {
  if (scenario.auth_state === 'fresh_session') {
    const session = await getAuthSession(target, scenario.role, workerId);
    return {
      activeRole: scenario.role,
      session,
      storageState: buildAuthStorageState(baseUrl, session),
    };
  }

  if (scenario.auth_state === 'wrong_role') {
    const wrongRole = getWrongRoleName(scenario.role);
    const session = await getAuthSession(target, wrongRole, workerId);
    return {
      activeRole: wrongRole,
      session,
      storageState: buildAuthStorageState(baseUrl, session),
    };
  }

  if (scenario.auth_state === 'stale_session') {
    const session = await getAuthSession(target, scenario.role, workerId);
    return {
      activeRole: scenario.role,
      session,
      staleInjected: true,
      storageState: buildAuthStorageState(baseUrl, session, 'qa-stale-token'),
    };
  }

  return { activeRole: 'signed_out' };
}

async function assertGenericOutcome(page, scenario, expectedPath, monitor, interceptorState) {
  const notes = [];
  let currentPath = new URL(page.url()).pathname;
  let bodyText = await readBodyText(page);
  const sessionPattern = /session has expired|log in again|login|sign in/i;
  const requiresInterception = shouldRequireInterception(scenario, currentPath);

  if (crashPattern.test(bodyText)) {
    throw new Error(`Crash text detected on ${currentPath}`);
  }
  if (monitor.pageErrors.length > 0) {
    throw new Error(`Page error: ${monitor.pageErrors[0]}`);
  }
  if (monitor.consoleErrors.length > 0) {
    throw new Error(`Console error: ${monitor.consoleErrors[0]}`);
  }

  if (scenario.auth_state === 'signed_out') {
    if (
      !currentPath.startsWith('/login')
      && !currentPath.startsWith('/auth')
      && !isPublicUserPropertyDetailPath(currentPath)
      && currentPath === expectedPath
    ) {
      throw new Error(`Signed-out scenario still resolved to protected path ${currentPath}`);
    }
    return notes;
  }

  if (scenario.auth_state === 'wrong_role') {
    if (!isPublicUserPropertyDetailPath(currentPath) && currentPath.startsWith(expectedPath)) {
      throw new Error(`Wrong-role scenario reached protected path ${currentPath}`);
    }
    return notes;
  }

  if (shouldEnforceStaleSessionRecovery(scenario)) {
    if (currentPath.startsWith(expectedPath) && !sessionPattern.test(bodyText)) {
      await page.waitForTimeout(1200).catch(() => {});
      currentPath = new URL(page.url()).pathname;
      bodyText = await readBodyText(page);
    }
    if (currentPath.startsWith(expectedPath) && !sessionPattern.test(bodyText)) {
      throw new Error(`Stale-session scenario stayed on ${currentPath} without auth recovery`);
    }
    return notes;
  }

  if (requiresInterception) {
    if (interceptorState.getInterceptCount() === 0) {
      await page.waitForTimeout(1000).catch(() => {});
      if (interceptorState.getInterceptCount() === 0) {
        if (monitor.serviceRequests.length === 0) {
          notes.push(`No service request observed for ${scenario.scenario_id}`);
        } else {
          throw new Error(`Scenario expected interception but none occurred for ${scenario.scenario_id}`);
        }
      }
    }
    notes.push(`Injected ${scenario.network_state !== 'normal' ? scenario.network_state : scenario.data_state} dependency state on ${currentPath}`);
  } else if (
    !isSyntheticDependencyScenario(scenario)
    && !currentPath.startsWith(expectedPath)
    && !currentPath.startsWith('/login')
  ) {
    throw new Error(`Expected ${expectedPath} but reached ${currentPath}`);
  }

  if (bodyText.trim().length < 20) {
    throw new Error(`Page rendered too little content on ${currentPath}`);
  }

  return notes;
}

async function executeSupportScenario(page, baseUrl, scenario, monitor, installInterceptors) {
  const expectedPath = scenario.expected_path;
  const targetRoute = resolveScenarioRoute(scenario, getScenarioSupport(scenario));
  const interceptorState = await installInterceptors();
  await gotoWithRetries(page, `${baseUrl}${targetRoute}`, { waitUntil: 'domcontentloaded' });
  await waitForMeaningfulRender(page, scenario);

  const outcomeNotes = await assertGenericOutcome(page, scenario, expectedPath, monitor, interceptorState);
  return {
    notes: [
      scenario.auth_state === 'fresh_session'
        && scenario.network_state === 'normal'
        && scenario.data_state === 'nominal'
        ? 'support workspace route verified'
        : 'support route probe only',
      ...outcomeNotes,
    ],
  };
}

async function executeAuthScenario(page, baseUrl, target, scenario, monitor, installInterceptors, workerId) {
  if (scenario.auth_state === 'fresh_session' && scenario.network_state === 'normal' && scenario.data_state === 'nominal') {
    const session = await getAuthSession(target, scenario.role, workerId, { fresh: true });
    const token = session.token;
    if (!token) {
      throw new Error('Login completed without stored access token');
    }

    const meBefore = await fetchWithTimeout(`${target.coreServiceUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const logout = await fetchWithTimeout(`${target.coreServiceUrl}/api/v1/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const meAfter = await fetchWithTimeout(`${target.coreServiceUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (meBefore.status !== 200 || logout.status !== 200 || meAfter.status === 200) {
      throw new Error(`Logout revocation failed: meBefore=${meBefore.status} logout=${logout.status} meAfter=${meAfter.status}`);
    }

    return { notes: [`logout revocation verified for ${scenario.role}`] };
  }

  const interceptorState = await installInterceptors();
  await gotoWithRetries(page, `${baseUrl}${scenario.visit_path}`, { waitUntil: 'domcontentloaded' });
  await waitForMeaningfulRender(page, scenario);
  const outcomeNotes = await assertGenericOutcome(page, scenario, scenario.expected_path, monitor, interceptorState);
  return { notes: ['auth route probe only', ...outcomeNotes] };
}

async function executeDefaultScenario(page, baseUrl, scenario, monitor, installInterceptors) {
  const interceptorState = await installInterceptors();
  const targetRoute = resolveScenarioRoute(scenario, getScenarioSupport(scenario));
  const expectedPath = resolveExpectedPath(scenario);
  await gotoWithRetries(page, `${baseUrl}${targetRoute}`, { waitUntil: 'domcontentloaded' });
  await waitForMeaningfulRender(page, scenario, expectedPath);
  const outcomeNotes = await assertGenericOutcome(page, scenario, expectedPath, monitor, interceptorState);
  return { notes: [`route probe ${targetRoute}`, ...outcomeNotes] };
}

function scenarioUsesSeededAuthContext(scenario) {
  return !(
    scenario.family_code === 'F2'
    && scenario.auth_state === 'fresh_session'
    && scenario.network_state === 'normal'
    && scenario.data_state === 'nominal'
  );
}

async function runScenario(browserManager, baseUrlOverride, target, scenario, outputDir, scenarioTimeoutMs, workerId) {
  const supportInfo = getScenarioSupport(scenario);
  if (!supportInfo.supported) {
    return {
      catalog_index: scenario.catalog_index,
      scenario_id: scenario.scenario_id,
      batch_id: scenario.batch_id,
      family: scenario.family_name,
      env: target.name,
      role: scenario.role,
      auth_state: scenario.auth_state,
      data_state: scenario.data_state,
      network_state: scenario.network_state,
      viewport: scenario.viewport,
      status: 'blocked',
      cleanup_status: 'not_required',
      artifact_paths: [],
      defect_ref: '',
      notes: [supportInfo.reason],
    };
  }

  const attemptNotes = [];
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const baseUrl = getScenarioBaseUrl(target, scenario, baseUrlOverride);
    let context = null;
    let page = null;
    let monitor = {
      pageErrors: [],
      consoleErrors: [],
      responseErrors: [],
      serviceRequests: [],
    };
    const artifactPaths = [];
    let interceptorState = null;
    const installInterceptors = async () => {
      if (!interceptorState) {
        interceptorState = await installScenarioInterceptors(context, scenario);
      }
      return interceptorState;
    };

    try {
      const attemptStartedAt = Date.now();
      const remainingAttemptTimeoutMs = () => {
        if (!scenarioTimeoutMs || scenarioTimeoutMs <= 0) {
          return 0;
        }
        return Math.max(1, scenarioTimeoutMs - (Date.now() - attemptStartedAt));
      };
      const authState = scenarioUsesSeededAuthContext(scenario)
        ? await withTimeout(
          prepareAuthState(target, baseUrl, scenario, workerId),
          remainingAttemptTimeoutMs(),
          `Scenario timeout after ${scenarioTimeoutMs}ms during auth preparation`,
        )
        : { activeRole: 'signed_out' };
      const browser = await browserManager.getBrowser();
      context = await browser.newContext({
        viewport: { width: scenario.viewport_width, height: scenario.viewport_height },
        ignoreHTTPSErrors: true,
        ...(authState.storageState ? { storageState: authState.storageState } : {}),
      });
      page = await context.newPage();
      monitor = createPageMonitor(page);

      const executionPromise = (async () => {
        if (scenario.family_code === 'F2') {
          return executeAuthScenario(page, baseUrl, target, scenario, monitor, installInterceptors, workerId);
        }
        if (scenario.family_code === 'F6') {
          return executeSupportScenario(page, baseUrl, scenario, monitor, installInterceptors);
        }
        return executeDefaultScenario(page, baseUrl, scenario, monitor, installInterceptors);
      })();

      let execution = executionPromise;
      if (scenarioTimeoutMs > 0) {
        const remainingMs = remainingAttemptTimeoutMs();
        execution = Promise.race([
          executionPromise,
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Scenario timeout after ${scenarioTimeoutMs}ms`)), remainingMs);
          }),
        ]);
      }

      const resolvedExecution = await execution;

      return {
        catalog_index: scenario.catalog_index,
        scenario_id: scenario.scenario_id,
        batch_id: scenario.batch_id,
        family: scenario.family_name,
        env: target.name,
        role: scenario.role,
        auth_state: scenario.auth_state,
        data_state: scenario.data_state,
        network_state: scenario.network_state,
        viewport: scenario.viewport,
        status: 'passed',
        cleanup_status: 'not_required',
        artifact_paths: artifactPaths,
        defect_ref: '',
        notes: [...attemptNotes, ...(resolvedExecution?.notes || [])],
      };
    } catch (error) {
      const message = error?.message || String(error);
      const responseRetry = hasRetriableResponseErrors(monitor.responseErrors);
      if (attempt < maxAttempts && (isRetriableScenarioError(message) || responseRetry)) {
        const retryReason = responseRetry
          ? monitor.responseErrors.find((entry) => /^429\s/i.test(String(entry || ''))) || message
          : message.split('\n')[0];
        attemptNotes.push(`retry ${attempt} after transient error: ${retryReason}`);
        if (isBrowserClosedError(message)) {
          await browserManager.resetBrowser();
        }
        await context?.close().catch(() => {});
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }

      if (page) {
        const screenshotPath = await screenshot(page, outputDir, scenario.scenario_id);
        artifactPaths.push(screenshotPath);
      }
      return {
        catalog_index: scenario.catalog_index,
        scenario_id: scenario.scenario_id,
        batch_id: scenario.batch_id,
        family: scenario.family_name,
        env: target.name,
        role: scenario.role,
        auth_state: scenario.auth_state,
        data_state: scenario.data_state,
        network_state: scenario.network_state,
        viewport: scenario.viewport,
        status: 'failed',
        cleanup_status: 'not_required',
        artifact_paths: artifactPaths,
        defect_ref: '',
        notes: [
          ...attemptNotes,
          message,
          ...(monitor.responseErrors.length > 0 ? [monitor.responseErrors[0]] : []),
        ],
      };
    } finally {
      if (interceptorState) {
        await interceptorState.cleanup().catch(() => {});
      }
      await context?.close().catch(() => {});
    }
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const envName = parseOption(argv, '--env') || 'dev';
  const target = getTarget(envName);
  const requestedWorkers = Number(parseOption(argv, '--workers') || 1);
  const resumeRunId = parseOption(argv, '--resume-run-id');
  const resumeDir = parseOption(argv, '--resume-dir');
  const unsafeWorkers = hasFlag(argv, '--unsafe-workers');
  const scenarioTimeoutMs = Number(parseOption(argv, '--scenario-timeout-ms') || 0);
  const filters = {
    batch: parseOption(argv, '--batch'),
    family: parseOption(argv, '--family'),
    role: parseOption(argv, '--role'),
    auth: parseOption(argv, '--auth'),
    data: parseOption(argv, '--data') || parseOption(argv, '--data-state'),
    network: parseOption(argv, '--network') || parseOption(argv, '--network-state'),
    scenarioId: parseOption(argv, '--scenario-id'),
    scenarioLimit: parseOption(argv, '--scenario-limit'),
  };
  const baseUrlOverride = parseOption(argv, '--base-url') || '';
  const baseUrl = baseUrlOverride || target.baseUrl;
  const headed = hasFlag(argv, '--headed');
  const catalog = generateCatalog();
  const selected = filterCatalog(catalog, filters);
  if (selected.length === 0) {
    throw new Error('No scenarios matched the requested filters');
  }

  for (const reachableBaseUrl of getReachableBaseUrls(target, selected, baseUrlOverride)) {
    await ensureReachable(reachableBaseUrl);
  }

  const selectionLabel = buildSelectionLabel({ env: envName, ...filters });
  const runId = resumeRunId || createRunId(envName, selectionLabel);
  const outputDir = resumeDir || (resumeRunId
    ? path.join(getOutputRoot(process.cwd()), resumeRunId)
    : path.join(getOutputRoot(process.cwd()), runId));
  fs.mkdirSync(outputDir, { recursive: true });

  const selectionSummary = summarizeCatalog(selected);
  const existingResults = loadExistingResults(outputDir);
  const retainedResults = existingResults.filter((item) => item.status === 'passed' || item.status === 'blocked');
  const completedScenarioIds = new Set(
    retainedResults.map((item) => item.scenario_id),
  );
  const remainingScenarios = selected.filter((scenario) => !completedScenarioIds.has(scenario.scenario_id));
  writeJson(path.join(outputDir, 'selection.json'), {
    run_id: runId,
    base_url: baseUrl,
    env: envName,
    filters,
    selection: selectionSummary,
    scenarios: selected,
    resume: (resumeRunId || resumeDir) ? {
      loaded_results: existingResults.length,
      retained_results: retainedResults.length,
      remaining_scenarios: remainingScenarios.length,
    } : undefined,
  });

  const runnableScenarioCount = remainingScenarios.length;
  const envWorkerCap = envName === 'dev' && !unsafeWorkers
    ? DEV_DEFAULT_WORKER_CAP
    : Math.max(runnableScenarioCount, 1);
  const workerCount = Math.max(
    1,
    Math.min(Math.max(runnableScenarioCount, 1), Number.isFinite(requestedWorkers) ? requestedWorkers : 1, envWorkerCap),
  );
  if (workerCount < requestedWorkers) {
    console.warn(
      `Capped worker count to ${workerCount} for env=${envName}. Pass --unsafe-workers to override this cap.`,
    );
  }

  const results = [...retainedResults];
  const progressTracker = createProgressTracker({
    outputDir,
    runId,
    envName,
    baseUrl,
    filters,
    selectionSummary,
    workerCount,
    requestedWorkers,
    results,
  });
  const workerBrowserManagers = [];
  let finalSummaryPath = path.join(outputDir, 'summary.json');
  await progressTracker.start();

  if (remainingScenarios.length === 0) {
    finalSummaryPath = await progressTracker.complete();
    console.log(JSON.stringify({ resultPath: finalSummaryPath, ...summarizeResults(results), workerCount: 0 }, null, 2));
    return;
  }

  let shutdownRequested = false;
  const handleSignal = (signalName) => {
    if (shutdownRequested) {
      return;
    }

    shutdownRequested = true;
    try {
      progressTracker.interrupt(`Process interrupted by ${signalName}`);
    } catch {}

    void Promise.all(workerBrowserManagers.map((manager) => manager.closeBrowser().catch(() => {})));

    process.exitCode = 130;
    setTimeout(() => process.exit(130), 0);
  };

  const onSigInt = () => handleSignal('SIGINT');
  const onSigTerm = () => handleSignal('SIGTERM');
  process.once('SIGINT', onSigInt);
  process.once('SIGTERM', onSigTerm);

  try {
    let nextIndex = 0;
    const workerTasks = Array.from({ length: workerCount }, (_, workerIndex) => async () => {
      const browserManager = createWorkerBrowserManager(headed);
      workerBrowserManagers.push(browserManager);
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= remainingScenarios.length) {
          await browserManager.closeBrowser();
          return;
        }
        results.push(await runScenario(
          browserManager,
          baseUrlOverride,
          target,
          remainingScenarios[currentIndex],
          outputDir,
          scenarioTimeoutMs,
          workerIndex,
        ));
        await progressTracker.checkpoint();
      }
    });
    await Promise.all(workerTasks.map((task) => task()));
    finalSummaryPath = await progressTracker.complete();
  } catch (error) {
    await progressTracker.fail(error);
    throw error;
  } finally {
    process.removeListener('SIGINT', onSigInt);
    process.removeListener('SIGTERM', onSigTerm);
    await Promise.all(workerBrowserManagers.map((manager) => manager.closeBrowser().catch(() => {})));
    await progressTracker.flush();
  }

  console.log(JSON.stringify({ resultPath: finalSummaryPath, ...summarizeResults(results), workerCount }, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
