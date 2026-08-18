import type { BrokerRequestRecord, Lead } from "@/services/leadsService";
import { getLeadDeadline, resolveLeadStage, type LeadLike } from "./fastTrackWorkflow";

export type ManagerLeadSortMode = "newest" | "client_az" | "budget_desc" | "score_desc";

export interface ManagerLeadListItem {
  created_at?: string;
  name?: string;
  email?: string;
  budget?: string;
  score?: number;
}

export interface ManagerLeadSummaryItem extends ManagerLeadListItem, LeadLike {
  sla_remaining_seconds?: number;
  viewing_scheduled?: boolean;
}

export interface ManagerLeadVisibilityItem extends ManagerLeadSummaryItem {
  id?: string;
  lead_number?: string;
  user_id?: string;
  broker_id?: string;
  matched_broker_id?: string;
  property_name?: string;
  propertyInterested?: string;
  broker_request_id?: string;
  source?: string;
  journey_source?: string;
  fast_track_enabled?: boolean;
  documents_requested?: boolean;
  documents_uploaded?: boolean;
  documents_verified?: boolean;
  notes?: string;
  property?: {
    title?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
  };
}

export interface ManagerLeadWorkspaceCase {
  id?: string;
  caseId?: string;
  leadId?: string;
  brokerRequestId?: string;
  propertyId?: string;
  workspaceFinalStatus?: string;
  finalStatus?: string;
}

export interface ManagerLeadSummary {
  total: number;
  awaitingResponse: number;
  documentsQueue: number;
  viewingScheduled: number;
  breached: number;
}

export interface ManagerLeadOperationalState {
  isBreached: boolean;
  requiresEscalation: boolean;
  statusLabel: string;
  showResponseCountdown: boolean;
}

const LIVE_PROCESSING_STAGES = new Set([
  "matching",
  "broker_matched",
  "docs_requested",
  "docs_uploaded",
  "under_review",
  "approved",
  "viewing_scheduled",
]);

const DOCUMENT_QUEUE_STAGES = new Set([
  "docs_requested",
  "docs_uploaded",
  "under_review",
  "approved",
]);

const CLOSED_MANAGER_LEAD_STATUSES = new Set(["closed_won", "closed_lost", "cancelled"]);
const CLOSED_MANAGER_LEAD_STAGES = new Set(["completed", "expired", "rejected", "withdrawn"]);

const INTERNAL_AUTOMATION_TEXT_PATTERNS = [
  /\bqa\b/i,
  /\bcodex\b/i,
  /\bdev smoke\b/i,
  /\bsmoke test\b/i,
  /\be2e\b/i,
  /\bissue\d+\b/i,
  /\bmobile-live-\d+\b/i,
  /\bmobile live approval\b/i,
  /\btest\b/i,
] as const;

const RAW_AUTOMATION_TIMESTAMP_PATTERNS = [
  /\b20\d{12}\b/,
  /\b20\d{2}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}-\d{3}z\b/i,
  /\b1\d{12,}\b/,
] as const;

const parseBudgetAmount = (value?: string) => {
  const normalized = String(value || "").replace(/,/g, "");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
};

const getClientLabel = (lead: ManagerLeadListItem) => (
  String(lead.name || lead.email || "").trim().toLowerCase()
);

