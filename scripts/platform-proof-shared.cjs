const fs = require('node:fs');
const path = require('node:path');

function requireEnv(name) {
  const value = process.env[name]
    || readEnvValue(name, ['.env.e2e', '.env.development', '.env.local'])
    || readEnvValue(name, ['.env.gcp-dev']);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function readEnvValueFromFile(filename, envKey) {
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
    if (key === envKey) {
      return valueParts.join('=').trim();
    }
  }

  return '';
}

function readEnvValue(envKey, filenames) {
  for (const filename of filenames) {
    const value = readEnvValueFromFile(filename, envKey);
    if (value) {
      return value;
    }
  }
  return '';
}

const DEV_WEB_BASE_URL = 'https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app';

function resolveDevBaseUrl() {
  return (
    process.env.E2E_DEV_BASE_URL
    || readEnvValue('FRONTEND_URL', ['.env.development', '.env.gcp-dev'])
    || DEV_WEB_BASE_URL
  );
}

function resolveDevServiceUrl(envKey, fallback) {
  return (
    process.env[envKey]
    || readEnvValue(envKey.replace(/^E2E_DEV_/, 'VITE_').replace(/_URL$/, '_SERVICE_URL'), ['.env.development', '.env.gcp-dev'])
    || fallback
  );
}

const devBaseUrl = resolveDevBaseUrl();

const targets = {
  local: {
    name: 'local',
    baseUrl: process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    appBaseUrl: process.env.E2E_LOCAL_APP_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    adminBaseUrl: process.env.E2E_LOCAL_ADMIN_BASE_URL || process.env.E2E_LOCAL_BASE_URL || 'http://localhost:3000',
    services: {
      core: process.env.E2E_LOCAL_CORE_URL || 'http://localhost:8080',
      booking: process.env.E2E_LOCAL_BOOKING_URL || 'http://localhost:8081',
      payment: process.env.E2E_LOCAL_PAYMENT_URL || 'http://localhost:8082',
      notification: process.env.E2E_LOCAL_NOTIFICATION_URL || 'http://localhost:8083',
      search: process.env.E2E_LOCAL_SEARCH_URL || 'http://localhost:8084',
      media: process.env.E2E_LOCAL_MEDIA_URL || 'http://localhost:8085',
      messaging: process.env.E2E_LOCAL_MESSAGING_URL || 'http://localhost:8086',
    },
  },
  dev: {
    name: 'dev',
    baseUrl: devBaseUrl,
    appBaseUrl: process.env.E2E_DEV_APP_BASE_URL || process.env.E2E_DEV_BASE_URL || devBaseUrl,
    adminBaseUrl: process.env.E2E_DEV_ADMIN_BASE_URL || process.env.E2E_DEV_BASE_URL || devBaseUrl,
    services: {
      core: resolveDevServiceUrl('E2E_DEV_CORE_URL', 'https://estospaces-core-service-dev-zaryfkxmeq-nw.a.run.app'),
      booking: resolveDevServiceUrl('E2E_DEV_BOOKING_URL', 'https://estospaces-booking-service-dev-zaryfkxmeq-nw.a.run.app'),
      payment: resolveDevServiceUrl('E2E_DEV_PAYMENT_URL', 'https://estospaces-payment-service-dev-zaryfkxmeq-nw.a.run.app'),
      notification: resolveDevServiceUrl('E2E_DEV_NOTIFICATION_URL', 'https://estospaces-notification-service-dev-zaryfkxmeq-nw.a.run.app'),
      search: resolveDevServiceUrl('E2E_DEV_SEARCH_URL', 'https://estospaces-search-service-dev-zaryfkxmeq-nw.a.run.app'),
      media: resolveDevServiceUrl('E2E_DEV_MEDIA_URL', 'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app'),
      messaging: resolveDevServiceUrl('E2E_DEV_MESSAGING_URL', 'https://estospaces-messaging-service-dev-zaryfkxmeq-nw.a.run.app'),
    },
  },
  staging: {
    name: 'staging',
    baseUrl: process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    appBaseUrl: process.env.E2E_STAGING_APP_BASE_URL || process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    adminBaseUrl: process.env.E2E_STAGING_ADMIN_BASE_URL || process.env.E2E_STAGING_BASE_URL || 'https://estospaces-web-staging-zaryfkxmeq-nw.a.run.app',
    services: {
      core: process.env.E2E_STAGING_CORE_URL || 'https://estospaces-core-service-staging-zaryfkxmeq-nw.a.run.app',
      booking: process.env.E2E_STAGING_BOOKING_URL || 'https://estospaces-booking-service-staging-zaryfkxmeq-nw.a.run.app',
      payment: process.env.E2E_STAGING_PAYMENT_URL || 'https://estospaces-payment-service-staging-zaryfkxmeq-nw.a.run.app',
      notification: process.env.E2E_STAGING_NOTIFICATION_URL || 'https://estospaces-notification-service-staging-zaryfkxmeq-nw.a.run.app',
      search: process.env.E2E_STAGING_SEARCH_URL || 'https://estospaces-search-service-staging-zaryfkxmeq-nw.a.run.app',
      media: process.env.E2E_STAGING_MEDIA_URL || 'https://estospaces-media-service-staging-zaryfkxmeq-nw.a.run.app',
      messaging: process.env.E2E_STAGING_MESSAGING_URL || 'https://estospaces-messaging-service-staging-zaryfkxmeq-nw.a.run.app',
    },
  },
  prod: {
    name: 'prod',
    baseUrl: process.env.E2E_PROD_BASE_URL || 'https://app.estospaces.com',
    appBaseUrl: process.env.E2E_PROD_APP_BASE_URL || process.env.E2E_PROD_BASE_URL || 'https://app.estospaces.com',
    adminBaseUrl: process.env.E2E_PROD_ADMIN_BASE_URL || 'https://admin.estospaces.com',
    services: {
      core: process.env.E2E_PROD_CORE_URL || 'https://estospaces-core-service-prod-zaryfkxmeq-nw.a.run.app',
      booking: process.env.E2E_PROD_BOOKING_URL || 'https://estospaces-booking-service-prod-zaryfkxmeq-nw.a.run.app',
      payment: process.env.E2E_PROD_PAYMENT_URL || 'https://estospaces-payment-service-prod-zaryfkxmeq-nw.a.run.app',
      notification: process.env.E2E_PROD_NOTIFICATION_URL || 'https://estospaces-notification-service-prod-zaryfkxmeq-nw.a.run.app',
      search: process.env.E2E_PROD_SEARCH_URL || 'https://estospaces-search-service-prod-zaryfkxmeq-nw.a.run.app',
      media: process.env.E2E_PROD_MEDIA_URL || 'https://estospaces-media-service-prod-zaryfkxmeq-nw.a.run.app',
      messaging: process.env.E2E_PROD_MESSAGING_URL || 'https://estospaces-messaging-service-prod-zaryfkxmeq-nw.a.run.app',
    },
  },
};

