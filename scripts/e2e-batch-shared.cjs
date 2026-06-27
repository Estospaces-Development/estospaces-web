const fs = require('node:fs');
const path = require('node:path');

const crashPattern = /toast is not defined|unexpected application error|something went wrong|application error|referenceerror|cannot access .* before initialization/i;
const DEV_WEB_BASE_URL = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

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
    return '';
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const [key, ...valueParts] = line.split('=');
    if (key === 'FRONTEND_URL') {
      return valueParts.join('=').trim();
    }
  }

  return '';
}

function resolveDevBaseUrl() {
  return (
    process.env.E2E_DEV_BASE_URL
    || readFrontendUrlFromEnvFile('.env.development')
    || readFrontendUrlFromEnvFile('.env.gcp-dev')
    || DEV_WEB_BASE_URL
  );
}

const devBaseUrl = resolveDevBaseUrl();

const envTargets = {
  dev: {
    name: 'dev',
    baseUrl: devBaseUrl,
    appBaseUrl: process.env.E2E_DEV_APP_BASE_URL || process.env.E2E_DEV_BASE_URL || devBaseUrl,
    adminBaseUrl: process.env.E2E_DEV_ADMIN_BASE_URL || process.env.E2E_DEV_BASE_URL || devBaseUrl,
    coreServiceUrl: process.env.E2E_DEV_CORE_URL || 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app',
    caseId: process.env.E2E_DEV_FAST_TRACK_CASE_ID || '',
  },
  local: {
    name: 'local',
    baseUrl: process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    appBaseUrl: process.env.E2E_LOCAL_APP_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    adminBaseUrl: process.env.E2E_LOCAL_ADMIN_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    coreServiceUrl: process.env.E2E_LOCAL_CORE_URL || 'http://localhost:8080',
    caseId: process.env.E2E_LOCAL_FAST_TRACK_CASE_ID || '',
  },
  staging: {
    name: 'staging',
    baseUrl: process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    appBaseUrl: process.env.E2E_STAGING_APP_BASE_URL || process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    adminBaseUrl: process.env.E2E_STAGING_ADMIN_BASE_URL || process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    coreServiceUrl: process.env.E2E_STAGING_CORE_URL || 'https://estospaces-core-service-staging-zaryfkxmeq-nw.a.run.app',
    caseId: process.env.E2E_STAGING_FAST_TRACK_CASE_ID || '',
  },
  prod: {
    name: 'prod',
    baseUrl: process.env.E2E_PROD_BASE_URL || 'https://app.estospaces.com',
    appBaseUrl: process.env.E2E_PROD_APP_BASE_URL || process.env.E2E_PROD_BASE_URL || 'https://app.estospaces.com',
    adminBaseUrl: process.env.E2E_PROD_ADMIN_BASE_URL || 'https://admin.estospaces.com',
    coreServiceUrl: process.env.E2E_PROD_CORE_URL || 'https://estospaces-core-service-prod-zaryfkxmeq-nw.a.run.app',
    caseId: process.env.E2E_PROD_FAST_TRACK_CASE_ID || '',
  },
};

const roleDefinitions = {
  user: {
    name: 'user',
    email: requireEnv('E2E_USER_EMAIL'),
    password: requireEnv('E2E_USER_PASSWORD'),
    dashboard: '/user/dashboard',
  },
  manager: {
    name: 'manager',
    email: requireEnv('E2E_MANAGER_EMAIL'),
    password: requireEnv('E2E_MANAGER_PASSWORD'),
    dashboard: '/manager/dashboard',
  },
  admin: {
    name: 'admin',
    email: requireEnv('E2E_ADMIN_EMAIL'),
    password: requireEnv('E2E_ADMIN_PASSWORD'),
    dashboard: '/admin/dashboard',
  },
};

const authStates = ['fresh_session', 'signed_out', 'wrong_role', 'stale_session'];
const dataStates = ['nominal', 'empty', 'large_dataset', 'missing_linked_record', 'archived_terminal', 'degraded_dependency'];
const networkStates = ['normal', '401', '403', '404', '500', '503'];
const viewports = [
  { name: 'desktop', width: 1440, height: 960 },
  { name: 'mobile', width: 390, height: 844 },
];