const getCreatedAt = (lead: ManagerLeadListItem) => {
  const timestamp = new Date(lead.created_at || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const normalizeStage = (value?: string) => String(value || "").trim().toLowerCase();

const getManagerLeadVisibilityText = (lead: ManagerLeadVisibilityItem) => [
  lead.id,
  lead.broker_request_id,
  lead.property?.title,
  lead.property_name,
  lead.propertyInterested,
  lead.notes,
  lead.source,
  lead.journey_source,
].filter(Boolean).join(" ");

export const isInternalAutomationManagerLead = (lead: ManagerLeadVisibilityItem) => {
  const searchableText = getManagerLeadVisibilityText(lead);

  return INTERNAL_AUTOMATION_TEXT_PATTERNS.some((pattern) => pattern.test(searchableText))
    || RAW_AUTOMATION_TIMESTAMP_PATTERNS.some((pattern) => pattern.test(searchableText));
};

export const filterVisibleManagerLeads = <T extends ManagerLeadVisibilityItem>(
  leads: readonly T[],
) => leads.filter((lead) => !isInternalAutomationManagerLead(lead));

const sameManagerLeadId = (left?: string, right?: string) => {
  const normalizedLeft = String(left || "").trim();
  const normalizedRight = String(right || "").trim();
  return normalizedLeft !== "" && normalizedLeft === normalizedRight;
};

const getBrokerRequestLeadStatus = (request: BrokerRequestRecord) => {
  const dispatchStatus = normalizeStage(request.dispatch_status);
  const status = normalizeStage(request.status);

  if (dispatchStatus === "expired" || dispatchStatus === "unavailable" || status === "expired") {
    return {
      status: "cancelled",
      stage: "expired" as const,
      slaStatus: "breach",
    };
  }

  if (dispatchStatus === "broker_matched" || status === "matched" || request.matched_broker_id) {
    return {
      status: "broker_responded",
      stage: "broker_matched" as const,
      slaStatus: "success",
    };
  }

  return {
    status: "pending_broker_response",
    stage: "matching" as const,
    slaStatus: "pending",
  };
};

const getBrokerRequestTitle = (request: BrokerRequestRecord) => {
  const requestType = String(request.request_type || "broker")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
  const location = [request.location, request.location_postcode].filter(Boolean).join(", ");
  return `${requestType} request${location ? ` - ${location}` : ""}`;
};

export const mapBrokerRequestOfferToManagerLead = (request: BrokerRequestRecord): Lead => {
  const leadStatus = getBrokerRequestLeadStatus(request);
  const selectedShare = request.property_shares?.find((share) => (
    share.status === "selected" || share.property_id === request.selected_property_id
  ));
  const selectedProperty = request.selected_property || selectedShare?.property;
  const title = selectedProperty?.title || getBrokerRequestTitle(request);
  const address = selectedProperty?.address_line_1 || request.location || "Request area";
  const city = selectedProperty?.city || request.location || "";
  const postcode = selectedProperty?.postcode || request.location_postcode;
  const createdAt = request.created_at || request.dispatch_started_at || request.updated_at || new Date(0).toISOString();
  const updatedAt = request.updated_at || request.matched_at || createdAt;

  return {
    id: request.selected_lead_id || `broker-request-${request.id}`,
    lead_number: request.selected_lead_id || `BR-${request.id.slice(0, 8)}`,
    property_id: selectedProperty?.id || request.selected_property_id || undefined,
    user_id: request.user_id,
    broker_id: request.matched_broker_id || request.matched_broker?.id,
    matched_broker_id: request.matched_broker_id || request.matched_broker?.id,
    broker_request_id: request.id,
    source: "broker_request",
    status: leadStatus.status,
    stage: leadStatus.stage,
    dispatch_status: request.dispatch_status,
    dispatch_started_at: request.dispatch_started_at,
    response_deadline_at: request.response_deadline_at,
    matched_at: request.matched_at,
    dispatch_wave: request.dispatch_wave,
    dispatched_broker_count: request.dispatched_broker_count,
    fast_track_enabled: Boolean(request.fast_track_enabled || request.selected_fast_track_case_id),
    documents_requested: false,
    documents_uploaded: false,
    documents_verified: false,
    sla_start_time: request.dispatch_started_at,
    sla_deadline: request.response_deadline_at,
    sla_status: leadStatus.slaStatus,
    first_response_at: request.matched_at,
    user_verification_level: "basic",
    journey_type: request.journey_type,
    journey_source: request.journey_source || "broker_request_selection",
    journey_stage: request.journey_stage,
    next_action: request.next_action,
    next_action_target: request.next_action_target,
    status_reason: request.status_reason,
    blocking_requirements: request.blocking_requirements,
    pending_requirements: request.pending_requirements,
    completed_requirements: request.completed_requirements,
    property: {
      id: selectedProperty?.id || request.selected_property_id || request.id,
      title,
      address_line_1: address,
      city,
      postcode,
      price: selectedProperty?.price || 0,
      image_urls: selectedProperty?.image_urls || "",
      property_type: selectedProperty?.property_type || "property",
      agent_name: request.matched_broker?.name || "Property Manager",
      agent_company: request.matched_broker?.company_name,
      agent_email: request.matched_broker?.email,
      agent_phone: request.matched_broker?.phone,
      listing_type: selectedProperty?.listing_type || request.journey_type,
      latitude: selectedProperty?.latitude,
      longitude: selectedProperty?.longitude,
    },
    matched_broker: request.matched_broker || undefined,
    name: request.requester_name || request.requester_email || "Marketplace client",
    email: request.requester_email,
    phone: request.requester_phone,
    property_name: title,
    propertyInterested: title,
    budget: request.budget,
    created_at: createdAt,
    updated_at: updatedAt,
  };
};

export const mergeBrokerRequestOffersIntoManagerLeads = (
  leads: readonly Lead[],
  requests: readonly BrokerRequestRecord[],
  statusFilter = "all",
) => {
  const existingLeadIds = new Set(leads.map((lead) => lead.id).filter(Boolean));
  const existingRequestIds = new Set(leads.map((lead) => lead.broker_request_id).filter(Boolean));
  const mappedRequests = requests
    .filter((request) => !request.selected_lead_id || !existingLeadIds.has(request.selected_lead_id))
    .filter((request) => !existingRequestIds.has(request.id))
    .map(mapBrokerRequestOfferToManagerLead);
  const merged = [...leads, ...mappedRequests];

  return statusFilter === "all"
    ? merged
    : merged.filter((lead) => lead.status === statusFilter);
};

export const isActiveManagerLeadWorkspaceCase = (caseItem: ManagerLeadWorkspaceCase) => {
  const workspaceFinalStatus = normalizeStage(caseItem.workspaceFinalStatus);
  const legacyFinalStatus = normalizeStage(caseItem.finalStatus);

  return (!workspaceFinalStatus || workspaceFinalStatus === "active")
    && (!legacyFinalStatus || legacyFinalStatus === "in_progress");
};

export const resolveManagerLeadWorkspaceCase = <T extends ManagerLeadWorkspaceCase>(
  lead: ManagerLeadVisibilityItem,
  cases: readonly T[],
) => cases.find((caseItem) => (
  isActiveManagerLeadWorkspaceCase(caseItem)
  && (
    sameManagerLeadId(caseItem.leadId, lead.id)
    || sameManagerLeadId(caseItem.brokerRequestId, lead.broker_request_id)
  )
)) || null;

export const shouldShowManagerLeadWorkspaceMissingNotice = (
  lead: ManagerLeadVisibilityItem,
  hasLinkedCase: boolean,
) => {
  if (hasLinkedCase) {
    return false;
  }

  const stage = normalizeStage(resolveLeadStage(lead));
  return Boolean(
    lead.fast_track_enabled
    || lead.broker_request_id
    || lead.documents_requested
    || lead.documents_uploaded
    || lead.documents_verified
    || LIVE_PROCESSING_STAGES.has(stage)
  );
};

export const getManagerLeadSlaRemainingSeconds = (lead: ManagerLeadSummaryItem, now: number) => {
  if (typeof lead.sla_remaining_seconds === "number") {
    return Math.max(0, lead.sla_remaining_seconds);
  }

  const deadline = getLeadDeadline(lead);
  if (!deadline) {
    return 0;
  }

  const remaining = Math.ceil((new Date(deadline).getTime() - now) / 1000);
  return remaining > 0 ? remaining : 0;
};

export const isManagerLeadBreached = (lead: ManagerLeadSummaryItem, now: number) => {
  const remaining = getManagerLeadSlaRemainingSeconds(lead, now);
  return normalizeStage(lead.sla_status) === "breach"
    || (normalizeStage(lead.status) === "pending_broker_response" && remaining === 0);
};

export const isManagerLeadLiveProcessing = (lead: ManagerLeadSummaryItem) => {
  const status = normalizeStage(lead.status);
  const stage = normalizeStage(resolveLeadStage(lead));

  return !CLOSED_MANAGER_LEAD_STATUSES.has(status)
    && !CLOSED_MANAGER_LEAD_STAGES.has(stage)
    && LIVE_PROCESSING_STAGES.has(stage);
};

const isManagerLeadExplicitlyClosed = (lead: ManagerLeadSummaryItem) => {
  const status = normalizeStage(lead.status);
  const rawStage = normalizeStage(lead.stage);

  return CLOSED_MANAGER_LEAD_STATUSES.has(status)
    || CLOSED_MANAGER_LEAD_STAGES.has(rawStage);
};

export const getManagerLeadOperationalState = (
  lead: ManagerLeadSummaryItem,
  now: number,
  defaultStatusLabel: string,
): ManagerLeadOperationalState => {
  const stage = normalizeStage(resolveLeadStage(lead));
  const isBreached = isManagerLeadBreached(lead, now);
  const requiresEscalation = isBreached && !isManagerLeadExplicitlyClosed(lead);

  return {
    isBreached,
    requiresEscalation,
    statusLabel: requiresEscalation ? "Escalation required" : defaultStatusLabel,
    showResponseCountdown: stage === "matching" && !requiresEscalation,
  };
};

export const summarizeManagerLeads = <T extends ManagerLeadSummaryItem>(
  leads: readonly T[],
  now: number,
): ManagerLeadSummary => {
  const documentsQueue = leads.filter((lead) => (
    DOCUMENT_QUEUE_STAGES.has(normalizeStage(resolveLeadStage(lead)))
  )).length;
  const viewingScheduled = leads.filter((lead) => (
    lead.status === "viewing_scheduled" || normalizeStage(resolveLeadStage(lead)) === "viewing_scheduled" || lead.viewing_scheduled
  )).length;
  const breached = leads.filter((lead) => {
    return isManagerLeadBreached(lead, now);
  }).length;

  return {
    total: leads.length,
    awaitingResponse: leads.filter(isManagerLeadLiveProcessing).length,
    documentsQueue,
    viewingScheduled,
    breached,
  };
};

export const sortManagerLeads = <T extends ManagerLeadListItem>(
  leads: T[],
  mode: ManagerLeadSortMode,
) => [...leads].sort((left, right) => {
  switch (mode) {
    case "client_az":
      return getClientLabel(left).localeCompare(getClientLabel(right)) || getCreatedAt(right) - getCreatedAt(left);
    case "budget_desc":
      return parseBudgetAmount(right.budget) - parseBudgetAmount(left.budget) || getCreatedAt(right) - getCreatedAt(left);
    case "score_desc":
      return Number(right.score || 0) - Number(left.score || 0) || getCreatedAt(right) - getCreatedAt(left);
    default:
      return getCreatedAt(right) - getCreatedAt(left);
  }
});

export const paginateManagerLeads = <T>(
  leads: T[],
  requestedPage: number,
  pageSize: number,
) => {
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(leads.length / safePageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const startIndex = (currentPage - 1) * safePageSize;

  return {
    items: leads.slice(startIndex, startIndex + safePageSize),
    currentPage,
    totalPages,
  };
};