const credentials = {
  user: {
    emailEnv: 'E2E_USER_EMAIL',
    passwordEnv: 'E2E_USER_PASSWORD',
    dashboard: '/user/dashboard',
  },
  manager: {
    emailEnv: 'E2E_MANAGER_EMAIL',
    passwordEnv: 'E2E_MANAGER_PASSWORD',
    dashboard: '/manager/dashboard',
  },
  admin: {
    emailEnv: 'E2E_ADMIN_EMAIL',
    passwordEnv: 'E2E_ADMIN_PASSWORD',
    dashboard: '/admin/dashboard',
  },
};

function parseTarget(argv) {
  for (const arg of argv) {
    if (arg.startsWith('--target=')) {
      return arg.slice('--target='.length);
    }
  }
  return 'local';
}

function resolveTarget(argv) {
  const targetName = parseTarget(argv);
  const target = targets[targetName];
  if (!target) {
    throw new Error(`Unknown target: ${targetName}`);
  }
  return target;
}

function parseOption(argv, name) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === name && argv[i + 1]) {
      return argv[i + 1];
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1);
    }
  }
  return '';
}

async function ensureReachable(baseUrl) {
  const response = await fetch(baseUrl, { redirect: 'manual' });
  if (!response.ok && response.status !== 302) {
    throw new Error(`Base URL ${baseUrl} is not reachable: ${response.status}`);
  }
}

async function parseJson(response, label) {
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`${label} returned non-JSON: ${text}`);
  }

  if (!response.ok) {
    const detail = payload?.message || payload?.error || text || `status ${response.status}`;
    throw new Error(`${label} failed: ${detail}`);
  }

  return payload;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginViaApi(target, roleName) {
  const role = credentials[roleName];
  const email = requireEnv(role.emailEnv);
  const password = requireEnv(role.passwordEnv);
  const loginUrl = `${target.services.core}/api/v1/auth/login`;
  const request = () => fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let response = await request();
  if (response.status === 429) {
    await sleep(65000);
    response = await request();
  }
  const payload = await parseJson(response, `login ${email}`);
  const rawUser = payload?.data?.user ?? payload?.user;
  const token = payload?.data?.token ?? payload?.token;
  const fullName = [rawUser?.first_name, rawUser?.last_name].filter(Boolean).join(' ').trim() || rawUser?.email || email;

  return {
    token,
    storedUser: {
      id: String(rawUser?.id || ''),
      email: String(rawUser?.email || ''),
      name: fullName,
      role: String(rawUser?.role || roleName),
      isAuthenticated: true,
      first_name: rawUser?.first_name || undefined,
      last_name: rawUser?.last_name || undefined,
      avatar_url: rawUser?.avatar || rawUser?.avatar_url || undefined,
      avatar: rawUser?.avatar || rawUser?.avatar_url || undefined,
      phone: rawUser?.phone || undefined,
      address: rawUser?.address || undefined,
      postcode: rawUser?.postcode || undefined,
      user_metadata: {
        ...(typeof rawUser?.metadata === 'object' && rawUser.metadata ? rawUser.metadata : {}),
        full_name: fullName,
        phone: rawUser?.phone || undefined,
      },
    },
  };
}

async function createAuthedContext(browser, session) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, ignoreHTTPSErrors: true });
  await context.addInitScript(({ token, storedUser }) => {
    sessionStorage.setItem('esto_session_token', token);
    localStorage.setItem('esto_user', JSON.stringify(storedUser));
  }, session);
  return context;
}

function buildArtifactPath(filename) {
  return path.join(process.cwd(), 'output', 'playwright', filename);
}

function isIgnorableConsoleError(message) {
  const text = String(message || '').toLowerCase();
  return text.includes('downloadable font: download failed')
    && text.includes('fonts.gstatic.com');
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

function getRoleBaseUrl(target, roleName) {
  const role = normalizeRole(roleName);
  if (role === 'admin') {
    return target.adminBaseUrl || target.baseUrl;
  }
  return target.appBaseUrl || target.baseUrl;
}

module.exports = {
  buildArtifactPath,
  createAuthedContext,
  credentials,
  ensureReachable,
  getRoleBaseUrl,
  isIgnorableConsoleError,
  loginViaApi,
  parseOption,
  parseTarget,
  parseJson,
  resolveTarget,
  requireEnv,
};