const familyDefinitions = [
  {
    code: 'F1',
    name: 'startup-routing',
    visitByRole: { user: '/', manager: '/', admin: '/' },
    expectedByRole: { user: '/user/dashboard', manager: '/manager/dashboard', admin: '/admin/dashboard' },
  },
  {
    code: 'F2',
    name: 'auth-session',
    visitByRole: { user: '/user/dashboard', manager: '/manager/dashboard', admin: '/admin/dashboard' },
    expectedByRole: { user: '/user/dashboard', manager: '/manager/dashboard', admin: '/admin/dashboard' },
  },
  {
    code: 'F3',
    name: 'user-workspaces',
    visitByRole: { user: '/user/dashboard', manager: '/manager/leads', admin: '/admin/users' },
    expectedByRole: { user: '/user/dashboard', manager: '/manager/leads', admin: '/admin/users' },
    missingByRole: {
      user: '/user/properties/qa-missing-record',
      manager: '/manager/dashboard/properties/qa-missing-record',
      admin: '/admin/properties/qa-missing-record',
    },
  },
  {
    code: 'F4',
    name: 'manager-workspaces',
    visitByRole: { user: '/user/applications', manager: '/manager/dashboard', admin: '/admin/properties' },
    expectedByRole: { user: '/user/applications', manager: '/manager/dashboard', admin: '/admin/properties' },
  },
  {
    code: 'F5',
    name: 'admin-workspaces',
    visitByRole: { user: '/user/dashboard', manager: '/manager/analytics', admin: '/admin/dashboard' },
    expectedByRole: { user: '/user/dashboard', manager: '/manager/analytics', admin: '/admin/dashboard' },
  },
  {
    code: 'F6',
    name: 'support-operations',
    visitByRole: { user: '/user/dashboard/help', manager: '/manager/help', admin: '/admin/help' },
    expectedByRole: { user: '/user/dashboard/help', manager: '/manager/help', admin: '/admin/help' },
  },
  {
    code: 'F7',
    name: 'messaging-conversations',
    visitByRole: { user: '/user/dashboard/messages', manager: '/manager/messages', admin: '/admin/help' },
    expectedByRole: { user: '/user/dashboard/messages', manager: '/manager/messages', admin: '/admin/help' },
  },
  {
    code: 'F8',
    name: 'rent-fast-track',
    visitByRole: { user: '/user/dashboard/fast-track', manager: '/manager/fast-track', admin: '/admin/fast-track' },
    expectedByRole: { user: '/user/dashboard/fast-track', manager: '/manager/fast-track', admin: '/admin/fast-track' },
    missingByRole: {
      user: '/user/dashboard/fast-track?case=qa-missing-case',
      manager: '/manager/fast-track?case=qa-missing-case',
      admin: '/admin/fast-track?case=qa-missing-case',
    },
  },
  {
    code: 'F9',
    name: 'sale-fast-track',
    visitByRole: { user: '/user/applications', manager: '/manager/applications', admin: '/admin/fast-track' },
    expectedByRole: { user: '/user/applications', manager: '/manager/applications', admin: '/admin/fast-track' },
  },
  {
    code: 'F10',
    name: 'verification-documents',
    visitByRole: { user: '/user/docs', manager: '/manager/user-verifications', admin: '/admin/verifications' },
    expectedByRole: { user: '/user/docs', manager: '/manager/user-verifications', admin: '/admin/verifications' },
  },
  {
    code: 'F11',
    name: 'contracts-payments',
    visitByRole: { user: '/user/dashboard/contracts', manager: '/manager/contracts', admin: '/admin/properties' },
    expectedByRole: { user: '/user/dashboard/contracts', manager: '/manager/contracts', admin: '/admin/properties' },
  },
  {
    code: 'F12',
    name: 'analytics-reporting',
    visitByRole: { user: '/user/dashboard', manager: '/manager/analytics', admin: '/admin/analytics' },
    expectedByRole: { user: '/user/dashboard', manager: '/manager/analytics', admin: '/admin/analytics' },
  },
];

