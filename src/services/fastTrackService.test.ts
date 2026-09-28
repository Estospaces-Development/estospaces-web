import test from 'node:test';
import assert from 'node:assert/strict';

import { getFastTrackCaseById, getFastTrackCases, requestFastTrack } from './fastTrackService';

const buildResponse = (payload: unknown) => ({
  ok: true,
  status: 200,
  text: async () => JSON.stringify({
    success: true,
    data: payload,
  }),
}) as Response;

const buildErrorResponse = (status: number, message: string) => ({
  ok: false,
  status,
  text: async () => JSON.stringify({
    success: false,
    error: message,
  }),
}) as Response;

test('user Fast Track action calls the request endpoint without trusted manager fields', async () => {
  const originalFetch = globalThis.fetch;
  let requestedURL = '';
  const requestInits: RequestInit[] = [];

  try {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requestedURL = String(input);
      requestInits.push(init || {});
      return buildResponse({
        status: 'requested',
        property_id: 'property-1',
        lead_id: 'lead-1',
        requested_at: '2026-08-17T10:00:00.000Z',
      });
    }) as typeof fetch;

    const result = await requestFastTrack({
      property_id: 'property-1',
      lead_id: 'lead-1',
      client_name: 'Test User',
      property_title: 'Test Home',
      property_type: 'rent',
      manager_id: 'manager-must-not-leak',
      client_id: 'client-must-not-leak',
      started_from: 'direct_property',
    } as Parameters<typeof requestFastTrack>[0] & {
      manager_id: string;
      client_id: string;
      started_from: string;
    });

    assert.equal(result.requested, true);
    assert.equal(result.requestedAt, '2026-08-17T10:00:00.000Z');
    assert.match(requestedURL, /\/api\/v1\/fast-track\/request$/);
    assert.equal(requestInits[0]?.method, 'POST');
    const requestBody = JSON.parse(String(requestInits[0]?.body));
    assert.match(requestBody.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(requestBody.property_id, 'property-1');
    assert.equal('manager_id' in requestBody, false);
    assert.equal('client_id' in requestBody, false);
    assert.equal('started_from' in requestBody, false);

    await requestFastTrack({
      property_id: 'property-1',
      lead_id: 'lead-1',
      client_name: 'Test User',
      property_title: 'Test Home',
      property_type: 'rent',
    });
    const secondRequestBody = JSON.parse(String(requestInits[1]?.body));
    assert.match(secondRequestBody.request_id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.notEqual(secondRequestBody.request_id, requestBody.request_id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Fast Track request fails closed when the server omits its authoritative request time', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => buildResponse({
      status: 'requested',
      property_id: 'property-1',
    })) as typeof fetch;

    const result = await requestFastTrack({
      property_id: 'property-1',
      property_title: 'Test home',
      property_type: 'sale',
      client_name: 'Test user',
    });

    assert.equal(result.requested, false);
    assert.equal(result.requestedAt, null);
    assert.match(result.error || '', /confirmation is incomplete/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fast-track detail lookup distinguishes a missing case from a temporary service failure', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () => buildErrorResponse(500, 'The service is temporarily unavailable. Please try again.')) as typeof fetch;
    const unavailable = await getFastTrackCaseById('case-unavailable', { suppressErrorToast: true });

    assert.equal(unavailable.data, null);
    assert.equal(unavailable.notFound, false);
    assert.match(unavailable.error || '', /temporarily unavailable/i);

    globalThis.fetch = (async () => buildErrorResponse(404, 'Fast-track case not found.')) as typeof fetch;
    const missing = await getFastTrackCaseById('case-missing', { suppressErrorToast: true });

    assert.equal(missing.data, null);
    assert.equal(missing.notFound, true);
    assert.equal(missing.forbidden, false);
    assert.equal(unavailable.forbidden, false);

    globalThis.fetch = (async () => buildErrorResponse(403, 'Unauthorized: you do not have access to this case')) as typeof fetch;
    const foreign = await getFastTrackCaseById('case-foreign', { suppressErrorToast: true });

    assert.equal(foreign.data, null);
    assert.equal(foreign.notFound, false);
    assert.equal(foreign.forbidden, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fast-track service maps manager verification reupload_required documents to reupload needed UI state', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => buildResponse([
    {
      id: 'case-1',
      case_id: 'case-1',
      header: {
        property_id: 'property-1',
        property_title: 'Test Home',
        property_type: 'Flat',
        client_id: 'user-1',
        client_name: 'Test User',
        submitted_at: '2026-05-07T08:00:00.000Z',
        hours_remaining: 20,
      },
      stage: 'documents',
      final_status: 'active',
      documents: {
        items: [
          {
            id: 'identity',
            label: 'Identity proof',
            status: 'under_review',
            document_record_id: 'doc-id',
            file_name: 'passport.pdf',
            mime_type: 'application/pdf',
            uploaded_at: '2026-05-07T08:10:00.000Z',
          },
          {
            id: 'address',
            label: 'Address proof',
            status: 'reupload_required',
            document_record_id: 'doc-address',
            file_name: 'old-bill.pdf',
            mime_type: 'application/pdf',
            uploaded_at: '2026-05-07T08:12:00.000Z',
          },
        ],
      },
      viewing: {},
      decision: {},
      agreement: {},
      handover: {},
      activity: [],
    },
  ])) as typeof fetch;

  try {
    const result = await getFastTrackCases();

    assert.equal(result.error, null);
    assert.equal(result.data?.[0]?.documents.items[0]?.status, 'uploaded');
    assert.equal(result.data?.[0]?.documents.items[1]?.status, 'reupload_needed');
    assert.equal(result.data?.[0]?.documents.addressProof, 'reupload_required');
    assert.equal(result.data?.[0]?.documentPhase, 'replacement_required');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fast-track service normalizes completed cases away from stale stage and SLA', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => buildResponse([
    {
      id: 'case-complete',
      case_id: 'case-complete',
      header: {
        property_id: 'property-1',
        property_title: 'Completed Home',
        property_type: 'Flat',
        client_id: 'user-1',
        client_name: 'Test User',
        submitted_at: '2026-05-07T08:00:00.000Z',
        hours_remaining: -12,
        overdue: true,
      },
      stage: 'viewing',
      final_status: 'completed',
      documents: { items: [] },
      viewing: {},
      decision: {},
      agreement: {},
      handover: {
        status: 'pending',
        completed_at: '2026-05-07T10:00:00.000Z',
        completed_by: 'manager-1',
      },
      activity: [],
    },
  ])) as typeof fetch;

  try {
    const result = await getFastTrackCases();
    const fastTrackCase = result.data?.[0];

    assert.equal(result.error, null);
    assert.equal(fastTrackCase?.workspaceFinalStatus, 'completed');
    assert.equal(fastTrackCase?.stage, 'handover');
    assert.equal(fastTrackCase?.currentStep, 'completed');
    assert.equal(fastTrackCase?.hoursRemaining, 0);
    assert.equal(fastTrackCase?.overdue, false);
    assert.equal(fastTrackCase?.handover.status, 'completed');
    assert.equal(fastTrackCase?.nextAction, 'Review completed case');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fast-track service derives fresh SLA state from timestamps when hours remaining is absent', async () => {
  const originalFetch = globalThis.fetch;
  const submittedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const expiresAt = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

  globalThis.fetch = (async () => buildResponse([
    {
      id: 'case-fresh',
      case_id: 'case-fresh',
      header: {
        property_id: 'property-1',
        property_title: 'Fresh Home',
        property_type: 'Flat',
        client_id: 'user-1',
        client_name: 'Test User',
        submitted_at: submittedAt,
        expires_at: expiresAt,
        overdue: true,
      },
      stage: 'selected',
      final_status: 'active',
      documents: { items: [] },
      viewing: {},
      decision: {},
      agreement: {},
      handover: {},
      activity: [],
    },
  ])) as typeof fetch;

  try {
    const result = await getFastTrackCases();
    const fastTrackCase = result.data?.[0];

    assert.equal(result.error, null);
    assert.equal(fastTrackCase?.workspaceFinalStatus, 'active');
    assert.equal(fastTrackCase?.overdue, false);
    assert.ok((fastTrackCase?.hoursRemaining || 0) > 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('a replacement request without a reason does not show the uploader note as the reviewer note', async () => {
  const originalFetch = globalThis.fetch;
  const item = (overrides: Record<string, unknown>) => ({
    id: 'identity',
    label: 'Identity proof',
    status: 'reupload_needed',
    document_record_id: 'doc-id',
    file_name: 'passport.pdf',
    uploaded_at: '2026-05-07T08:10:00.000Z',
    reviewed_at: '2026-05-07T09:00:00.000Z',
    ...overrides,
  });
  globalThis.fetch = (async () => buildResponse([
    {
      id: 'case-1',
      case_id: 'case-1',
      header: { property_id: 'property-1', client_id: 'user-1', submitted_at: '2026-05-07T08:00:00.000Z', hours_remaining: 20 },
      stage: 'documents',
      final_status: 'active',
      documents: {
        items: [
          // Booking fills the legacy note with the upload note when the review has none.
          item({ upload_note: 'Scanned at the library', note: 'Scanned at the library' }),
          item({ id: 'address', upload_note: 'Scanned at the library', review_note: 'Photo is blurred', note: 'Photo is blurred' }),
          // Legacy record with only the combined note keeps the reviewer note.
          item({ id: 'income', note: 'Please send the latest payslip' }),
        ],
      },
      viewing: {}, decision: {}, agreement: {}, handover: {}, activity: [],
    },
  ])) as typeof fetch;

  try {
    const items = (await getFastTrackCases()).data?.[0]?.documents.items || [];
    assert.equal(items[0]?.reviewNote, undefined);
    assert.equal(items[0]?.uploadNote, 'Scanned at the library');
    assert.equal(items[1]?.reviewNote, 'Photo is blurred');
    assert.equal(items[2]?.reviewNote, 'Please send the latest payslip');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('Fast Track document rows show only the reviewer reason on replacement requests', async () => {
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(`${process.cwd()}/src/components/fast-track/FastTrackWorkspace.tsx`, 'utf8');
  assert.ok(source.includes("const supportingNote = item.status === 'reupload_needed'\n                            ? (item.reviewNote || '')") || source.includes("const supportingNote = item.status === 'reupload_needed'\r\n                            ? (item.reviewNote || '')"));
  assert.match(source, /const helperNote = activeDocument\.status === 'reupload_needed'\s*\? \(activeDocument\.reviewNote \|\| ''\)/);
});
