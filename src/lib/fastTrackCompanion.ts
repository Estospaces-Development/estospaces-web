import { buildWorkspacePath, type WorkspaceLinkOptions } from "@/lib/workspaceLinks";
import {
  performFastTrackAction,
  type FastTrackActionRequest,
  type FastTrackCase,
} from "@/services/fastTrackService";
import {
  WORKSPACE_SYNC_TAGS,
  type PublishWorkspaceSyncInput,
} from "@/lib/workspaceSync";

export type FastTrackCompanionRole = "manager" | "user";

export interface FastTrackCompanionContext extends WorkspaceLinkOptions {
  fastTrackCaseId?: string | null;
}

export interface FastTrackLinkableRecord {
  id: string;
  source?: string;
  propertyId?: string | null;
  leadId?: string | null;
  fastTrackCaseId?: string | null;
  liveStage?: string;
  stageGroup?: string;
  journeyLabel?: string;
  journeyStatusReason?: string;
  journeySummary?: string;
  fastTrackCase?: FastTrackCase;
}

export const FAST_TRACK_COMPANION_SYNC_TAGS = [
  WORKSPACE_SYNC_TAGS.FAST_TRACK,
  WORKSPACE_SYNC_TAGS.APPLICATIONS,
  WORKSPACE_SYNC_TAGS.VIEWINGS,
  WORKSPACE_SYNC_TAGS.CONTRACTS,
  WORKSPACE_SYNC_TAGS.PAYMENTS,
];

const normalizeId = (value?: string | null) => String(value || "").trim();

const sameId = (left?: string | null, right?: string | null) => {
  const normalizedLeft = normalizeId(left);
  const normalizedRight = normalizeId(right);
  return normalizedLeft !== "" && normalizedLeft === normalizedRight;
};

export const findLinkedFastTrackCase = (
  cases: FastTrackCase[],
  context: FastTrackCompanionContext,
) => {
  const caseId = normalizeId(context.caseId) || normalizeId(context.fastTrackCaseId);
  if (caseId) {
    const exactMatch = cases.find(
      (caseItem) => sameId(caseItem.caseId, caseId) || sameId(caseItem.id, caseId),
    );
    if (exactMatch) {
      return exactMatch;
    }
  }

  const applicationId = normalizeId(context.applicationId);
  if (applicationId) {
    const applicationMatch = cases.find((caseItem) =>
      sameId(caseItem.applicationId, applicationId),
    );
    if (applicationMatch) {
      return applicationMatch;
    }
  }

  const viewingId = normalizeId(context.viewingId);
  if (viewingId) {
    const viewingMatch = cases.find((caseItem) =>
      sameId(caseItem.viewingId, viewingId),
    );
    if (viewingMatch) {
      return viewingMatch;
    }
  }

  const contractId = normalizeId(context.contractId);
  if (contractId) {
    const contractMatch = cases.find((caseItem) =>
      sameId(caseItem.contractId, contractId),
    );
    if (contractMatch) {
      return contractMatch;
    }
  }

  const leadId = normalizeId(context.leadId);
  if (leadId) {
    const leadMatch = cases.find((caseItem) => sameId(caseItem.leadId, leadId));
    if (leadMatch) {
      return leadMatch;
    }
  }

  const propertyId = normalizeId(context.propertyId);
  if (propertyId) {
    const propertyMatch = cases.find((caseItem) =>
      sameId(caseItem.propertyId, propertyId),
    );
    if (propertyMatch) {
      return propertyMatch;
    }
  }

  return null;
};

export const buildFastTrackCompanionWorkspacePath = (
  role: FastTrackCompanionRole,
  fastTrackCase: FastTrackCase,
  context: FastTrackCompanionContext = {},
) =>
  buildWorkspacePath(
    role === "manager" ? "/manager/fast-track" : "/user/dashboard/fast-track",
    {
      ...context,
      caseId: fastTrackCase.caseId,
      leadId: context.leadId || fastTrackCase.leadId,
      propertyId: context.propertyId || fastTrackCase.propertyId,
      applicationId: context.applicationId || fastTrackCase.applicationId,
      viewingId: context.viewingId || fastTrackCase.viewingId,
      contractId: context.contractId || fastTrackCase.contractId,
    },
  );

export const applicationStatusToFastTrackDecisionOutcome = (status: string) => {
  switch (String(status || "").trim()) {
    case "approved":
    case "offer_accepted":
    case "sale_agreed":
    case "completed":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return null;
  }
};

export const describeFastTrackStageLabel = (fastTrackCase: FastTrackCase) => {
  switch (fastTrackCase.stage) {
    case "documents":
      return "Documents";
    case "viewing":
      return "Viewing";
    case "decision":
      return fastTrackCase.journeyMode === "sale" ? "Offer Decision" : "Application Decision";
    case "agreement":
      return "Agreement";
    case "handover":
      return "Handover";
    default:
      return "Selected";
  }
};

export const describeFastTrackCompanionSummary = (fastTrackCase: FastTrackCase) =>
  fastTrackCase.statusReason ||
  fastTrackCase.nextAction ||
  `This linked case is currently in ${describeFastTrackStageLabel(fastTrackCase).toLowerCase()}.`;

export const attachLinkedFastTrackCase = <T extends FastTrackLinkableRecord>(
  record: T,
  cases: FastTrackCase[],
): T => {
  const linkedFastTrackCase =
    record.fastTrackCase ||
    findLinkedFastTrackCase(cases, {
      applicationId: record.source === "sale_progression" ? undefined : record.id,
      caseId: record.fastTrackCaseId,
      fastTrackCaseId: record.fastTrackCaseId,
      leadId: record.leadId,
      propertyId: record.propertyId,
    });

  if (!linkedFastTrackCase) {
    return record;
  }

  return {
    ...record,
    fastTrackCase: linkedFastTrackCase,
    fastTrackCaseId: linkedFastTrackCase.caseId,
    liveStage: linkedFastTrackCase.stage,
    stageGroup: linkedFastTrackCase.stage,
    journeyLabel: describeFastTrackStageLabel(linkedFastTrackCase),
    journeyStatusReason:
      linkedFastTrackCase.statusReason || record.journeyStatusReason,
    journeySummary:
      linkedFastTrackCase.nextAction ||
      linkedFastTrackCase.statusReason ||
      record.journeySummary,
  };
};

export const syncFastTrackCompanionAction = async ({
  fastTrackCase,
  request,
  publishWorkspaceSync,
  reason,
  tags = FAST_TRACK_COMPANION_SYNC_TAGS,
}: {
  fastTrackCase: FastTrackCase;
  request: FastTrackActionRequest;
  publishWorkspaceSync?: (input: PublishWorkspaceSyncInput) => unknown;
  reason: string;
  tags?: string[];
}) => {
  const result = await performFastTrackAction(
    fastTrackCase.id,
    request,
    { suppressErrorToast: true },
  );

  if (!result.error && result.data && publishWorkspaceSync) {
    publishWorkspaceSync({
      source: "mutation",
      tags,
      reason,
      ids: {
        caseId: result.data.caseId,
        applicationId: result.data.applicationId,
        viewingId: result.data.viewingId,
        contractId: result.data.contractId,
        paymentId: result.data.paymentId,
        leadId: result.data.leadId,
        propertyId: result.data.propertyId,
      },
    });
  }

  return result;
};
