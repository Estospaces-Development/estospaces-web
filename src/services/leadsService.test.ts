import test from 'node:test';
import assert from 'node:assert/strict';

import { getAllLeads, getAdminBrokers, reassignLead } from '@/services/leadsService';

const buildResponse = (payload: Record<string, unknown>) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    success: true,
    data: [],
    ...payload,
  }),
}) as Response;

test('admin lead service methods use the admin-scoped API routes', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body?: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: String(init?.method || 'GET'),
      body: init?.body ? String(init.body) : undefined,
    });
    return buildResponse({
      pagination: { total: 0, page: 1, limit: 20 },
    });
  }) as typeof fetch;

  try {
    await getAllLeads();
    await getAdminBrokers();
    await reassignLead('lead-1', 'broker-1');
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(requests[0].url, 'http://localhost:8080/api/v1/admin/leads?page=1&limit=20');
  assert.equal(requests[1].url, 'http://localhost:8080/api/v1/brokers?page=1&limit=50&status=approved');
  assert.equal(requests[2].url, 'http://localhost:8080/api/v1/admin/leads/lead-1/reassign');
  assert.equal(requests[2].method, 'PUT');
  assert.equal(requests[2].body, JSON.stringify({ broker_id: 'broker-1' }));
});
