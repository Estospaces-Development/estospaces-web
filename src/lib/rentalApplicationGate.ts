import type { FastTrackCase } from '@/services/fastTrackService';
import { isLiveFastTrackCase } from '@/lib/propertyFastTrackWorkspace';

const APPLICATION_READY_STAGES = new Set(['decision', 'agreement', 'handover']);
const VERIFIED_DOCUMENT_STATUSES = new Set(['verified', 'approved']);

const hasVerifiedRequiredDocuments = (fastTrackCase: FastTrackCase) => (
  Boolean(fastTrackCase.documents?.allApproved)
  || (
    VERIFIED_DOCUMENT_STATUSES.has(String(fastTrackCase.documents?.identityProof || '').trim().toLowerCase())
    && VERIFIED_DOCUMENT_STATUSES.has(String(fastTrackCase.documents?.addressProof || '').trim().toLowerCase())
  )
);

export const getRentalApplicationFastTrackBlocker = (fastTrackCase: FastTrackCase | null | undefined) => {
  if (!fastTrackCase || !isLiveFastTrackCase(fastTrackCase)) {
    return null;
  }

  if (!hasVerifiedRequiredDocuments(fastTrackCase)) {
    return 'Complete Fast Track document verification before submitting a rental application.';
  }

  if (!APPLICATION_READY_STAGES.has(fastTrackCase.stage)) {
    return 'Complete the Fast Track viewing step before submitting a rental application.';
  }

  return null;
};
