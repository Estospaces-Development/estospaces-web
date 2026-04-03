export const DELETED_FAST_TRACK_CASE_MESSAGE =
  "This fast-track case was deleted. We removed the stale case link and kept any surviving records open.";

const normalizeCaseId = (value?: string | null) =>
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

  const validCaseIdSet = new Set(
    validCaseIds.map((caseId) => normalizeCaseId(caseId)).filter(Boolean),
  );
  if (validCaseIdSet.has(normalizedRequestedCaseId)) {
    return {
      caseId: normalizedRequestedCaseId,
      removedCaseId: null,
    };
  }

  return {
    caseId: null,
    removedCaseId: normalizedRequestedCaseId,
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
