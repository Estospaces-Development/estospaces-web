import test from 'node:test';
import assert from 'node:assert/strict';

import { getFastTrackCaseById, getFastTrackCases } from './fastTrackService';

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
