import type { Application } from "@/services/applicationsService";
import type { SaleProgression } from "@/services/salesService";
import type { Contract } from "@/types/booking";
import { normalizeContractStatus } from "@/lib/contractStatus";
import { buildWorkspacePath } from "@/lib/workspaceLinks";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/placeholders";
import { formatLaunchCurrency } from "@/lib/launchLocale";

export interface UserPropertyPortfolioItem {
  id: string;
  propertyId: string;
  applicationId?: string;
  contractId?: string;
  fastTrackCaseId?: string;
  leadId?: string;
  listingType: "rent" | "sale";
  ownershipLabel: "Rented" | "Bought";
  portfolioStatus: "Active" | "In Progress" | "Completed";
  propertyTitle: string;
  propertyAddress: string;
  propertyImage: string;
  priceLabel: string;
  statusLabel: string;
  statusSummary: string;
  timelineLabel: string;
  timelineDate: string;
  targetPath: string;
  actionLabel: string;
  sortDate: string;
}

interface BuildUserPropertyPortfolioInput {
  contracts: Contract[];
  applications: Application[];
  saleProgressions: SaleProgression[];
}

const sameId = (left?: string | null, right?: string | null) =>
  Boolean(left && right && left.trim() === right.trim());

const firstString = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const formatMoney = (amount?: number | null, suffix: string = "") => {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "Price unavailable";
  }
  return `${formatLaunchCurrency(amount)}${suffix}`;
};

const sortByMostRecent = <
  T extends {
    updated_at?: string;
    created_at?: string;
    updatedAt?: string;
    createdAt?: string;
  },
>(
  items: T[],
) =>
  [...items].sort((left, right) => {
    const leftStamp = new Date(
      left.updated_at ||
        left.updatedAt ||
        left.created_at ||
        left.createdAt ||
        0,
    ).getTime();
    const rightStamp = new Date(
      right.updated_at ||
        right.updatedAt ||
        right.created_at ||
        right.createdAt ||
        0,
    ).getTime();
    return rightStamp - leftStamp;
  });

const findApplicationForContract = (
  contract: Contract,
  applications: Application[],
) =>
  sortByMostRecent(applications).find(
    (application) =>
      sameId(application.id, contract.application_id) ||
      (application.listing_type !== "sale" &&
        sameId(application.property_id, contract.property_id) &&
        (sameId(application.fast_track_case_id, contract.fast_track_case_id) ||
          sameId(application.lead_id, contract.lead_id) ||
          sameId(application.user_id, contract.user_id))),
  ) || null;

const findApplicationForSaleProgression = (
  progression: SaleProgression,
  applications: Application[],
) =>
  sortByMostRecent(applications).find(
    (application) =>
      application.listing_type === "sale" &&
      (sameId(application.fast_track_case_id, progression.fast_track_case_id) ||
        sameId(application.lead_id, progression.lead_id) ||
        sameId(application.property_id, progression.property_id) ||
        sameId(application.user_id, progression.user_id)),
  ) || null;

const saleProgressionCompleted = (progression: SaleProgression) =>
  progression.status === "completed" ||
  progression.current_stage === "completion";

const toPropertyImage = (value?: string | null) => {
  if (!value) {
    return PROPERTY_PLACEHOLDER_IMAGE;
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && typeof parsed[0] === "string" && parsed[0]) {
      return parsed[0];
    }
  } catch {
    // already a URL
  }

  return value;
};

