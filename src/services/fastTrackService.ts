import { apiFetch, getErrorMessage, getServiceUrl } from "@/lib/apiUtils";
import type { ApiFetchOptions } from "@/lib/apiUtils";
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

export type FastTrackStep =
  | "property_selected"
  | "documents_requested"
  | "documents_verified"
  | "viewing_scheduled"
  | "viewing_completed"
  | "application_in_review"
  | "ready_for_contract"
  | "completed";

export type PropertyType = "rent" | "lease" | "buy" | "sale";

export type DocStatus =
  | "pending"
  | "uploaded"
  | "reupload_required"
  | "verified";
export type FastTrackDocumentPhase =
  | "not_requested"
  | "waiting_for_upload"
  | "uploaded_under_review"
  | "replacement_required"
  | "verified";

export interface FastTrackDocuments {
  identityProof: DocStatus;
  addressProof: DocStatus;
}

// Backend Model structure
interface BackendFastTrackCase extends JourneyStateFields {
  id: string;
  property_id: string;
  property_country?: string;
  broker_request_id?: string;
  lead_id?: string;
  manager_id?: string;
  client_id: string;
  client_name: string;
  property_title: string;
  property_type: PropertyType;
  listing_type?: "rent" | "sale" | "lease";
  started_from?: "direct_property" | "broker_request_selection";
  current_step: FastTrackStep;
  final_status: "in_progress" | "completed" | "expired" | "rejected";
  documents: FastTrackDocuments;
  journey_type?: "rent" | "buy";
  journey_source?: "direct_property" | "broker_request_selection";
  journey_stage?: string;
  next_action?: string;
  next_action_target?: string;
  status_reason?: string;
  blocking_requirements?: string[];
  pending_requirements?: string[];
  completed_requirements?: string[];
  override_reason?: string;
  override_by?: string;
  override_at?: string;
  jurisdiction?: string;
  compliance_pack?: string;
  required_compliance_items?: string[];
  completed_compliance_items?: string[];
  blocked_by_compliance?: boolean;
  compliance_status_reason?: string;
  submitted_at: string;
  expires_at?: string;
  updated_at: string;
  hours_remaining: number;
  document_phase?: FastTrackDocumentPhase;
  document_phase_reason?: string;
}

// Frontend Model structure (matching existing components)
export interface FastTrackCase {
  caseId: string;
  propertyTitle: string;
  propertyType: PropertyType;
  propertyCountry?: string;
  clientName: string;
  clientId: string;
  propertyId: string;
  brokerRequestId?: string;
  leadId?: string;
  managerId?: string;
  listingType?: "rent" | "sale" | "lease";
  startedFrom?: "direct_property" | "broker_request_selection";
  submittedAt: string;
  expiresAt?: string;
  hoursRemaining: number;
  backendCurrentStep: FastTrackStep;
  currentStep: FastTrackStep;
  documents: FastTrackDocuments;
  documentPhase?: FastTrackDocumentPhase;
  documentPhaseReason?: string;
  finalStatus: "in_progress" | "completed" | "expired" | "rejected";
  journeyType?: "rent" | "buy";
  journeySource?: "direct_property" | "broker_request_selection";
  journeyStage?: string;
  nextAction?: string;
  nextActionTarget?: string;
  statusReason?: string;
  blockingRequirements?: string[];
  pendingRequirements?: string[];
  completedRequirements?: string[];
  overrideReason?: string;
  overrideBy?: string;
  overrideAt?: string;
  jurisdiction?: string;
  compliancePack?: string;
  requiredComplianceItems?: string[];
  completedComplianceItems?: string[];
  blockedByCompliance?: boolean;
  complianceStatusReason?: string;
  journeyState?: JourneyState | null;
  jurisdictionProfile?: string;
  liveStage?: string;
  stageGroup?: string;
  journeyStatusReason?: string;
  blockers?: JourneyBlocker[];
  deadlines?: JourneyDeadline[];
  requiredEvidence?: JourneyRequirement[];
  nextActions?: JourneyAction[];
  // extra fields to preserve ID
  id: string;
}

