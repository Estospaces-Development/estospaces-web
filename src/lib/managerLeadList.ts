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
  && sameManagerLeadId(caseItem.leadId, lead.id)
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