export const buildUserPropertyPortfolio = ({
  contracts,
  applications,
  saleProgressions,
}: BuildUserPropertyPortfolioInput): UserPropertyPortfolioItem[] => {
  const items: UserPropertyPortfolioItem[] = [];
  const completedSaleKeys = new Set<string>();

  for (const progression of sortByMostRecent(saleProgressions)) {
    if (!saleProgressionCompleted(progression)) {
      continue;
    }

    const application = findApplicationForSaleProgression(
      progression,
      applications,
    );
    const saleKey = firstString(
      application?.id,
      progression.fast_track_case_id,
      progression.lead_id,
      progression.property_id,
      progression.id,
    );
    if (!saleKey || completedSaleKeys.has(saleKey)) {
      continue;
    }
    completedSaleKeys.add(saleKey);

    items.push({
      id: `sale:${progression.id}`,
      propertyId: progression.property_id,
      applicationId: application?.id,
      fastTrackCaseId: progression.fast_track_case_id || undefined,
      leadId: progression.lead_id || undefined,
      listingType: "sale",
      ownershipLabel: "Bought",
      portfolioStatus: "Completed",
      propertyTitle: firstString(
        application?.property_title,
        "Purchased property",
      ),
      propertyAddress: firstString(
        application?.property_address,
        "Address unavailable",
      ),
      propertyImage: toPropertyImage(application?.property_image),
      priceLabel: formatMoney(application?.property_price),
      statusLabel: "Purchase completed",
      statusSummary:
        "This home is now part of your completed purchase portfolio.",
      timelineLabel: "Completed",
      timelineDate: firstString(
        progression.completed_at,
        progression.updated_at,
        application?.updated_at,
        application?.created_at,
      ),
      targetPath: buildWorkspacePath("/user/applications", {
        applicationId: application?.id,
        caseId:
          progression.fast_track_case_id || application?.fast_track_case_id,
        leadId: progression.lead_id || application?.lead_id,
        propertyId: progression.property_id || application?.property_id,
      }),
      actionLabel: "Open purchase details",
      sortDate: firstString(
        progression.completed_at,
        progression.updated_at,
        application?.updated_at,
        application?.created_at,
      ),
    });
  }

  for (const application of sortByMostRecent(applications)) {
    if (
      application.listing_type !== "sale" ||
      application.status !== "completed"
    ) {
      continue;
    }

    const saleKey = firstString(
      application.id,
      application.fast_track_case_id,
      application.lead_id,
      application.property_id,
    );
    if (!saleKey || completedSaleKeys.has(saleKey)) {
      continue;
    }
    completedSaleKeys.add(saleKey);

    items.push({
      id: `sale-app:${application.id}`,
      propertyId: application.property_id,
      applicationId: application.id,
      fastTrackCaseId: application.fast_track_case_id || undefined,
      leadId: application.lead_id || undefined,
      listingType: "sale",
      ownershipLabel: "Bought",
      portfolioStatus: "Completed",
      propertyTitle: firstString(
        application.property_title,
        "Purchased property",
      ),
      propertyAddress: firstString(
        application.property_address,
        "Address unavailable",
      ),
      propertyImage: toPropertyImage(application.property_image),
      priceLabel: formatMoney(application.property_price),
      statusLabel: "Purchase completed",
      statusSummary:
        "This home is now part of your completed purchase portfolio.",
      timelineLabel: "Completed",
      timelineDate: firstString(application.updated_at, application.created_at),
      targetPath: buildWorkspacePath("/user/applications", {
        applicationId: application.id,
        caseId: application.fast_track_case_id,
        leadId: application.lead_id,
        propertyId: application.property_id,
      }),
      actionLabel: "Open purchase details",
      sortDate: firstString(application.updated_at, application.created_at),
    });
  }

  for (const contract of sortByMostRecent(contracts)) {
    const normalizedStatus = normalizeContractStatus(contract.status);
    if (normalizedStatus === "terminated") {
      continue;
    }

    const application = findApplicationForContract(contract, applications);
    const statusLabel =
      normalizedStatus === "active" ? "Rented" : "Rent in progress";
    const statusSummary =
      normalizedStatus === "active"
        ? "Your tenancy is active and this home is available from your portfolio."
        : normalizedStatus === "pending_user_signature"
          ? "Your signature is still required before this tenancy can move forward."
          : normalizedStatus === "pending_manager_signature"
            ? "The tenant has signed and the manager signature is still pending."
            : "The tenancy pack is being prepared before move-in.";

    items.push({
      id: `rent:${contract.id}`,
      propertyId: contract.property_id,
      applicationId: contract.application_id || application?.id,
      contractId: contract.id,
      fastTrackCaseId:
        contract.fast_track_case_id ||
        application?.fast_track_case_id ||
        undefined,
      leadId: contract.lead_id || application?.lead_id || undefined,
      listingType: "rent",
      ownershipLabel: "Rented",
      portfolioStatus: normalizedStatus === "active" ? "Active" : "In Progress",
      propertyTitle: firstString(application?.property_title, "Rental home"),
      propertyAddress: firstString(
        application?.property_address,
        "Address unavailable",
      ),
      propertyImage: toPropertyImage(application?.property_image),
      priceLabel:
        typeof contract.monthly_rent === "number"
          ? formatMoney(contract.monthly_rent, "/mo")
          : formatMoney(application?.property_price, "/mo"),
      statusLabel,
      statusSummary,
      timelineLabel: normalizedStatus === "active" ? "Move-in date" : "Updated",
      timelineDate: firstString(
        contract.start_date,
        contract.updated_at,
        contract.created_at,
      ),
      targetPath: buildWorkspacePath("/user/dashboard/contracts", {
        applicationId: contract.application_id || application?.id,
        contractId: contract.id,
        caseId: contract.fast_track_case_id || application?.fast_track_case_id,
        leadId: contract.lead_id || application?.lead_id,
        propertyId: contract.property_id || application?.property_id,
      }),
      actionLabel:
        normalizedStatus === "active" ? "Open home record" : "Open contract",
      sortDate: firstString(
        contract.updated_at,
        contract.created_at,
        contract.start_date,
      ),
    });
  }

  return items.sort((left, right) => {
    const leftStamp = new Date(left.sortDate || 0).getTime();
    const rightStamp = new Date(right.sortDate || 0).getTime();
    return rightStamp - leftStamp;
  });
};