const normalizeFastTrackStep = (step?: string): FastTrackStep => {
  switch (String(step || "").trim()) {
    case "property_selected":
      return "property_selected";
    case "documents_requested":
    case "documents":
      return "documents_requested";
    case "documents_verified":
      return "documents_verified";
    case "viewing_scheduled":
      return "viewing_scheduled";
    case "viewing_completed":
      return "viewing_completed";
    case "referencing":
    case "right_to_rent_or_national_compliance":
    case "buyer_qualification":
    case "offer":
    case "sale_agreed":
    case "memorandum":
    case "conveyancing":
    case "exchange":
    case "application_in_review":
      return "application_in_review";
    case "approval":
    case "tenancy_pack_issued":
    case "signatures_pending":
    case "deposit_and_first_rent":
    case "ready_for_contract":
      return "ready_for_contract";
    case "completed":
    case "active_tenancy":
    case "completion":
      return "completed";
    case "owner_approval":
    case "legal_check":
      return "application_in_review";
    case "payment_ready":
      return "ready_for_contract";
    default:
      return "property_selected";
  }
};

const normalizeFastTrackDocumentPhase = (
  phase?: string,
  step?: string,
): FastTrackDocumentPhase => {
  switch (String(phase || "").trim()) {
    case "waiting_for_upload":
      return "waiting_for_upload";
    case "uploaded_under_review":
      return "uploaded_under_review";
    case "replacement_required":
      return "replacement_required";
    case "verified":
      return "verified";
    case "not_requested":
      return "not_requested";
    default:
      return normalizeFastTrackStep(step) === "documents_requested"
        ? "waiting_for_upload"
        : normalizeFastTrackStep(step) === "documents_verified"
          ? "verified"
          : "not_requested";
  }
};

const normalizeDocStatus = (value: unknown): DocStatus => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "verified" || normalized === "approved") {
      return "verified";
    }
    if (
      normalized === "uploaded" ||
      normalized === "under_review" ||
      normalized === "pending_review"
    ) {
      return "uploaded";
    }
    if (normalized === "reupload_required" || normalized === "rejected") {
      return "reupload_required";
    }
  }

  return "pending";
};

const normalizeDocuments = (
  documents: FastTrackDocuments | Record<string, unknown> | null | undefined,
): FastTrackDocuments => ({
  identityProof: normalizeDocStatus(
    (documents as any)?.identityProof ?? (documents as any)?.idProof,
  ),
  addressProof: normalizeDocStatus(
    (documents as any)?.addressProof ?? (documents as any)?.propertyDocs,
  ),
});

