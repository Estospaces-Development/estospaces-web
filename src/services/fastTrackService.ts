import { apiFetch, getErrorMessage, getServiceUrl } from "@/lib/apiUtils";
import type { ApiFetchOptions } from "@/lib/apiUtils";
import { PAYMENTS_ENABLED } from "@/lib/launchFlags";
import type {
  JourneyAction,
  JourneyBlocker,
  JourneyDeadline,
  JourneyRequirement,
  JourneyState,
  JourneyStateFields,
} from "@/types/journey";

const BOOKING_URL = () => getServiceUrl("booking");
type ServiceRequestOptions = Pick<ApiFetchOptions, "suppressErrorToast">;

export type FastTrackStage =
  | "selected"
  | "documents"
  | "viewing"
  | "decision"
  | "agreement"
  | "handover";

export type FastTrackLegacyStep =
  | "property_selected"
  | "documents_requested"
  | "documents_verified"
  | "viewing_scheduled"
  | "viewing_completed"
  | "application_in_review"
  | "ready_for_contract"
  | "completed";

export type FastTrackStep = FastTrackLegacyStep;
export type PropertyType = "rent" | "buy";

export type FastTrackFinalStatus = "active" | "completed" | "cancelled";
export type FastTrackLegacyFinalStatus =
  | "in_progress"
  | "completed"
  | "expired"
  | "rejected";

export type FastTrackDocumentStatus =
  | "pending"
  | "uploaded"
  | "reupload_needed"
  | "approved";

export type DocStatus = "pending" | "uploaded" | "reupload_required" | "verified";

