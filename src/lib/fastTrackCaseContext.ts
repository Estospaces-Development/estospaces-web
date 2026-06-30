export const DELETED_FAST_TRACK_CASE_MESSAGE =
  "This fast-track case was deleted. We removed the stale case link and kept any surviving records open.";

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
