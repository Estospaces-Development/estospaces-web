// Shown for any ?case= link outside the account's journeys. The link may be malformed, never have
// existed, be deleted or belong to someone else; the copy must not say which (MB-0369, MB-0915).
export const DELETED_FAST_TRACK_CASE_MESSAGE =
  "This journey link is not available to your account.";

const normalizeCaseId = (value?: string | null) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const cleanCaseId = (value?: string | null) =>
  typeof value === "string" ? value.trim() : "";

export const sanitizeWorkspaceCaseId = (
  requestedCaseId?: string | null,
  validCaseIds: Array<string | null | undefined> = [],
) => {
  const normalizedRequestedCaseId = normalizeCaseId(requestedCaseId);
  if (!normalizedRequestedCaseId) {
    return {
      caseId: null,
      removedCaseId: null,
    };
  }

  const matchingCaseId = validCaseIds.find((caseId) => (
    normalizeCaseId(caseId) === normalizedRequestedCaseId
  ));
  if (matchingCaseId) {
    return {
      caseId: cleanCaseId(matchingCaseId),
      removedCaseId: null,
    };
  }

  return {
    caseId: null,
    removedCaseId: cleanCaseId(requestedCaseId),
  };
};

export const stripCaseSearchParam = (searchParams: URLSearchParams) => {
  const next = new URLSearchParams(searchParams);
  next.delete("case");
  return next;
};

export interface ExactFastTrackCaseLike {
  caseId: string;
}

export const resolveExactFastTrackCase = <T extends ExactFastTrackCaseLike>(
  cases: T[],
  ...candidateCaseIds: Array<string | null | undefined>
) => {
  const normalizedCandidateIDs = candidateCaseIds
    .map((caseId) => normalizeCaseId(caseId))
    .filter(Boolean);
  if (normalizedCandidateIDs.length === 0) {
    return null;
  }

  return (
    cases.find((caseItem) =>
      normalizedCandidateIDs.includes(normalizeCaseId(caseItem.caseId)),
    ) || null
  );
};