export interface FastTrackDocumentItem {
  id: string;
  label: string;
  status: FastTrackDocumentStatus;
  documentRecordId?: string;
  fileName?: string;
  fileUrl?: string;
  mimeType?: string;
  uploadNote?: string;
  reviewNote?: string;
  note?: string;
  uploadedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface FastTrackDocuments {
  identityProof: DocStatus;
  addressProof: DocStatus;
  items: FastTrackDocumentItem[];
  allUploaded: boolean;
  allApproved: boolean;
  note?: string;
}

export interface FastTrackViewingState {
  status: string;
  scheduledAt?: string;
  note?: string;
  requestedChange?: string;
  requestedChangeAt?: string;
  confirmedByUser?: boolean;
}

export interface FastTrackDecisionState {
  mode: "rent" | "sale";
  status: string;
  amount?: number;
  currency?: string;
  note?: string;
  decidedAt?: string;
  decidedBy?: string;
}

export interface FastTrackAgreementState {
  status: string;
  paymentStatus: string;
  amountDue?: number;
  note?: string;
  sentAt?: string;
  acceptedAt?: string;
}

export interface FastTrackHandoverState {
  status: string;
  note?: string;
  readyAt?: string;
  confirmedByUser?: boolean;
  confirmedAt?: string;
  completedAt?: string;
  completedBy?: string;
}

export interface FastTrackActivityEntry {
  id: string;
  type: string;
  message: string;
  actorRole: string;
  createdAt: string;
}

interface BackendFastTrackWorkspaceCase {
  id: string;
  case_id?: string;
  application_id?: string;
  viewing_id?: string;
  contract_id?: string;
  payment_id?: string;
  header: {
    property_id: string;
    property_title: string;
    property_type: string;
    property_country?: string;
    listing_type?: "rent" | "sale" | "lease" | string;
    journey_type?: "rent" | "sale" | string;
    client_id: string;
    client_name: string;
    manager_id?: string;
    lead_id?: string;
    broker_request_id?: string;
    started_from?: string;
    submitted_at: string;
    expires_at?: string;
    hours_remaining: number;
    overdue?: boolean;
  };
  stage: FastTrackStage;
  final_status: FastTrackFinalStatus;
  documents: {
    items?: Array<{
      id: string;
      label: string;
      status: string;
      document_record_id?: string;
      file_name?: string;
      file_url?: string;
      mime_type?: string;
      upload_note?: string;
      review_note?: string;
      note?: string;
      uploaded_at?: string;
      reviewed_at?: string;
      reviewed_by?: string;
    }>;
    all_uploaded?: boolean;
    all_approved?: boolean;
    note?: string;
  };
  viewing: {
    status?: string;
    scheduled_at?: string;
    note?: string;
    requested_change?: string;
    requested_change_at?: string;
    confirmed_by_user?: boolean;
  };
  decision: {
    mode?: "rent" | "sale" | string;
    status?: string;
    amount?: number;
    currency?: string;
    note?: string;
    decided_at?: string;
    decided_by?: string;
  };
  agreement: {
    status?: string;
    payment_status?: string;
    amount_due?: number;
    note?: string;
    sent_at?: string;
    accepted_at?: string;
  };
  handover: {
    status?: string;
    note?: string;
    ready_at?: string;
    confirmed_by_user?: boolean;
    confirmed_at?: string;
    completed_at?: string;
    completed_by?: string;
  };
  activity?: Array<{
    id: string;
    type: string;
    message: string;
    actor_role: string;
    created_at: string;
  }>;
}

export interface FastTrackCase extends JourneyStateFields {
  id: string;
  caseId: string;
  propertyId: string;
  propertyTitle: string;
  propertyType: string;
  propertyCountry?: string;
  clientId: string;
  clientName: string;
  managerId?: string;
  leadId?: string;
  brokerRequestId?: string;
  listingType?: "rent" | "sale" | "lease";
  journeyMode: "rent" | "sale";
  journeyType: "rent" | "buy";
  startedFrom?: string;
  submittedAt: string;
  expiresAt?: string;
  hoursRemaining: number;
  overdue: boolean;
  stage: FastTrackStage;
  currentStep: FastTrackLegacyStep;
  backendCurrentStep: FastTrackLegacyStep;
  workspaceFinalStatus: FastTrackFinalStatus;
  finalStatus: FastTrackLegacyFinalStatus;
  documents: FastTrackDocuments;
  viewing: FastTrackViewingState;
  decision: FastTrackDecisionState;
  agreement: FastTrackAgreementState;
  handover: FastTrackHandoverState;
  activity: FastTrackActivityEntry[];
  documentPhase:
    | "not_requested"
    | "waiting_for_upload"
    | "uploaded_under_review"
    | "replacement_required"
    | "verified";
  documentPhaseReason?: string;
  nextAction?: string;
  nextActionTarget?: string;
  statusReason?: string;
  journeySource?: string;
  journeyStage?: string;
  journeyState?: JourneyState | null;
  jurisdiction?: string;
  jurisdictionProfile?: string;
  liveStage?: string;
  stageGroup?: string;
  journeyStatusReason?: string;
  blockers?: JourneyBlocker[];
  deadlines?: JourneyDeadline[];
  requiredEvidence?: JourneyRequirement[];
  nextActions?: JourneyAction[];
  blockingRequirements?: string[];
  pendingRequirements?: string[];
  completedRequirements?: string[];
  applicationId?: string;
  viewingId?: string;
  contractId?: string;
  paymentId?: string;
}

export interface CreateFastTrackRequest {
  property_id: string;
  broker_request_id?: string;
  lead_id?: string;
  manager_id?: string;
  client_id: string;
  client_name: string;
  property_title: string;
  property_type: string;
  property_country?: string;
  listing_type?: "rent" | "sale" | "lease";
  started_from?: "direct_property" | "broker_request_selection";
}

export interface UpdateFastTrackRequest {
  current_step?: string;
  final_status?: string;
  lead_id?: string;
  manager_id?: string;
  documents?: {
    identityProof?: DocStatus;
    addressProof?: DocStatus;
  };
  override_reason?: string;
}

export interface FastTrackActionRequest {
  action: string;
  payload?: Record<string, unknown>;
}

const normalizeStage = (value: string | undefined): FastTrackStage => {
  switch (String(value || "").trim().toLowerCase()) {
    case "documents":
      return "documents";
    case "viewing":
      return "viewing";
    case "decision":
      return "decision";
    case "agreement":
      return "agreement";
    case "handover":
      return "handover";
    default:
      return "selected";
  }
};

const toLegacyStep = (
  stage: FastTrackStage,
  workspaceFinalStatus: FastTrackFinalStatus,
): FastTrackLegacyStep => {
  switch (stage) {
    case "documents":
      return "documents_requested";
    case "viewing":
      return "viewing_scheduled";
    case "decision":
      return "application_in_review";
    case "agreement":
      return "ready_for_contract";
    case "handover":
      return workspaceFinalStatus === "completed"
        ? "completed"
        : "ready_for_contract";
    default:
      return "property_selected";
  }
};

const normalizeWorkspaceFinalStatus = (
  value: string | undefined,
): FastTrackFinalStatus => {
  switch (String(value || "").trim().toLowerCase()) {
    case "completed":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "active";
  }
};

const toLegacyFinalStatus = (
  value: FastTrackFinalStatus,
): FastTrackLegacyFinalStatus => {
  switch (value) {
    case "completed":
      return "completed";
    case "cancelled":
      return "rejected";
    default:
      return "in_progress";
  }
};

const normalizeJourneyMode = (value?: string): "rent" | "sale" => {
  switch (String(value || "").trim().toLowerCase()) {
    case "sale":
    case "buy":
      return "sale";
    default:
      return "rent";
  }
};

const normalizeListingType = (
  value?: string,
): "rent" | "sale" | "lease" => {
  switch (String(value || "").trim().toLowerCase()) {
    case "sale":
    case "buy":
      return "sale";
    case "lease":
      return "lease";
    default:
      return "rent";
  }
};

const normalizeDocumentStatus = (
  value: string | undefined,
): FastTrackDocumentStatus => {
  switch (String(value || "").trim().toLowerCase()) {
    case "uploaded":
    case "under_review":
    case "pending_review":
    case "submitted":
      return "uploaded";
    case "approved":
    case "verified":
      return "approved";
    case "reupload_needed":
    case "reupload_required":
    case "reupload_requested":
    case "replacement_required":
    case "rejected":
      return "reupload_needed";
    default:
      return "pending";
  }
};

const toLegacyDocumentStatus = (value: FastTrackDocumentStatus): DocStatus => {
  switch (value) {
    case "approved":
      return "verified";
    case "reupload_needed":
      return "reupload_required";
    case "uploaded":
      return "uploaded";
    default:
      return "pending";
  }
};

const deriveDocumentPhase = (
  stage: FastTrackStage,
  items: FastTrackDocumentItem[],
): FastTrackCase["documentPhase"] => {
  if (items.length > 0 && items.every((item) => item.status === "approved")) {
    return "verified";
  }
  if (items.some((item) => item.status === "reupload_needed")) {
    return "replacement_required";
  }
  if (items.some((item) => item.status === "uploaded")) {
    return "uploaded_under_review";
  }
  if (stage === "documents") {
    return "waiting_for_upload";
  }
  return "not_requested";
};

const deriveDocumentPhaseReason = (
  phase: FastTrackCase["documentPhase"],
): string => {
  switch (phase) {
    case "verified":
      return "Core files are approved and the workspace can move forward.";
    case "replacement_required":
      return "At least one uploaded file needs a replacement.";
    case "uploaded_under_review":
      return "Uploaded files are waiting for review.";
    case "waiting_for_upload":
      return "Core files are still needed from the user.";
    default:
      return "No core files have been requested yet.";
  }
};

const deriveNextAction = (
  stage: FastTrackStage,
  journeyMode: "rent" | "sale",
  finalStatus: FastTrackFinalStatus,
  roleHint?: "user" | "manager" | "admin",
): string => {
  if (finalStatus === "completed") {
    return roleHint === "user" ? "Review your completed handover" : "Review completed case";
  }
  if (finalStatus === "cancelled") {
    return "No action needed";
  }

  switch (stage) {
    case "documents":
      return roleHint === "user" ? "Upload core files" : "Approve core files";
    case "viewing":
      return roleHint === "user" ? "Confirm the plan" : "Schedule the viewing";
    case "decision":
      return roleHint === "user"
        ? "Wait for the decision"
        : journeyMode === "sale"
          ? "Record the offer outcome"
          : "Record the application outcome";
    case "agreement":
      return roleHint === "user" ? "Accept the agreement" : "Send the agreement";
    case "handover":
      return roleHint === "user" ? "Confirm receipt" : "Complete handover";
    default:
      return roleHint === "user" ? "Wait for the team to start" : "Start documents";
  }
};

const deriveStatusReason = (
  stage: FastTrackStage,
  journeyMode: "rent" | "sale",
  finalStatus: FastTrackFinalStatus,
): string => {
  if (finalStatus === "completed") {
    return "This fast-track case is complete.";
  }
  if (finalStatus === "cancelled") {
    return "This fast-track case has been cancelled.";
  }

  switch (stage) {
    case "documents":
      return "All core documents stay in this workspace until they are approved.";
    case "viewing":
      return "Viewing scheduling and confirmation stay in this workspace.";
    case "decision":
      return journeyMode === "sale"
        ? "The offer decision is managed inline in this workspace."
        : "The application decision is managed inline in this workspace.";
    case "agreement":
      return PAYMENTS_ENABLED
        ? "Agreement and payment steps stay inside this workspace."
        : "Agreement steps stay inside this workspace.";
    case "handover":
      return "Completion is confirmed directly in this workspace.";
    default:
      return "The property is selected and ready to start.";
  }
};

const mapBackendToFrontend = (
  raw: BackendFastTrackWorkspaceCase,
): FastTrackCase => {
  const stage = normalizeStage(raw.stage);
  const workspaceFinalStatus = normalizeWorkspaceFinalStatus(raw.final_status);
  const items = (raw.documents?.items || []).map((item) => ({
    id: item.id,
    label: item.label,
    status: normalizeDocumentStatus(item.status),
    documentRecordId: item.document_record_id,
    fileName: item.file_name,
    fileUrl: item.file_url,
    mimeType: item.mime_type,
    uploadNote: item.upload_note || (item.reviewed_at ? undefined : item.note),
    reviewNote: item.review_note || (item.reviewed_at ? item.note : undefined),
    note: item.review_note || item.upload_note || item.note,
    uploadedAt: item.uploaded_at,
    reviewedAt: item.reviewed_at,
    reviewedBy: item.reviewed_by,
  }));
  const identityItem = items.find((item) => item.id === "identity");
  const addressItem = items.find((item) => item.id === "address");
  const journeyMode = normalizeJourneyMode(raw.header?.journey_type || raw.header?.listing_type);
  const documentPhase = deriveDocumentPhase(stage, items);

  return {
    id: raw.id,
    caseId: raw.case_id || raw.id,
    propertyId: raw.header.property_id,
    propertyTitle: raw.header.property_title,
    propertyType: raw.header.property_type,
    propertyCountry: raw.header.property_country,
    clientId: raw.header.client_id,
    clientName: raw.header.client_name,
    applicationId: raw.application_id,
    viewingId: raw.viewing_id,
    contractId: raw.contract_id,
    paymentId: raw.payment_id,
    managerId: raw.header.manager_id || undefined,
    leadId: raw.header.lead_id || undefined,
    brokerRequestId: raw.header.broker_request_id || undefined,
    listingType: normalizeListingType(raw.header.listing_type),
    journeyMode,
    journeyType: journeyMode === "sale" ? "buy" : "rent",
    startedFrom: raw.header.started_from,
    submittedAt: raw.header.submitted_at,
    expiresAt: raw.header.expires_at,
    hoursRemaining: Number(raw.header.hours_remaining || 0),
    overdue: Boolean(raw.header.overdue),
    stage,
    currentStep: toLegacyStep(stage, workspaceFinalStatus),
    backendCurrentStep: toLegacyStep(stage, workspaceFinalStatus),
    workspaceFinalStatus,
    finalStatus: toLegacyFinalStatus(workspaceFinalStatus),
    documents: {
      identityProof: toLegacyDocumentStatus(identityItem?.status || "pending"),
      addressProof: toLegacyDocumentStatus(addressItem?.status || "pending"),
      items,
      allUploaded: Boolean(raw.documents?.all_uploaded),
      allApproved: Boolean(raw.documents?.all_approved),
      note: raw.documents?.note,
    },
    viewing: {
      status: raw.viewing?.status || "pending",
      scheduledAt: raw.viewing?.scheduled_at,
      note: raw.viewing?.note,
      requestedChange: raw.viewing?.requested_change,
      requestedChangeAt: raw.viewing?.requested_change_at,
      confirmedByUser: raw.viewing?.confirmed_by_user,
    },
    decision: {
      mode: normalizeJourneyMode(raw.decision?.mode),
      status: raw.decision?.status || "pending",
      amount: raw.decision?.amount,
      currency: raw.decision?.currency || "GBP",
      note: raw.decision?.note,
      decidedAt: raw.decision?.decided_at,
      decidedBy: raw.decision?.decided_by,
    },
    agreement: {
      status: raw.agreement?.status || "pending",
      paymentStatus: raw.agreement?.payment_status || "not_requested",
      amountDue: raw.agreement?.amount_due,
      note: raw.agreement?.note,
      sentAt: raw.agreement?.sent_at,
      acceptedAt: raw.agreement?.accepted_at,
    },
    handover: {
      status: raw.handover?.status || "pending",
      note: raw.handover?.note,
      readyAt: raw.handover?.ready_at,
      confirmedByUser: raw.handover?.confirmed_by_user,
      confirmedAt: raw.handover?.confirmed_at,
      completedAt: raw.handover?.completed_at,
      completedBy: raw.handover?.completed_by,
    },
    activity: (raw.activity || []).map((item) => ({
      id: item.id,
      type: item.type,
      message: item.message,
      actorRole: item.actor_role,
      createdAt: item.created_at,
    })),
    documentPhase,
    documentPhaseReason: deriveDocumentPhaseReason(documentPhase),
    nextAction: deriveNextAction(stage, journeyMode, workspaceFinalStatus),
    statusReason: deriveStatusReason(stage, journeyMode, workspaceFinalStatus),
  };
};

export const getFastTrackCases = async (
  options: ServiceRequestOptions = {},
): Promise<{ data: FastTrackCase[] | null; error: string | null }> => {
  try {
    const result = await apiFetch<BackendFastTrackWorkspaceCase[]>(
      `${BOOKING_URL()}/api/v1/fast-track`,
      options,
    );
    return { data: (result || []).map(mapBackendToFrontend), error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getFastTrackCaseById = async (
  id: string,
  options: ServiceRequestOptions = {},
): Promise<{ data: FastTrackCase | null; error: string | null }> => {
  try {
    const result = await apiFetch<BackendFastTrackWorkspaceCase>(
      `${BOOKING_URL()}/api/v1/fast-track/${id}`,
      options,
    );
    return { data: result ? mapBackendToFrontend(result) : null, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const createFastTrackCase = async (
  req: CreateFastTrackRequest,
  options: ServiceRequestOptions = {},
): Promise<{ data: FastTrackCase | null; error: string | null }> => {
  try {
    const result = await apiFetch<BackendFastTrackWorkspaceCase>(
      `${BOOKING_URL()}/api/v1/fast-track`,
      {
        method: "POST",
        body: JSON.stringify(req),
        ...options,
      },
    );
    return { data: result ? mapBackendToFrontend(result) : null, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const performFastTrackAction = async (
  id: string,
  req: FastTrackActionRequest,
  options: ServiceRequestOptions = {},
): Promise<{ data: FastTrackCase | null; error: string | null }> => {
  try {
    const result = await apiFetch<BackendFastTrackWorkspaceCase>(
      `${BOOKING_URL()}/api/v1/fast-track/${id}/actions`,
      {
        method: "POST",
        body: JSON.stringify(req),
        ...options,
      },
    );
    return { data: result ? mapBackendToFrontend(result) : null, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const updateFastTrackCase = async (
  id: string,
  req: UpdateFastTrackRequest,
  options: ServiceRequestOptions = {},
): Promise<{ data: FastTrackCase | null; error: string | null }> => {
  try {
    const result = await apiFetch<BackendFastTrackWorkspaceCase>(
      `${BOOKING_URL()}/api/v1/fast-track/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
        ...options,
      },
    );
    return { data: result ? mapBackendToFrontend(result) : null, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const deleteFastTrackCase = async (
  id: string,
  options: ServiceRequestOptions = {},
): Promise<{ error: string | null }> => {
  try {
    await apiFetch(`${BOOKING_URL()}/api/v1/fast-track/${id}`, {
      method: "DELETE",
      ...options,
    });
    return { error: null };
  } catch (error: any) {
    return { error: getErrorMessage(error) };
  }
};
