import type { CaseFileSummary } from "./caseFileDocuments";

type CaseFileLaneState =
  | "waiting_for_documents"
  | "waiting_for_manager_review"
  | "waiting_for_updated_document"
  | "ready_for_next_step";

interface CaseFileRequestStatusLike {
  status?: string | null;
}

const normalizedStatus = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

export const getCaseFileLaneState = (
  summary: Pick<
    CaseFileSummary,
    "openRequestCount" | "pendingReviewCount" | "reuploadCount"
  >,
  requests: CaseFileRequestStatusLike[] = [],
): CaseFileLaneState => {
  const requestStatuses = requests.map((request) =>
    normalizedStatus(request.status),
  );

  if (
    requestStatuses.some(
      (status) =>
        status === "reupload_requested" || status === "reupload_required",
    ) ||
    summary.reuploadCount > 0
  ) {
    return "waiting_for_updated_document";
  }

  if (
    requestStatuses.some(
      (status) => status === "uploaded" || status === "under_review",
    ) ||
    summary.pendingReviewCount > 0
  ) {
    return "waiting_for_manager_review";
  }

  if (
    requestStatuses.some((status) => status === "requested") ||
    summary.openRequestCount > 0
  ) {
    return "waiting_for_documents";
  }

  return "ready_for_next_step";
};

export const getCaseFileWaitingCopy = (
  summary: Pick<
    CaseFileSummary,
    "openRequestCount" | "pendingReviewCount" | "reuploadCount"
  >,
  requests: CaseFileRequestStatusLike[] = [],
) => {
  switch (getCaseFileLaneState(summary, requests)) {
    case "waiting_for_updated_document":
      return {
        waitingOn: "Waiting for updated document",
        explanation:
          "At least one document needs a clearer or newer replacement before the case can continue.",
      };
    case "waiting_for_manager_review":
      return {
        waitingOn: "Waiting for manager review",
        explanation:
          "A file has been uploaded and is now waiting for manager review inside this shared case file.",
      };
    case "waiting_for_documents":
      return {
        waitingOn: "Waiting for documents",
        explanation:
          "There are still open checklist items that need a fresh upload or a reusable-file link.",
      };
    default:
      return {
        waitingOn: "Ready for next workflow step",
        explanation:
          "The document lane is clear, so the manager can move the case into the next operational step.",
      };
  }
};
