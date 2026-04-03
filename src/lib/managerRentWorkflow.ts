import type { CaseFileSummary } from "./caseFileDocuments";

export type ManagerRentNextActionId =
  | "request_documents"
  | "upload_for_client"
  | "review_documents"
  | "request_replacement"
  | "open_appointment"
  | "complete_referencing"
  | "complete_right_to_rent"
  | "approve_application"
  | "review_property_readiness"
  | "open_create_contract";

export interface ManagerRentNextAction {
  id: ManagerRentNextActionId;
  label: string;
  title: string;
  description: string;
}

interface ManagerRentNextActionInput {
  applicationStatus?: string | null;
  listingType?: string | null;
  propertyContractReady?: boolean | null;
  caseFileSummary?: Pick<
    CaseFileSummary,
    | "totalRequestCount"
    | "openRequestCount"
    | "pendingReviewCount"
    | "reuploadCount"
  > | null;
  referencingStatus?: string | null;
  rightToRentStatus?: string | null;
}

const normalized = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

const isCompletedWorkflowStatus = (value?: string | null) =>
  normalized(value) === "completed";

const isRightToRentSatisfied = (value?: string | null) => {
  const status = normalized(value);
  return status === "completed" || status === "not_required";
};

export const getManagerRentNextAction = ({
  applicationStatus,
  listingType,
  propertyContractReady,
  caseFileSummary,
  referencingStatus,
  rightToRentStatus,
}: ManagerRentNextActionInput): ManagerRentNextAction | null => {
  if (normalized(listingType) && normalized(listingType) !== "rent") {
    return null;
  }

  const status = normalized(applicationStatus);
  const summary = caseFileSummary || {
    totalRequestCount: 0,
    openRequestCount: 0,
    pendingReviewCount: 0,
    reuploadCount: 0,
  };

  if (summary.totalRequestCount === 0) {
    return {
      id: "request_documents",
      label: "Request documents",
      title: "Start the shared document lane",
      description:
        "Create the checklist items here first so both the manager and the client can work from the same case file.",
    };
  }

  if (summary.reuploadCount > 0) {
    return {
      id: "request_replacement",
      label: "Request replacement",
      title: "A document still needs a corrected upload",
      description:
        "Open the shared case file, review the rejected document, and ask for a clearer or newer replacement.",
    };
  }

  if (summary.pendingReviewCount > 0) {
    return {
      id: "review_documents",
      label: "Review uploaded documents",
      title: "A client file is waiting for review",
      description:
        "Approve the uploaded files or request a replacement so the case can move forward without delay.",
    };
  }

  if (summary.openRequestCount > 0) {
    return {
      id: "upload_for_client",
      label: "Upload for client",
      title: "The checklist is open but the file is still missing",
      description:
        "Upload the document on behalf of the client or open the shared case file and guide them to upload it.",
    };
  }

  if ((status === "approved" || status === "ready_for_contract") && !propertyContractReady) {
    return {
      id: "review_property_readiness",
      label: "Review property readiness",
      title: "The application is approved, but the property pack is not contract-ready",
      description:
        "Open the property page and clear the England compliance blockers before creating the contract or move-in documents.",
    };
  }

  if (status === "approved" || status === "ready_for_contract") {
    return {
      id: "open_create_contract",
      label: "Open/Create contract",
      title: "The tenancy is approved and ready for paperwork",
      description:
        "Open the contract workspace or create the tenancy agreement directly from this application.",
    };
  }

  if (
    isCompletedWorkflowStatus(referencingStatus) &&
    !isRightToRentSatisfied(rightToRentStatus)
  ) {
    const rightToRentInProgress =
      normalized(rightToRentStatus) === "in_progress";
    return {
      id: "complete_right_to_rent",
      label: rightToRentInProgress
        ? "Mark compliance complete"
        : "Start right-to-rent",
      title: "Referencing is clear, but compliance is still pending",
      description:
        "Finish the jurisdiction-specific right-to-rent or equivalent compliance check before approval.",
    };
  }

  if (
    !isCompletedWorkflowStatus(referencingStatus) &&
    (status === "viewing_completed" ||
      status === "referencing" ||
      normalized(referencingStatus) === "in_progress")
  ) {
    const referencingInProgress =
      normalized(referencingStatus) === "in_progress";
    return {
      id: "complete_referencing",
      label: referencingInProgress
        ? "Mark referencing complete"
        : "Start referencing",
      title: "The viewing is done and referencing should start now",
      description:
        "Move the referencing check forward here so the application can reach the approval lane.",
    };
  }

  if (
    isCompletedWorkflowStatus(referencingStatus) &&
    isRightToRentSatisfied(rightToRentStatus)
  ) {
    return {
      id: "approve_application",
      label: "Approve application",
      title: "All rent checks are complete",
      description:
        "The application can now be approved and handed into the contract stage.",
    };
  }

  return {
    id: "open_appointment",
    label: "Open appointment",
    title: "Documents are clear and the case can move to the viewing stage",
    description:
      "Open the appointments workspace to schedule or manage the next viewing step for this rent journey.",
  };
};
