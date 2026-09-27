import test from 'node:test';
import assert from 'node:assert/strict';

import { createFastTrackCase, getFastTrackCaseById, isReusedFastTrackStart } from './fastTrackService';
import { describeRequestEntryJourney } from '@/lib/existingFastTrackJourney';

const buildCreatedResponse = (payload: unknown) => ({
  ok: true,
  status: 201,
  text: async () => JSON.stringify({ success: true, data: payload }),
}) as Response;

const withFetch = async (payload: unknown, run: () => Promise<void>) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => buildCreatedResponse(payload)) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
  }
};

const startRequest = {
  property_id: 'property-1',
  lead_id: 'lead-new',
  client_id: 'user-1',
  client_name: 'Test User',
  property_title: 'Test Home',
  property_type: 'rent',
};

const workspaceCase = (overrides: Record<string, unknown> = {}) => ({
  id: 'case-1',
  case_id: 'case-1',
  header: {
    property_id: 'property-1',
    property_title: 'Test Home',
    property_type: 'rent',
    listing_type: 'rent',
    client_id: 'user-1',
    client_name: 'Test User',
    lead_id: 'lead-original',
    submitted_at: new Date().toISOString(),
    hours_remaining: 24,
  },
  stage: 'selected',
  final_status: 'active',
  documents: { items: [] },
  viewing: {},
  decision: {},
  agreement: {},
  handover: {},
  activity: [],
  ...overrides,
});

test('start response with reused=true is reported as an existing case with the unlinked lead', async () => {
  await withFetch(workspaceCase({ reused: true, requested_lead_id: 'lead-new' }), async () => {
    const result = await createFastTrackCase(startRequest);
    assert.equal(result.error, null);
    assert.equal(result.data?.caseId, 'case-1');
    assert.equal(result.data?.leadId, 'lead-original');
    assert.equal(result.reused, true);
    assert.equal(result.requestedLeadId, 'lead-new');
  });
});

test('start response with reused=false is reported as a new case even for an old-looking timestamp', async () => {
  await withFetch(workspaceCase({
    reused: false,
    requested_lead_id: 'lead-ignored',
    header: { ...workspaceCase().header, submitted_at: '2026-07-02T10:00:00Z' },
  }), async () => {
    const result = await createFastTrackCase(startRequest);
    assert.equal(result.reused, false);
    assert.equal(result.requestedLeadId, undefined);
  });
});

test('older backend without reused flag: an old case is still reported as reused', async () => {
  await withFetch(workspaceCase({
    header: { ...workspaceCase().header, submitted_at: '2026-07-02T10:00:00Z', hours_remaining: 0, overdue: true },
  }), async () => {
    const result = await createFastTrackCase(startRequest);
    assert.equal(result.error, null);
    assert.equal(result.reused, true);
  });
});

test('older backend without reused flag: a just-submitted case is reported as created', async () => {
  await withFetch(workspaceCase(), async () => {
    const result = await createFastTrackCase(startRequest);
    assert.equal(result.reused, false);
  });
});

test('legacy start response without header maps without throwing (QA-MB-20260926-01-020)', async () => {
  // Shape previously returned by the linked broker-selection reuse path: the
  // stored case, with identity and timing at the top level and no header.
  await withFetch({
    id: 'case-legacy',
    property_id: 'property-1',
    property_title: 'Legacy Home',
    property_type: 'rent',
    listing_type: 'rent',
    client_id: 'user-1',
    client_name: 'Test User',
    lead_id: 'lead-original',
    broker_request_id: 'request-1',
    started_from: 'broker_request_selection',
    current_step: 'documents_requested',
    final_status: 'in_progress',
    documents: { identityProof: 'pending', addressProof: 'pending' },
    submitted_at: '2026-07-02T10:00:00Z',
    expires_at: '2026-07-03T10:00:00Z',
    hours_remaining: 0,
  }, async () => {
    const result = await createFastTrackCase(startRequest);
    assert.equal(result.error, null);
    assert.equal(result.data?.caseId, 'case-legacy');
    assert.equal(result.data?.propertyId, 'property-1');
    assert.equal(result.data?.clientId, 'user-1');
    assert.equal(result.data?.leadId, 'lead-original');
    assert.equal(result.data?.brokerRequestId, 'request-1');
    assert.equal(result.data?.submittedAt, '2026-07-02T10:00:00Z');
    assert.equal(result.data?.workspaceFinalStatus, 'active');
    assert.equal(result.reused, true);
  });
});

test('case mapper tolerates a response missing every optional section', async () => {
  await withFetch({ id: 'case-minimal' }, async () => {
    const result = await getFastTrackCaseById('case-minimal');
    assert.equal(result.error, null);
    assert.equal(result.data?.caseId, 'case-minimal');
    assert.equal(result.data?.submittedAt, '');
    assert.equal(result.data?.propertyId, '');
    assert.deepEqual(result.data?.documents.items, []);
    assert.equal(result.data?.viewing.status, 'pending');
    assert.equal(result.data?.handover.status, 'pending');
  });
});

test('reuse detection prefers the server flag and falls back to case age', () => {
  const now = Date.parse('2026-09-27T12:00:00Z');
  assert.equal(isReusedFastTrackStart({ reused: true }, { submittedAt: '2026-09-27T12:00:00Z' }, now), true);
  assert.equal(isReusedFastTrackStart({ reused: false }, { submittedAt: '2026-07-02T10:00:00Z' }, now), false);
  assert.equal(isReusedFastTrackStart({}, { submittedAt: '2026-09-27T11:50:00Z' }, now), true);
  assert.equal(isReusedFastTrackStart({}, { submittedAt: '2026-09-27T11:58:00Z' }, now), false);
  assert.equal(isReusedFastTrackStart({}, { submittedAt: '' }, now), false);
});

test('legacy expired final status maps to an active case, as the backend still reuses it', async () => {
  await withFetch(workspaceCase({ final_status: 'expired' }), async () => {
    const result = await getFastTrackCaseById('case-1');
    assert.equal(result.data?.workspaceFinalStatus, 'active');
    assert.equal(result.data?.finalStatus, 'in_progress');
  });
});

test('raw closed backend statuses map to a closed or completed journey, never a live one', async () => {
  const expectations: Array<[string, string, string]> = [
    ['rejected', 'closed', 'View closed 24-hour journey'],
    ['cancelled', 'closed', 'View closed 24-hour journey'],
    ['completed', 'completed', 'View completed 24-hour journey'],
  ];
  for (const [rawStatus, state, actionLabel] of expectations) {
    await withFetch(workspaceCase({ final_status: rawStatus, broker_request_id: 'request-1' }), async () => {
      const result = await getFastTrackCaseById('case-1');
      assert.ok(result.data, rawStatus);
      const described = describeRequestEntryJourney(result.data, { brokerRequestId: 'request-1' });
      assert.equal(described.state, state, rawStatus);
      assert.equal(described.actionLabel, actionLabel, rawStatus);
      assert.doesNotMatch(described.text, /no new 24-hour clock|existing journey/i, rawStatus);
    });
  }
});
