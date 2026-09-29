export type ManagerPropertyPendingAction = "draft" | "submit" | null;

interface ManagerPropertyActionLabelInput {
  mode: "create" | "edit";
  status: string;
  pendingAction: ManagerPropertyPendingAction;
}

/**
 * Only the button the manager pressed shows a progress label. The other
 * button is disabled while the save runs but keeps its normal label.
 */
export const getManagerPropertyActionLabels = ({
  mode,
  status,
  pendingAction,
}: ManagerPropertyActionLabelInput): { draftLabel: string; primaryLabel: string } => {
  const isSubmission = mode === "create" || status === "draft" || status === "rejected";
  const primaryIdleLabel = mode === "edit" && !isSubmission
    ? "Save Property"
    : status === "rejected" && mode === "edit"
      ? "Resubmit for Approval"
      : "Submit for Approval";
  const primaryPendingLabel = isSubmission ? "Submitting..." : "Saving...";

  return {
    draftLabel: pendingAction === "draft" ? "Saving..." : "Save Draft",
    primaryLabel: pendingAction === "submit" ? primaryPendingLabel : primaryIdleLabel,
  };
};
