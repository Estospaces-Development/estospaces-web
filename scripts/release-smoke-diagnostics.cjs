function parseObject(value) {
  if (typeof value !== 'string') {
    return {};
  }

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function safeLocation(value) {
  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    const url = new URL(value);
    return { hostname: url.hostname, pathname: url.pathname };
  } catch {
    const pathname = value.split(/[?#]/, 1)[0];
    return pathname.startsWith('/') ? { pathname } : undefined;
  }
}

function contractFor(id) {
  if (id.startsWith('unauth:')) return 'Protected API rejects unauthenticated requests';
  if (id.startsWith('http:')) return 'Endpoint returns its expected healthy status';
  if (id.startsWith('headers:')) return 'Required response header matches the release contract';
  if (id.startsWith('browser-health:')) return 'Browser pass has no page, console, or server errors';
  if (id.endsWith(':admin-login-form')) return 'Admin login renders visible email and password inputs';
  if (id.startsWith('browser:')) return 'Browser route renders its expected page content';
  if (id.startsWith('protected-redirect:')) return 'Protected route redirects an unauthenticated visitor to login';
  if (id.startsWith('latency:')) return 'Endpoint returns without server errors inside the latency threshold';
  return 'Release smoke check passes';
}

function safeCheckId(id) {
  if (id.startsWith('latency:')) {
    try {
      const url = new URL(id.slice('latency:'.length));
      return `latency:${url.hostname || 'endpoint'}`;
    } catch {
      return 'latency:endpoint';
    }
  }

  return /^[a-z0-9:._/-]+$/i.test(id) ? id : 'unknown';
}

function summarizeFailure(item) {
  const rawId = typeof item?.id === 'string' ? item.id : 'unknown';
  const actual = parseObject(item?.actual);
  const summary = { id: safeCheckId(rawId), contract: contractFor(rawId) };

  if (Number.isFinite(actual.status)) summary.status = actual.status;
  if (Number.isFinite(actual.ms)) summary.ms = actual.ms;
  if (Number.isFinite(actual.max)) summary.maxMs = actual.max;

  const location = safeLocation(actual.actualUrl || (rawId.startsWith('protected-redirect:') ? item?.actual : actual.actualPath));
  if (location) summary.location = location;

  if (typeof actual.emailVisible === 'boolean') summary.emailVisible = actual.emailVisible;
  if (typeof actual.passwordVisible === 'boolean') summary.passwordVisible = actual.passwordVisible;

  if (rawId.startsWith('browser-health:')) {
    summary.pageErrorCount = Array.isArray(actual.pageErrors) ? actual.pageErrors.length : 0;
    summary.consoleErrorCount = Array.isArray(actual.consoleErrors) ? actual.consoleErrors.length : 0;
    summary.networkErrorCount = Array.isArray(actual.networkErrors) ? actual.networkErrors.length : 0;
  }

  return summary;
}

function summarizeFailedResults(results) {
  return results.filter((item) => item?.status === 'failed').map(summarizeFailure);
}

module.exports = { summarizeFailedResults };
