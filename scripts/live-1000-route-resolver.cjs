function extractVirtualTourIdFromUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) {
    return '';
  }

  try {
    const url = new URL(raw, 'http://local.estospaces.test');
    const match = url.pathname.match(/^\/virtual-tours\/([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : '';
  } catch {
    const match = raw.match(/\/virtual-tours\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  }
}

function normalizeRoute(route, ids = {}) {
  let normalized = String(route || '').trim();
  normalized = normalized.replace(/\*+$/, '').replace(/\/$/, '') || '/';

  if (normalized.startsWith('/virtual-tours/:id')) {
    normalized = normalized.replace(':id', ids.virtualTourId || ids.propertyId || 'qa-missing-record');
  } else {
    normalized = normalized.replace(':id', ids.propertyId || 'qa-missing-record');
  }

  normalized = normalized.replace(':caseId', ids.caseId || 'qa-missing-case');
  normalized = normalized.replace(':propertyId', ids.propertyId || 'qa-missing-record');
  normalized = normalized.replace(':leadId', ids.leadId || 'qa-missing-lead');
  normalized = normalized.replace(':conversationId', ids.conversationId || 'qa-missing-conversation');
  return normalized;
}

function roleForRoute(route, scenarioRole) {
  if (route.startsWith('/admin')) return 'admin';
  if (route.startsWith('/manager')) return 'manager';
  if (route.startsWith('/user')) return 'user';
  const normalized = String(scenarioRole || '').toLowerCase();
  if (normalized.includes('admin')) return 'admin';
  if (normalized.includes('manager') || normalized.includes('broker')) return 'manager';
  if (normalized.includes('user')) return 'user';
  return 'public';
}

function rolesNeededForScenarios(scenarios) {
  const roles = new Set();
  for (const scenario of scenarios || []) {
    const routes = Array.isArray(scenario.routes) && scenario.routes.length > 0
      ? scenario.routes
      : [''];
    for (const route of routes) {
      const role = roleForRoute(String(route || ''), scenario.role);
      if (role !== 'public') {
        roles.add(role);
      }
    }
  }
  return ['admin', 'manager', 'user'].filter((role) => roles.has(role));
}

module.exports = {
  extractVirtualTourIdFromUrl,
  normalizeRoute,
  roleForRoute,
  rolesNeededForScenarios,
};
