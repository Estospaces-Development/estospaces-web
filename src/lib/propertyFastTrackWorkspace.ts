import type { FastTrackCase } from "@/services/fastTrackService";
import type { Lead, UserDocument } from "@/services/leadsService";
import { isLeadActive, resolveLeadStage } from "@/lib/fastTrackWorkflow";

const formatPanelLabel = (value?: string) => {
  if (!value) {
    return "Matching nearby brokers";
  }

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatLeadMinutesRemaining = (deadline?: string) => {
  if (!deadline) {
    return "10-minute live response";
  }

  const remainingMs = new Date(deadline).getTime() - Date.now();
  if (!Number.isFinite(remainingMs)) {
    return "10-minute live response";
  }

  const minutes = Math.max(Math.ceil(remainingMs / 60000), 0);
  if (minutes === 0) {
    return "Response window ending now";
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"} left`;
};

const formatCaseHoursRemaining = (hoursRemaining?: number) => {
  if (!Number.isFinite(hoursRemaining)) {
    return "24-hour workspace is live";
  }

  if ((hoursRemaining || 0) <= 0) {
    return "Needs attention";
  }

  return `${hoursRemaining}h left`;
};

const isLiveFastTrackCase = (fastTrackCase: FastTrackCase | null | undefined) => (
  Boolean(fastTrackCase)
  && (
    fastTrackCase?.workspaceFinalStatus === "active"
    || fastTrackCase?.finalStatus === "in_progress"
  )
);

const isOpenLead = (lead: Lead | null | undefined) => (
  isLeadActive(lead)
  && String(lead?.status || "").trim().toLowerCase() !== "expired"
  && resolveLeadStage(lead) !== "expired"
);

export interface PropertyFastTrackWorkspaceSelectionInput {
  propertyLeads: Lead[];
  propertyCases: FastTrackCase[];
  requestedCaseId: string | null;
  brokerRequestQuery: string | null;
}

export const resolvePropertyFastTrackWorkspaceSelection = ({
  propertyLeads,
  propertyCases,
  requestedCaseId,
  brokerRequestQuery,
}: PropertyFastTrackWorkspaceSelectionInput) => {
  const matchingCase = (
    propertyCases.find((fastTrackCase) => requestedCaseId && fastTrackCase.caseId === requestedCaseId)
    || propertyCases.find((fastTrackCase) => (
      brokerRequestQuery
      && fastTrackCase.brokerRequestId === brokerRequestQuery
      && isLiveFastTrackCase(fastTrackCase)
    ))
    || propertyCases.find((fastTrackCase) => isLiveFastTrackCase(fastTrackCase))
    || propertyCases[0]
    || null
  );
  const caseLead = matchingCase?.leadId
    ? propertyLeads.find((lead) => lead.id === matchingCase.leadId) || null
    : null;
  const matchingLead = (
    propertyLeads.find((lead) => (
      brokerRequestQuery
      && lead.broker_request_id === brokerRequestQuery
      && isOpenLead(lead)
    ))
    || (isLiveFastTrackCase(matchingCase) ? caseLead : null)
    || propertyLeads.find((lead) => isOpenLead(lead))
    || caseLead
    || propertyLeads[0]
    || null
  );

  return {
    lead: matchingLead,
    fastTrackCase: matchingCase,
  };
};

export const resolvePropertyFastTrackPanelLabels = (
  activeLead: Lead | null,
  leadScopedDocuments: UserDocument[],
  activeFastTrackCase: FastTrackCase | null,
) => {
  if (isLiveFastTrackCase(activeFastTrackCase)) {
    return {
      stage: formatPanelLabel(activeFastTrackCase?.stage),
      deadline: formatCaseHoursRemaining(activeFastTrackCase?.hoursRemaining),
    };
  }

  return {
    stage: formatPanelLabel(resolveLeadStage(activeLead, leadScopedDocuments)),
    deadline: formatLeadMinutesRemaining(activeLead?.response_deadline_at || activeLead?.sla_deadline),
  };
};
