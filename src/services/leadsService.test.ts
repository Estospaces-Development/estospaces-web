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
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
    const file = new File([pdfBytes], 'school.pdf', { type: 'application/pdf' });
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
  assert.ok(documentRequest.body, 'document upload request body should be present');
  const body = JSON.parse(documentRequest.body);
  assert.equal(body.document_type, 'supporting_document');
  assert.equal(body.document_category, 'supporting');
  assert.equal(body.media_id, 'media-1');
  assert.equal(body.file_name, 'school.pdf');
  assert.equal(body.file_url, 'https://example.test/file.pdf');
  assert.equal(body.file_size, 4);
  assert.equal(body.mime_type, 'application/pdf');
  assert.equal(body.category_id, 'category-1');
  assert.equal(body.virtual_storage_state, 'saved');
});
