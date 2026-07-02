import type { ManagerProfile, VerificationStatus } from "@/services/managerVerificationService";

export type ManagerDashboardAccessState =
  | "loading"
  | "approved"
  | "profile_required"
  | "review_pending"
  | "changes_required";

type ManagerDashboardAccessInput = {
  profile?: Pick<ManagerProfile, "verification_status"> | null;
  verificationStatus?: VerificationStatus | null;
  isLoading?: boolean;
};

export const getManagerDashboardAccessState = ({
  profile = null,
  verificationStatus = null,
  isLoading = false,
}: ManagerDashboardAccessInput): ManagerDashboardAccessState => {
  if (isLoading) {
    return "loading";
  }

  const status = profile?.verification_status || verificationStatus;

  if (status === "approved") {
    return "approved";
  }

  if (!profile || status === "incomplete" || status === "verification_required") {
    return "profile_required";
  }

  if (status === "rejected") {
    return "changes_required";
  }

  return "review_pending";
};

export const canLoadManagerOperationalDashboard = (input: ManagerDashboardAccessInput) => (
  getManagerDashboardAccessState(input) === "approved"
);