const familyByCode = new Map(familyDefinitions.map((family) => [family.code, family]));

function getWorkspaceRoot(cwd = process.cwd()) {
  return path.resolve(cwd, '..');
}

function getReviewPath(cwd = process.cwd()) {
  return path.join(getWorkspaceRoot(cwd), 'review.md');
}

function getTestListPath(cwd = process.cwd()) {
  return path.join(getWorkspaceRoot(cwd), 'test_list.md');
}

function getOutputRoot(cwd = process.cwd()) {
  return path.join(cwd, 'output', 'playwright', 'batches');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function getRole(roleName) {
  const role = roleDefinitions[roleName];
  if (!role) {
    throw new Error(`Unknown role: ${roleName}`);
  }
  return role;
}

function getTarget(envName) {
  const target = envTargets[envName];
  if (!target) {
    throw new Error(`Unknown environment: ${envName}`);
  }
  return target;
}

function getWrongRoleName(roleName) {
  if (roleName === 'user') return 'manager';
  if (roleName === 'manager') return 'user';
  return 'user';
}

function normalizeRole(roleName) {
  const role = String(roleName || '').trim().toLowerCase();
  if (role === 'admin') {
    return 'admin';
  }
  if (role === 'manager' || role === 'broker') {
    return 'manager';
  }
  return 'user';
}

function getScenarioBaseUrl(target, scenario, baseUrlOverride = '') {
  if (baseUrlOverride) {
    return baseUrlOverride;
  }

  const route = String(
    scenario?.visit_path
    || scenario?.expected_path
    || scenario?.missing_path
    || '',
  );
  if (route.startsWith('/admin')) {
    return target.adminBaseUrl || target.baseUrl;
  }

  const role = normalizeRole(scenario?.role);
  if (role === 'admin') {
    return target.adminBaseUrl || target.baseUrl;
  }

  return target.appBaseUrl || target.baseUrl;
}

function getReachableBaseUrls(target, scenarios = [], baseUrlOverride = '') {
  if (baseUrlOverride) {
    return [baseUrlOverride];
  }

  const urls = new Set();
  for (const scenario of scenarios) {
    urls.add(getScenarioBaseUrl(target, scenario));
  }
  if (urls.size === 0) {
    urls.add(target.baseUrl);
  }
  return [...urls];
}

function formatBatchId(familyCode, roleName, authState) {
  return `${familyCode}-${roleName}-${authState}`;
}

function getFamily(familyCode) {
  const family = familyByCode.get(familyCode);
  if (!family) {
    throw new Error(`Unknown family code: ${familyCode}`);
  }
  return family;
}

function buildSelectionLabel(filters = {}) {
  const parts = [];
  if (filters.env) parts.push(filters.env);
  if (filters.batch) parts.push(filters.batch);
  if (filters.family) parts.push(filters.family);
  if (filters.role) parts.push(filters.role);
  if (filters.auth) parts.push(filters.auth);
  if (filters.data) parts.push(filters.data);
  if (filters.network) parts.push(filters.network);
  return parts.length > 0 ? parts.join('-') : 'full-catalog';
}

function createScenario(index, family, roleName, authState, dataState, networkState, viewport) {
  return {
    catalog_index: index,
    scenario_id: `${family.code}-${roleName}-${authState}-${dataState}-${networkState}-${viewport.name}`,
    batch_id: formatBatchId(family.code, roleName, authState),
    family_code: family.code,
    family_name: family.name,
    role: roleName,
    auth_state: authState,
    data_state: dataState,
    network_state: networkState,
    viewport: viewport.name,
    viewport_width: viewport.width,
    viewport_height: viewport.height,
    visit_path: family.visitByRole[roleName],
    expected_path: family.expectedByRole[roleName],
    missing_path: family.missingByRole?.[roleName] || '',
  };
}

function generateCatalog() {
  const scenarios = [];
  let index = 1;

  for (const family of familyDefinitions) {
    for (const roleName of Object.keys(roleDefinitions)) {
      for (const authState of authStates) {
        for (const dataState of dataStates) {
          for (const networkState of networkStates) {
            for (const viewport of viewports) {
              scenarios.push(createScenario(index, family, roleName, authState, dataState, networkState, viewport));
              index += 1;
            }
          }
        }
      }
    }
  }

  return scenarios;
}

function filterCatalog(catalog, filters = {}) {
  let scenarios = [...catalog];
  if (filters.batch) {
    scenarios = scenarios.filter((scenario) => scenario.batch_id === filters.batch);
  }
  if (filters.family) {
    scenarios = scenarios.filter((scenario) => scenario.family_code === filters.family);
  }
  if (filters.role) {
    scenarios = scenarios.filter((scenario) => scenario.role === filters.role);
  }
  if (filters.auth) {
    scenarios = scenarios.filter((scenario) => scenario.auth_state === filters.auth);
  }
  if (filters.data) {
    scenarios = scenarios.filter((scenario) => scenario.data_state === filters.data);
  }
  if (filters.network) {
    scenarios = scenarios.filter((scenario) => scenario.network_state === filters.network);
  }
  if (filters.scenarioId) {
    scenarios = scenarios.filter((scenario) => scenario.scenario_id === filters.scenarioId);
  }
  if (filters.scenarioLimit) {
    scenarios = scenarios.slice(0, Number(filters.scenarioLimit));
  }
  return scenarios;
}

function summarizeCatalog(catalog) {
  const byBatch = {};
  for (const scenario of catalog) {
    if (!byBatch[scenario.batch_id]) {
      byBatch[scenario.batch_id] = {
        batch_id: scenario.batch_id,
        family_code: scenario.family_code,
        family_name: scenario.family_name,
        role: scenario.role,
        auth_state: scenario.auth_state,
        scenario_count: 0,
      };
    }
    byBatch[scenario.batch_id].scenario_count += 1;
  }

  return {
    scenario_count: catalog.length,
    batch_count: Object.keys(byBatch).length,
    batches: Object.values(byBatch),
  };
}

function isServiceRequest(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname || '';

    if (pathname.startsWith('/api/v1/') || pathname.startsWith('/__dev_proxy/')) {
      return true;
    }

    if ((hostname === 'localhost' || hostname === '127.0.0.1') && /^808\d$/.test(parsed.port || '')) {
      return true;
    }

    return /^estospaces-(core|booking|notification|payment|search|media|messaging)-service/i.test(hostname);
  } catch {
    return url.includes('/api/v1/') || url.includes('/__dev_proxy/');
  }
}

