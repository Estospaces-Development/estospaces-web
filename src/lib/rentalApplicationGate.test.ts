import assert from 'node:assert/strict';
import test from 'node:test';
import type { FastTrackCase } from '@/services/fastTrackService';
import { getRentalApplicationFastTrackBlocker } from './rentalApplicationGate';

const buildCase = (overrides: Partial<FastTrackCase> = {}): FastTrackCase => ({
  id: 'case-1',
  caseId: 'case-1',
  leadId: 'lead-1',
  managerId: 'manager-1',
  propertyId: 'property-1',
  propertyTitle: 'River Flat',
  propertyType: 'rent',
  journeyMode: 'rent',
  journeyType: 'rent',
  stage: 'documents',
  currentStep: 'documents_requested',
  backendCurrentStep: 'documents_requested',
  finalStatus: 'in_progress',
  workspaceFinalStatus: 'active',
  submittedAt: '2026-07-07T00:00:00.000Z',
  hoursRemaining: 18,
  overdue: false,
  documents: {
    identityProof: 'pending',
    addressProof: 'pending',
    items: [],
    allUploaded: false,
    allApproved: false,
  },
  viewing: { status: 'pending' },
  decision: { mode: 'rent', status: 'pending' },
  agreement: { status: 'pending', paymentStatus: 'pending' },
  handover: { status: 'pending' },
  activity: [],
  documentPhase: 'waiting_for_upload',
  ...overrides,
} as FastTrackCase);

test('rental application gate blocks live fast-track cases with pending documents', () => {
  assert.equal(
    getRentalApplicationFastTrackBlocker(buildCase()),
    'Complete Fast Track document verification before submitting a rental application.',
  );
});

test('rental application gate blocks before viewing is complete', () => {
  assert.equal(
    getRentalApplicationFastTrackBlocker(buildCase({
      stage: 'viewing',
      currentStep: 'documents_verified',
      documents: {
        identityProof: 'verified',
        addressProof: 'verified',
        items: [],
        allUploaded: true,
        allApproved: true,
      },
    })),
    'Complete the Fast Track viewing step before submitting a rental application.',
  );
});

test('rental application gate allows application-stage live cases and completed cases', () => {
  assert.equal(
    getRentalApplicationFastTrackBlocker(buildCase({
      stage: 'decision',
      currentStep: 'application_in_review',
      documents: {
        identityProof: 'verified',
        addressProof: 'verified',
        items: [],
        allUploaded: true,
        allApproved: true,
      },
    })),
    null,
  );
  assert.equal(
    getRentalApplicationFastTrackBlocker(buildCase({
      finalStatus: 'completed',
      workspaceFinalStatus: 'completed',
    })),
    null,
  );
});
