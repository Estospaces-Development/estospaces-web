import test from 'node:test';
import assert from 'node:assert/strict';

import { getAllLeads, getAdminBrokers, reassignLead, uploadDocument } from '@/services/leadsService';

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

test('document upload sends virtual storage category and state metadata', async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; body?: string }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({
      url: String(input),
      method: String(init?.method || 'GET'),
      body: init?.body instanceof FormData ? '[form-data]' : init?.body ? String(init.body) : undefined,
    });

    if (String(input).includes('/api/v1/media')) {
      return buildResponse({
        data: {
          id: 'media-1',
          file_url: 'https://example.test/file.pdf',
        },
      });
    }

    return buildResponse({
      data: {
        id: 'doc-1',
        user_id: 'user-1',
        document_type: 'supporting_document',
        document_category: 'supporting',
        file_name: 'school.pdf',
        file_url: 'https://example.test/file.pdf',
        file_size: 4,
        mime_type: 'application/pdf',
        status: 'pending',
        virtual_storage_state: 'saved',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });
  }) as typeof fetch;

  try {
    const file = new File(['test'], 'school.pdf', { type: 'application/pdf' });
    const result = await uploadDocument('supporting_document', file, {
      categoryId: 'category-1',
      virtualStorageState: 'saved',
    });

    assert.equal(result.success, true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  const documentRequest = requests.find((request) => request.url.endsWith('/api/v1/documents'));
  assert.ok(documentRequest);
  assert.equal(
    documentRequest.body,
    JSON.stringify({
      document_type: 'supporting_document',
      document_category: 'supporting',
      media_id: 'media-1',
      file_name: 'school.pdf',
      file_url: 'https://example.test/file.pdf',
      file_size: 4,
      mime_type: 'application/pdf',
      target_user_id: '',
      lead_id: '',
      fast_track_case_id: '',
      application_id: '',
      contract_id: '',
      property_id: '',
      manager_id: '',
      request_id: '',
      link_family: '',
      visibility: '',
      requirement_codes: [],
      reusable: false,
      category_id: 'category-1',
      virtual_storage_state: 'saved',
    }),
  );
});
