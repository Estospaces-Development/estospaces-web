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