function getScenarioSupport(scenario) {
  if (scenario.data_state === 'nominal') {
    return { supported: true, mode: 'nominal' };
  }
  if (scenario.data_state === 'degraded_dependency') {
    return { supported: true, mode: 'degraded_dependency' };
  }
  if (scenario.data_state === 'empty') {
    return { supported: true, mode: 'empty' };
  }
  if (scenario.data_state === 'large_dataset') {
    return { supported: true, mode: 'large_dataset' };
  }
  if (scenario.data_state === 'archived_terminal') {
    return { supported: true, mode: 'archived_terminal' };
  }
  if (scenario.data_state === 'missing_linked_record') {
    return {
      supported: true,
      mode: 'missing_linked_record',
      route: scenario.missing_path || '',
    };
  }

  return {
    supported: false,
    mode: 'blocked',
    reason: `No scenario adapter is implemented for data_state=${scenario.data_state} in ${scenario.family_code}`,
  };
}

module.exports = {
  authStates,
  buildSelectionLabel,
  crashPattern,
  dataStates,
  envTargets,
  familyDefinitions,
  filterCatalog,
  formatBatchId,
  generateCatalog,
  getFamily,
  getOutputRoot,
  getReachableBaseUrls,
  getReviewPath,
  getRole,
  getScenarioSupport,
  getScenarioBaseUrl,
  getTarget,
  getTestListPath,
  getWorkspaceRoot,
  getWrongRoleName,
  isServiceRequest,
  networkStates,
  roleDefinitions,
  summarizeCatalog,
  viewports,
  ensureDir,
  writeJson,
};