// Mapper function
const mapBackendToFrontend = (
  apiCase: BackendFastTrackCase,
): FastTrackCase => ({
  caseId: apiCase.id,
  id: apiCase.id,
  propertyId: apiCase.property_id,
  propertyCountry: apiCase.property_country,
  brokerRequestId: apiCase.broker_request_id,
  leadId: apiCase.lead_id,
  managerId: apiCase.manager_id,
  clientId: apiCase.client_id,
  propertyTitle: apiCase.property_title,
  propertyType: apiCase.property_type,
  listingType: apiCase.listing_type,
  startedFrom: apiCase.started_from,
  clientName: apiCase.client_name,
  submittedAt: apiCase.submitted_at,
  expiresAt: apiCase.expires_at,
  hoursRemaining: apiCase.hours_remaining,
  backendCurrentStep: normalizeFastTrackStep(apiCase.current_step),
  currentStep: normalizeFastTrackStep(
    apiCase.live_stage || apiCase.current_step,
  ),
  documents: normalizeDocuments(apiCase.documents),
  documentPhase: normalizeFastTrackDocumentPhase(
    apiCase.document_phase,
    apiCase.live_stage || apiCase.current_step,
  ),
  documentPhaseReason: apiCase.document_phase_reason,
  finalStatus: apiCase.final_status,
  journeyType: apiCase.journey_type,
  journeySource: apiCase.journey_source,
  journeyStage: apiCase.journey_stage,
  nextAction: apiCase.next_action,
  nextActionTarget: apiCase.next_action_target,
  statusReason: apiCase.status_reason,
  blockingRequirements: apiCase.blocking_requirements || [],
  pendingRequirements: apiCase.pending_requirements || [],
  completedRequirements: apiCase.completed_requirements || [],
  overrideReason: apiCase.override_reason,
  overrideBy: apiCase.override_by,
  overrideAt: apiCase.override_at,
  jurisdiction: apiCase.jurisdiction,
  compliancePack: apiCase.compliance_pack,
  requiredComplianceItems: apiCase.required_compliance_items || [],
  completedComplianceItems: apiCase.completed_compliance_items || [],
  blockedByCompliance: apiCase.blocked_by_compliance,
  complianceStatusReason: apiCase.compliance_status_reason,
  journeyState: apiCase.journey_state || null,
  jurisdictionProfile:
    apiCase.jurisdiction_profile || apiCase.journey_state?.jurisdiction_profile,
  liveStage: apiCase.live_stage || apiCase.journey_state?.live_stage,
  stageGroup: apiCase.stage_group || apiCase.journey_state?.stage_group,
  journeyStatusReason:
    apiCase.journey_status_reason ||
    apiCase.journey_state?.journey_status_reason,
  blockers: apiCase.blockers || apiCase.journey_state?.blockers || [],
  deadlines: apiCase.deadlines || apiCase.journey_state?.deadlines || [],
  requiredEvidence:
    apiCase.required_evidence || apiCase.journey_state?.required_evidence || [],
  nextActions:
    apiCase.next_actions || apiCase.journey_state?.next_actions || [],
});

export interface CreateFastTrackRequest {
  property_id: string;
  broker_request_id?: string;
  lead_id?: string;
  manager_id?: string;
  client_id: string;
  client_name: string;
  property_title: string;
  property_type: PropertyType;
  property_country?: string;
  listing_type?: "rent" | "sale" | "lease";
  started_from?: "direct_property" | "broker_request_selection";
}

export interface UpdateFastTrackRequest {
  current_step?: string;
  final_status?: string;
  lead_id?: string;
  manager_id?: string;
  documents?: FastTrackDocuments;
  override_reason?: string;
}

export const getFastTrackCases = async (
  options: ServiceRequestOptions = {},
) => {
  try {
    const result = await apiFetch<BackendFastTrackCase[]>(
      `${BOOKING_URL()}/api/v1/fast-track`,
      options,
    );
    if (result) {
      return { data: result.map(mapBackendToFrontend), error: null };
    }
    return { data: [], error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getFastTrackCaseById = async (id: string) => {
  try {
    const result = await apiFetch<BackendFastTrackCase>(
      `${BOOKING_URL()}/api/v1/fast-track/${id}`,
    );
    if (result) {
      return { data: mapBackendToFrontend(result), error: null };
    }
    return { data: null, error: "Case not found" };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const createFastTrackCase = async (
  req: CreateFastTrackRequest,
  options: ServiceRequestOptions = {},
) => {
  try {
    const result = await apiFetch<BackendFastTrackCase>(
      `${BOOKING_URL()}/api/v1/fast-track`,
      {
        method: "POST",
        body: JSON.stringify(req),
        ...options,
      },
    );
    if (result) {
      return { data: mapBackendToFrontend(result), error: null };
    }
    return { data: null, error: "Failed to create case" };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const updateFastTrackCase = async (
  id: string,
  req: UpdateFastTrackRequest,
) => {
  try {
    // Map frontend fields back to backend if necessary, but update request is simple
    const result = await apiFetch<BackendFastTrackCase>(
      `${BOOKING_URL()}/api/v1/fast-track/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(req),
      },
    );
    if (result) {
      return { data: mapBackendToFrontend(result), error: null };
    }
    return { data: null, error: "Failed to update case" };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const deleteFastTrackCase = async (
  id: string,
  options: ServiceRequestOptions = {},
) => {
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
