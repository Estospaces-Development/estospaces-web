import { resolveWorkspaceSection, type WorkspaceSection } from "@/lib/liveCaseWorkspace";
import {
  isSaleProgressionRecord,
  resolveSaleJourneyDisplayStage,
} from "@/lib/saleJourney";

export type ManagerApplicationTab = "overview" | "documents" | "history";

export type ManagerApplicationOverviewFocus = "journey" | "messages" | null;

type ManagerApplicationRecordLike = {
  source?: string;
  status?: string | null;
  listingType?: string | null;
  listing_type?: string | null;
};

const terminalApplicationStatuses = new Set([
  "approved",
  "rejected",
  "withdrawn",
  "completed",
]);

const normalizeStatus = (application?: ManagerApplicationRecordLike | null) =>
  String(application?.status || "").trim();

const normalizeListingType = (application?: ManagerApplicationRecordLike | null) =>
  String(application?.listingType || application?.listing_type || "").trim().toLowerCase();

const isTerminalApplication = (application?: ManagerApplicationRecordLike | null) =>
  terminalApplicationStatuses.has(normalizeStatus(application));

const isPurchaseApplication = (application?: ManagerApplicationRecordLike | null) =>
  ["sale", "buy", "purchase"].includes(normalizeListingType(application));

export const resolveManagerApplicationTab = (
  section?: string | null,
): ManagerApplicationTab => {
  switch (resolveWorkspaceSection(section, "overview")) {
    case "documents":
      return "documents";
    case "activity":
      return "history";
    default:
      return "overview";
  }
};

export const resolveManagerApplicationOverviewFocus = (
  section?: string | null,
): ManagerApplicationOverviewFocus => {
  const resolvedSection = resolveWorkspaceSection(section, "overview");
  if (resolvedSection === "journey" || resolvedSection === "messages") {
    return resolvedSection;
  }

  return null;
};

export const resolveCaseFileRequestedSection = (
  section?: WorkspaceSection | null,
): WorkspaceSection | null => (section === "documents" ? "documents" : null);

export const shouldShowManagerDecisionControls = (
  application?: ManagerApplicationRecordLike | null,
) => Boolean(
  application &&
  !isSaleProgressionRecord(application) &&
  !isTerminalApplication(application),
);

export const shouldShowManagerWithdrawControl = (
  _application?: ManagerApplicationRecordLike | null,
) => false;

export const shouldShowManagerManagedPurchaseWorkspace = (
  application?: ManagerApplicationRecordLike | null,
) => {
  if (
    !application ||
    isSaleProgressionRecord(application) ||
    isTerminalApplication(application) ||
    !isPurchaseApplication(application)
  ) {
    return false;
  }

  const displayStage = resolveSaleJourneyDisplayStage(application);
  return displayStage === "viewing_completed" ||
    displayStage === "buyer_qualification" ||
    displayStage === "offer";
};

/**
 * The header Approve mirrors the rent workflow's own Approve button: a
 * tenancy cannot be approved until referencing and the jurisdiction checks are
 * complete. Sale applications have no client-side equivalent, so the server
 * decides and this returns null.
 */
export const getHeaderApproveBlockedReason = ({
  isRentApplication,
  rentApprovalReady,
}: {
  isRentApplication: boolean;
  rentApprovalReady: boolean;
}): string | null => (
  isRentApplication && !rentApprovalReady
    ? "Complete the referencing and compliance checks before approving."
    : null
);

const KNOWN_STATUS_ERRORS: Array<[RegExp, string]> = [
  [
    /^cannot approve the sale application until buyer qualification and aml checks are complete/i,
    "This sale application can't be approved yet. Complete the buyer qualification and AML checks first.",
  ],
  [
    /^cannot approve the tenancy application until referencing and jurisdiction-specific checks are complete/i,
    "This tenancy application can't be approved yet. Complete the referencing and compliance checks first.",
  ],
];

/** Backend status refusals arrive as raw lowercase text; show them as sentences. */
export const formatApplicationStatusError = (message?: string | null): string => {
  const text = String(message ?? "").trim();
  if (!text) {
    return "Failed to update the application status.";
  }
  const known = KNOWN_STATUS_ERRORS.find(([pattern]) => pattern.test(text));
  if (known) {
    return known[1];
  }
  const sentence = text.charAt(0).toUpperCase() + text.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
};
