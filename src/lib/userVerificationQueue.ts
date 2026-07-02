import type { UserVerificationInfo } from "@/services/userVerificationService";

export type UserVerificationQueueTab =
  | "all"
  | "pending"
  | "review"
  | "approved";

export type UserVerificationWorkflowStatus =
  | "pending"
  | "review"
  | "approved";

export const hasUploadedVerificationDocuments = (
  user: Pick<
    UserVerificationInfo,
    | "documents_uploaded"
    | "has_identity_doc"
    | "has_address_doc"
    | "has_financial_doc"
  >,
) =>
  Boolean(
    user.documents_uploaded ||
      user.has_identity_doc ||
      user.has_address_doc ||
      user.has_financial_doc,
  );

export const hasPendingVerificationDocuments = (
  user: Pick<
    UserVerificationInfo,
    | "documents_uploaded"
    | "documents_verified"
    | "has_identity_doc"
    | "has_address_doc"
    | "has_financial_doc"
  >,
) => hasUploadedVerificationDocuments(user) && !user.documents_verified;

export const isUnverifiedUser = (
  user: Pick<UserVerificationInfo, "verification_level">,
) => user.verification_level === "basic";

export const getUserVerificationWorkflowStatus = (
  user: Pick<
    UserVerificationInfo,
    | "verification_level"
    | "documents_uploaded"
    | "documents_verified"
    | "has_identity_doc"
    | "has_address_doc"
    | "has_financial_doc"
  >,
): UserVerificationWorkflowStatus => {
  if (
    user.verification_level === "verified" ||
    user.verification_level === "fully_verified"
  ) {
    return "approved";
  }

  if (hasPendingVerificationDocuments(user)) {
    return "review";
  }

  return "pending";
};

export const getUserVerificationWorkflowStatusLabel = (
  status: UserVerificationWorkflowStatus,
) => {
  switch (status) {
    case "approved":
      return "Approved";
    case "review":
      return "In Review";
    default:
      return "Pending";
  }
};

export const getUserVerificationQueueStats = (
  users: UserVerificationInfo[],
) => ({
  all: users.length,
  pending: users.filter(
    (user) => getUserVerificationWorkflowStatus(user) === "pending",
  ).length,
  inReview: users.filter(
    (user) => getUserVerificationWorkflowStatus(user) === "review",
  ).length,
  approved: users.filter(
    (user) => getUserVerificationWorkflowStatus(user) === "approved",
  ).length,
});

export const userMatchesVerificationTab = (
  user: UserVerificationInfo,
  activeTab: UserVerificationQueueTab,
) => {
  if (activeTab !== "all") {
    return getUserVerificationWorkflowStatus(user) === activeTab;
  }

  return true;
};
