import type { UserVerificationInfo } from "@/services/userVerificationService";

export type UserVerificationQueueTab =
  | "all"
  | "unverified"
  | "pending_docs"
  | "verified";

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

export const getUserVerificationQueueStats = (
  users: UserVerificationInfo[],
) => ({
  all: users.length,
  unverified: users.filter(isUnverifiedUser).length,
  pendingDocs: users.filter(hasPendingVerificationDocuments).length,
  verified: users.filter(
    (user) =>
      user.verification_level === "verified" ||
      user.verification_level === "fully_verified",
  ).length,
});

export const userMatchesVerificationTab = (
  user: UserVerificationInfo,
  activeTab: UserVerificationQueueTab,
) => {
  if (activeTab === "unverified") {
    return isUnverifiedUser(user);
  }
  if (activeTab === "pending_docs") {
    return hasPendingVerificationDocuments(user);
  }
  if (activeTab === "verified") {
    return (
      user.verification_level === "verified" ||
      user.verification_level === "fully_verified"
    );
  }
  return true;
};
