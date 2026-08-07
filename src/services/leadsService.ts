/**
 * Leads Service
 * Fetches lead data from core-service backend
 */

import {
  apiFetch,
  apiFetchEnvelope,
  buildApiUrl,
  getErrorMessage,
  getServiceUrl,
} from "@/lib/apiUtils";
import type { ApiFetchOptions } from "@/lib/apiUtils";
import { uploadMediaFile } from "@/services/mediaService";

const CORE_URL = () => getServiceUrl("core");
type ServiceRequestOptions = Pick<ApiFetchOptions, "suppressErrorToast">;
type BrokerRequestListClientOptions = ServiceRequestOptions & {
  status?: string;
  sort?: string;
  limit?: number;
  offset?: number;
  offerStatus?: string;
};

export interface LeadBrokerSummary {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  postcode?: string;
  service_areas?: string[];
  dispatch_pincodes?: string[];
  rating?: number;
  review_count?: number;
  fast_track_eligible?: boolean;
  availability_expires_at?: string;
  distance_miles?: number;
}

export interface NearbyBrokerPagination {
  total?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
}

export interface BrokerAvailabilityState {
  broker_id: string;
  available_for_fast_response: boolean;
  availability_started_at?: string;
  availability_expires_at?: string;
  seconds_remaining: number;
  eligible_for_live_dispatch?: boolean;
  verification_status?: string;
  blocked_reason?: string;
}

export interface Lead {
  id: string;
  lead_number?: string;
  property_id?: string;
  user_id?: string;
  broker_id?: string;
  broker_request_id?: string;
  source?: "direct_property" | "broker_request" | string;
  status: string;
  stage?:
    | "matching"
    | "broker_matched"
    | "docs_requested"
    | "docs_uploaded"
    | "under_review"
    | "approved"
    | "viewing_scheduled"
    | "rejected"
    | "withdrawn"
    | "completed"
    | "expired";
  dispatch_status?: string;
  dispatch_started_at?: string;
  response_deadline_at?: string;
  matched_broker_id?: string;
  matched_at?: string;
  dispatch_wave?: number;
  dispatched_broker_count?: number;
  documents_requested?: boolean;
  documents_requested_at?: string;
  fast_track_enabled?: boolean;
  sla_start_time?: string;
  sla_deadline?: string;
  sla_status?: string;
  sla_duration_seconds?: number;
  sla_remaining_seconds?: number;
  first_response_at?: string;
  response_time_seconds?: number;
  response_type?: string;
  user_verification_level?: string;
  documents_uploaded?: boolean;
  documents_verified?: boolean;
  viewing_scheduled?: boolean;
  viewing_scheduled_at?: string;
  viewing_completed_at?: string;
  application_submitted_at?: string;
  outcome?: string;
  closed_at?: string;
  notes?: string;
  reassigned_from?: string;
  reassign_count?: number;
  journey_type?: "rent" | "buy";
  journey_source?: "direct_property" | "broker_request_selection" | string;
  journey_stage?: string;
  next_action?: string;
  next_action_target?: string;
  status_reason?: string;
  blocking_requirements?: string[];
  pending_requirements?: string[];
  completed_requirements?: string[];
  override_reason?: string;
  property?: {
    id: string;
    title: string;
    address_line_1: string;
    city: string;
    postcode?: string;
    price: number;
    image_urls: string;
    property_type: string;
    agent_name: string;
    agent_company?: string;
    agent_email?: string;
    agent_phone?: string;
    listing_type?: string;
    latitude?: number;
    longitude?: number;
  };
  matched_broker?: LeadBrokerSummary;
  // UI-mapped fields
  name?: string;
  email?: string;
  phone?: string;
  property_name?: string;
  propertyInterested?: string;
  score?: number;
  budget?: string;
  lastContact?: string;
  created_at: string;
  updated_at: string;
}

export interface LeadAuditEntry {
  id: string;
  lead_id: string;
  action: string;
  actor: string;
  actor_id?: string | null;
  details?: string | Record<string, unknown> | null;
  timestamp: string;
}

export interface AdminBrokerOption {
  user_id: string;
  company_name?: string;
  branch_name?: string;
  business_phone?: string;
  verification_status?: string;
  fast_track_eligible?: boolean;
}

export interface CreateManualLeadRequest {
  name: string;
  email: string;
  phone?: string;
  property_interested: string;
  status?: string;
  score?: number;
  budget?: string;
  last_contact?: string;
}

export interface UpdateLeadRequest {
  name?: string;
  email?: string;
  phone?: string;
  property_interested?: string;
  status?: string;
  score?: number;
  budget?: string;
  last_contact?: string;
}

export interface SyncLeadLifecycleRequest {
  status?: string;
  stage?: string;
  viewing_scheduled?: boolean;
  viewing_scheduled_at?: string;
  viewing_completed_at?: string;
  application_submitted_at?: string;
  outcome?: string;
  closed_at?: string;
}

export interface UserDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_category: string;
  category_id?: string | null;
  virtual_storage_state?: "saved" | "case_only" | "pending_user_save" | "declined" | string;
  document_source?: "user_upload" | "manager_upload" | "system" | string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  status: string;
  reject_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  lead_id?: string | null;
  saved_to_virtual_storage_at?: string | null;
  declined_virtual_storage_at?: string | null;
  linked_entities?: Array<{
    type: string;
    id: string;
    fast_track_case_id?: string;
    lead_id?: string | null;
    application_id?: string | null;
    contract_id?: string | null;
    property_id?: string | null;
    request_id?: string | null;
    visibility?: string;
    status?: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface BrokerRequestRecord {
  id: string;
  user_id?: string;
  request_type: string;
  location: string;
  location_postcode?: string;
  latitude?: number;
  longitude?: number;
  budget?: string;
  details?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  status?: string;
  dispatch_status?: string;
  dispatch_started_at?: string;
  response_deadline_at?: string;
  dispatch_wave?: number;
  available_broker_count?: number;
  dispatched_broker_count?: number;
  matched_broker_id?: string;
  matched_at?: string;
  handoff_status?:
    | "awaiting_portfolio"
    | "portfolio_shared"
    | "property_selected"
    | "cancelled"
    | "archived"
    | string;
  handoff_due_at?: string;
  selected_property_id?: string;
  selected_lead_id?: string;
  selected_fast_track_case_id?: string;
  fast_track_enabled?: boolean;
  journey_type?: "rent" | "buy";
  journey_source?: "direct_property" | "broker_request_selection" | string;
  journey_stage?: string;
  next_action?: string;
  next_action_target?: string;
  status_reason?: string;
  blocking_requirements?: string[];
  pending_requirements?: string[];
  completed_requirements?: string[];
  override_reason?: string;
  matched_broker?: LeadBrokerSummary | null;
  selected_property?: {
    id: string;
    title: string;
    address_line_1: string;
    city: string;
    country?: string;
    postcode?: string;
    price: number;
    image_urls?: string;
    property_type: string;
    listing_type?: string;
  } | null;
  property_shares?: BrokerRequestPropertyShare[];
  created_at?: string;
  updated_at?: string;
}

export interface BrokerRequestPropertyShare {
  id: string;
  broker_request_id: string;
  broker_id: string;
  property_id: string;
  status: "shared" | "selected" | string;
  rank: number;
  note?: string;
  shared_at?: string;
  selected_at?: string;
  lead_id?: string | null;
  fast_track_case_id?: string | null;
  property?: {
    id: string;
    title: string;
    address_line_1: string;
    city: string;
    country?: string;
    postcode?: string;
    price: number;
    image_urls?: string;
    property_type: string;
    listing_type?: string;
  } | null;
}

const DOCUMENT_UPLOAD_TYPES: Record<
  string,
  { document_type: string; document_category: string }
> = {
  identity: {
    document_type: "government_id",
    document_category: "identity",
  },
  address: {
    document_type: "address_proof",
    document_category: "address",
  },
  proof_of_funds: {
    document_type: "proof_of_funds",
    document_category: "financial",
  },
  employment: {
    document_type: "employment_proof",
    document_category: "employment",
  },
  reference: {
    document_type: "reference_letter",
    document_category: "reference",
  },
  transactional: {
    document_type: "transaction_document",
    document_category: "transactional",
  },
  supporting_document: {
    document_type: "supporting_document",
    document_category: "supporting",
  },
};

export interface DocumentUploadOptions {
  targetUserId?: string;
  leadId?: string;
  fastTrackCaseId?: string;
  applicationId?: string;
  contractId?: string;
  propertyId?: string;
  managerId?: string;
  requestId?: string;
  linkFamily?: string;
  visibility?: string;
  requirementCodes?: string[];
  reusable?: boolean;
  documentType?: string;
  documentCategory?: string;
  categoryId?: string;
  virtualStorageState?: "saved" | "case_only" | "pending_user_save" | "declined" | string;
}

/**
 * Fetch leads for the logged-in user
 * GET /api/v1/leads/mine (core-service)
 */
export const getUserLeads = async (
  options: ServiceRequestOptions = {},
): Promise<{
  data: Lead[] | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<Lead[]>(`${CORE_URL()}/api/v1/leads/mine`, options);
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Fetch leads for the logged-in broker
 * GET /api/v1/leads/broker (core-service)
 */
export const getBrokerLeads = async (
  status?: string,
  options: ServiceRequestOptions = {},
): Promise<{ data: Lead[] | null; error: string | null }> => {
  try {
    const url = buildApiUrl(CORE_URL(), "/api/v1/leads/broker");
    if (status) url.searchParams.append("status", status);

    const data = await apiFetch<Lead[]>(url.toString(), options);
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Fetch a single lead by ID
 * GET /api/v1/leads/:id (core-service)
 */
export const getLeadById = async (
  leadId: string,
): Promise<{ data: Lead | null; error: string | null }> => {
  try {
    const data = await apiFetch<Lead>(`${CORE_URL()}/api/v1/leads/${leadId}`);
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Update lead status
 * PUT /api/v1/leads/:id/status (core-service)
 */
export const updateLeadStatus = async (
  leadId: string,
  status: string,
  reason: string = "",
): Promise<{ data: any; error: string | null }> => {
  try {
    const auditReason = reason.trim() || `Manager changed lead status to ${status}`;
    const data = await apiFetch<any>(
      `${CORE_URL()}/api/v1/leads/${leadId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status, reason: auditReason }),
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Sync lead lifecycle state
 * PUT /api/v1/leads/:id/lifecycle (core-service)
 */
export const syncLeadLifecycle = async (
  leadId: string,
  lifecycle: SyncLeadLifecycleRequest,
  options: ServiceRequestOptions = {},
): Promise<{ data: Lead | null; error: string | null }> => {
  try {
    const data = await apiFetch<Lead>(
      `${CORE_URL()}/api/v1/leads/${leadId}/lifecycle`,
      {
        method: "PUT",
        body: JSON.stringify(lifecycle),
        suppressErrorToast: options.suppressErrorToast,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Create a new lead (fast-track)
 * POST /api/v1/leads (core-service)
 */
export const createLead = async (
  propertyId: string,
): Promise<{ data: Lead | null; error: string | null }> => {
  try {
    const data = await apiFetch<Lead>(`${CORE_URL()}/api/v1/leads`, {
      method: "POST",
      body: JSON.stringify({ property_id: propertyId }),
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Create a broker request for agent matching
 * POST /api/v1/leads/broker-request (core-service)
 */
export const createBrokerRequest = async (requestData: {
  requestType: string;
  location: string;
  locationPostcode?: string;
  latitude?: number;
  longitude?: number;
  budget: string;
  details: string;
  fastTrackEnabled?: boolean;
}): Promise<{
  success: boolean;
  data: BrokerRequestRecord | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request`,
      {
        method: "POST",
        body: JSON.stringify({
          request_type: requestData.requestType,
          location: requestData.location,
          location_postcode: requestData.locationPostcode,
          latitude: requestData.latitude,
          longitude: requestData.longitude,
          budget: requestData.budget,
          details: requestData.details,
          fast_track_enabled: requestData.fastTrackEnabled,
        }),
      },
    );
    return { success: true, data, error: null };
  } catch (error: any) {
    return { success: false, data: null, error: getErrorMessage(error) };
  }
};

export const getUserBrokerRequests = async (
  options: BrokerRequestListClientOptions = {},
): Promise<{ data: BrokerRequestRecord[] | null; error: string | null }> => {
  try {
    const query = new URLSearchParams();
    if (options.status?.trim()) {
      query.set("status", options.status.trim());
    }
    if (options.sort?.trim()) {
      query.set("sort", options.sort.trim());
    }
    if (typeof options.limit === "number") {
      query.set("limit", String(options.limit));
    }
    if (typeof options.offset === "number") {
      query.set("offset", String(options.offset));
    }
    const path = query.toString()
      ? `/api/v1/leads/broker-request/mine?${query.toString()}`
      : "/api/v1/leads/broker-request/mine";
    const data = await apiFetch<BrokerRequestRecord[]>(
      `${CORE_URL()}${path}`,
      { suppressErrorToast: options.suppressErrorToast },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getBrokerRequestById = async (
  requestId: string,
  options: ServiceRequestOptions = {},
): Promise<{ data: BrokerRequestRecord | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}`,
      options,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getBrokerRequestOffers = async (
  options: BrokerRequestListClientOptions = {},
): Promise<{
  data: BrokerRequestRecord[] | null;
  error: string | null;
}> => {
  try {
    const query = new URLSearchParams();
    if (options.status?.trim()) {
      query.set("status", options.status.trim());
    }
    if (options.offerStatus?.trim()) {
      query.set("offer_status", options.offerStatus.trim());
    }
    if (options.sort?.trim()) {
      query.set("sort", options.sort.trim());
    }
    if (typeof options.limit === "number") {
      query.set("limit", String(options.limit));
    }
    if (typeof options.offset === "number") {
      query.set("offset", String(options.offset));
    }
    const path = query.toString()
      ? `/api/v1/leads/broker-request/broker?${query.toString()}`
      : "/api/v1/leads/broker-request/broker";
    const data = await apiFetch<BrokerRequestRecord[]>(
      `${CORE_URL()}${path}`,
      { suppressErrorToast: options.suppressErrorToast },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getBrokerRequestPropertyShares = async (
  requestId: string,
  options: ServiceRequestOptions = {},
): Promise<{
  data: BrokerRequestPropertyShare[] | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<BrokerRequestPropertyShare[]>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}/properties`,
      options,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const syncBrokerRequestPropertyShares = async (
  requestId: string,
  properties: Array<{ property_id: string; rank?: number; note?: string }>,
): Promise<{ data: BrokerRequestRecord | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}/properties`,
      {
        method: "PUT",
        body: JSON.stringify({ properties }),
        suppressErrorToast: true,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const selectBrokerRequestProperty = async (
  requestId: string,
  propertyId: string,
): Promise<{ data: BrokerRequestRecord | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}/properties/${propertyId}/select`,
      {
        method: "POST",
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const rematchBrokerRequest = async (
  requestId: string,
): Promise<{ data: BrokerRequestRecord | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}/rematch`,
      {
        method: "POST",
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const acceptBrokerRequestOffer = async (
  requestId: string,
): Promise<{ data: BrokerRequestRecord | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerRequestRecord>(
      `${CORE_URL()}/api/v1/leads/broker-request/${requestId}/accept`,
      {
        method: "POST",
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getBrokerAvailability = async (): Promise<{
  data: BrokerAvailabilityState | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<BrokerAvailabilityState>(
      `${CORE_URL()}/api/v1/leads/broker-availability`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const updateBrokerAvailability = async (
  available: boolean,
  coords?: { latitude?: number | null; longitude?: number | null },
): Promise<{ data: BrokerAvailabilityState | null; error: string | null }> => {
  try {
    const data = await apiFetch<BrokerAvailabilityState>(
      `${CORE_URL()}/api/v1/leads/broker-availability`,
      {
        method: "PUT",
        body: JSON.stringify({
          available,
          latitude:
            typeof coords?.latitude === "number" ? coords.latitude : undefined,
          longitude:
            typeof coords?.longitude === "number"
              ? coords.longitude
              : undefined,
        }),
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getNearbyAvailableBrokers = async (
  params: {
    postcode?: string;
    latitude?: number | null;
    longitude?: number | null;
    fastTrack?: boolean;
    page?: number;
    limit?: number;
  },
  options: ServiceRequestOptions = {},
): Promise<{
  data: LeadBrokerSummary[] | null;
  pagination: NearbyBrokerPagination | null;
  sort?: string;
  filter?: string;
  error: string | null;
}> => {
  try {
    const url = buildApiUrl(CORE_URL(), "/api/v1/leads/nearby-brokers");
    if (params.postcode) url.searchParams.set("postcode", params.postcode);
    if (typeof params.latitude === "number")
      url.searchParams.set("latitude", String(params.latitude));
    if (typeof params.longitude === "number")
      url.searchParams.set("longitude", String(params.longitude));
    if (typeof params.fastTrack === "boolean")
      url.searchParams.set("fast_track", String(params.fastTrack));
    if (typeof params.page === "number")
      url.searchParams.set("page", String(params.page));
    if (typeof params.limit === "number")
      url.searchParams.set("limit", String(params.limit));

    const response = await apiFetchEnvelope<LeadBrokerSummary[]>(url.toString(), options);
    const metadata = response as typeof response & { sort?: unknown; filter?: unknown };
    return {
      data: response.data || [],
      pagination: response.pagination || null,
      sort: typeof metadata.sort === "string" ? metadata.sort : undefined,
      filter: typeof metadata.filter === "string" ? metadata.filter : undefined,
      error: null,
    };
  } catch (error: any) {
    return { data: null, pagination: null, error: getErrorMessage(error) };
  }
};

/**
 * Create a NEW MANUAL lead (broker)
 * POST /api/v1/leads/manual (core-service)
 */
export const createManualLead = async (
  leadData: CreateManualLeadRequest,
): Promise<{ data: Lead | null; error: string | null }> => {
  try {
    const data = await apiFetch<Lead>(`${CORE_URL()}/api/v1/leads/manual`, {
      method: "POST",
      suppressErrorToast: true,
      body: JSON.stringify(leadData),
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Update lead details
 * PUT /api/v1/leads/:id (core-service)
 */
export const updateLead = async (
  leadId: string,
  leadData: UpdateLeadRequest,
): Promise<{ data: Lead | null; error: string | null }> => {
  try {
    const data = await apiFetch<Lead>(`${CORE_URL()}/api/v1/leads/${leadId}`, {
      method: "PUT",
      suppressErrorToast: true,
      body: JSON.stringify(leadData),
    });
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Delete lead (soft delete)
 * DELETE /api/v1/leads/:id (core-service)
 */
export const deleteLead = async (
  leadId: string,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await apiFetch<any>(`${CORE_URL()}/api/v1/leads/${leadId}`, {
      method: "DELETE",
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: getErrorMessage(error) };
  }
};

/**
 * Respond to a lead (broker action)
 * POST /api/v1/leads/:id/respond (core-service)
 */
export const respondToLead = async (
  leadId: string,
  responseType: "call" | "message" | "schedule_viewing" | "request_docs",
  message?: string,
  viewingDate?: string,
  options: ServiceRequestOptions = {},
): Promise<{ data: any; error: string | null }> => {
  try {
    const data = await apiFetch<any>(
      `${CORE_URL()}/api/v1/leads/${leadId}/respond`,
      {
        method: "POST",
        body: JSON.stringify({
          response_type: responseType,
          message,
          viewing_date: viewingDate,
        }),
        suppressErrorToast: options.suppressErrorToast,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Get lead audit trail
 * GET /api/v1/leads/:id/audit (core-service)
 */
export const getLeadAudit = async (
  leadId: string,
): Promise<{ data: LeadAuditEntry[] | null; error: string | null }> => {
  try {
    const data = await apiFetch<LeadAuditEntry[]>(
      `${CORE_URL()}/api/v1/leads/${leadId}/audit`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Get all leads (admin)
 * GET /api/v1/admin/leads (core-service, admin)
 */
export const getAllLeads = async (
  page: number = 1,
  limit: number = 20,
  options: { search?: string; status?: string; sort?: string } = {},
): Promise<{
  data: Lead[] | null;
  pagination?: { total?: number; page?: number; limit?: number } | null;
  error: string | null;
}> => {
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (options.search?.trim()) {
      query.set("search", options.search.trim());
    }
    if (options.status?.trim()) {
      query.set("status", options.status.trim());
    }
    if (options.sort?.trim()) {
      query.set("sort", options.sort.trim());
    }
    const response = await apiFetchEnvelope<Lead[]>(
      `${CORE_URL()}/api/v1/admin/leads?${query.toString()}`,
    );
    return {
      data: response.data || [],
      pagination: response.pagination || null,
      error: null,
    };
  } catch (error: any) {
    return { data: null, pagination: null, error: getErrorMessage(error) };
  }
};

export const getAdminBrokers = async (
  page: number = 1,
  limit: number = 50,
  status: string = "approved",
): Promise<{
  data: AdminBrokerOption[] | null;
  pagination?: { total?: number; page?: number; limit?: number } | null;
  error: string | null;
}> => {
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (status) {
      query.set("status", status);
    }
    const response = await apiFetchEnvelope<AdminBrokerOption[]>(
      `${CORE_URL()}/api/v1/brokers?${query.toString()}`,
    );
    return {
      data: response.data || [],
      pagination: response.pagination || null,
      error: null,
    };
  } catch (error: any) {
    return { data: null, pagination: null, error: getErrorMessage(error) };
  }
};

/**
 * Reassign a lead to another broker (admin)
 * PUT /api/v1/admin/leads/:id/reassign (core-service, admin)
 */
export const reassignLead = async (
  leadId: string,
  newBrokerId: string,
  reason: string = "",
): Promise<{ data: any; error: string | null }> => {
  try {
    const payload: { broker_id: string; reason?: string } = { broker_id: newBrokerId };
    const trimmedReason = reason.trim();
    if (trimmedReason) {
      payload.reason = trimmedReason;
    }

    const data = await apiFetch<any>(
      `${CORE_URL()}/api/v1/admin/leads/${leadId}/reassign`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/** Maximum document upload size: 10 MB. */
export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * Magic-byte signatures for the file types we accept. The browser-reported
 * MIME type can be spoofed; these bytes are what the file actually starts
 * with on disk and are far more trustworthy.
 */
const DOCUMENT_MAGIC_SIGNATURES: Array<{
  ext: string;
  mimes: readonly string[];
  bytes: readonly number[];
}> = [
  { ext: "pdf", mimes: ["application/pdf"], bytes: [0x25, 0x50, 0x44, 0x46] },
  { ext: "png", mimes: ["image/png"], bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { ext: "jpg", mimes: ["image/jpeg", "image/jpg"], bytes: [0xff, 0xd8, 0xff] },
];

const readFileSliceAsArrayBuffer = (file: File, start: number, end: number): Promise<ArrayBuffer> =>
  file.slice(start, end).arrayBuffer();

/**
 * Validates a document upload. Rejects oversized files, files with
 * disallowed MIME types, and files whose leading bytes do not match the
 * declared MIME type. Returns the matched extension on success.
 */
export const validateDocumentUpload = async (file: File): Promise<string> => {
  if (!file) throw new Error("No file selected. Please choose a document to upload.");
  if (typeof file.size === "number" && file.size > MAX_DOCUMENT_SIZE_BYTES) {
    const sizeMb = (MAX_DOCUMENT_SIZE_BYTES / (1024 * 1024)).toFixed(0);
    throw new Error(`File is too large. Maximum size is ${sizeMb} MB.`);
  }
  const declaredMime = (file.type || "").toLowerCase();
  const candidate = DOCUMENT_MAGIC_SIGNATURES.find((sig) => sig.mimes.includes(declaredMime));
  if (!candidate) {
    throw new Error("Only PDF, PNG, and JPEG files are supported.");
  }
  const head = await readFileSliceAsArrayBuffer(file, 0, candidate.bytes.length);
  const headBytes = new Uint8Array(head);
  for (let i = 0; i < candidate.bytes.length; i += 1) {
    if (headBytes[i] !== candidate.bytes[i]) {
      throw new Error(
        `File contents do not match the declared type (${declaredMime}). The upload was rejected.`,
      );
    }
  }
  return candidate.ext;
};

/**
 * Upload a document for verification
 * POST /api/v1/documents (core-service)
 */
export const uploadDocument = async (
  type: string,
  file: File,
  options: DocumentUploadOptions = {},
): Promise<{
  success: boolean;
  data: UserDocument | null;
  error: string | null;
}> => {
  try {
    await validateDocumentUpload(file);
    const mapping = DOCUMENT_UPLOAD_TYPES[type];
    const resolvedDocumentType = options.documentType || mapping?.document_type;
    const resolvedDocumentCategory =
      options.documentCategory || mapping?.document_category;
    if (!resolvedDocumentType || !resolvedDocumentCategory) {
      throw new Error(
        `Document upload type "${type}" is not supported on develop`,
      );
    }

    const uploadedFile = await uploadMediaFile(
      file,
      "document",
      crypto.randomUUID(),
      file.name,
      false,
    );

    const data = await apiFetch<UserDocument>(
      `${CORE_URL()}/api/v1/documents`,
      {
        method: "POST",
        body: JSON.stringify({
          document_type: resolvedDocumentType,
          document_category: resolvedDocumentCategory,
          media_id: uploadedFile.id,
          file_name: file.name,
          file_url: uploadedFile.file_url,
          file_size: file.size,
          mime_type: file.type,
          target_user_id: options.targetUserId || "",
          lead_id: options.leadId || "",
          fast_track_case_id: options.fastTrackCaseId || "",
          application_id: options.applicationId || "",
          contract_id: options.contractId || "",
          property_id: options.propertyId || "",
          manager_id: options.managerId || "",
          request_id: options.requestId || "",
          link_family: options.linkFamily || "",
          visibility: options.visibility || "",
          requirement_codes: options.requirementCodes || [],
          reusable: options.reusable ?? false,
          category_id: options.categoryId || "",
          virtual_storage_state: options.virtualStorageState || "",
        }),
      },
    );
    return { success: true, data, error: null };
  } catch (error: any) {
    return { success: false, data: null, error: getErrorMessage(error) };
  }
};

export const getUserDocuments = async (
  options: ServiceRequestOptions = {},
): Promise<{
  data: UserDocument[];
  verificationLevel: string | null;
  error: string | null;
}> => {
  try {
    const response = await apiFetch<{
      documents?: UserDocument[];
      verification_level?: string;
    }>(`${CORE_URL()}/api/v1/documents`, options);

    return {
      data: response.documents || [],
      verificationLevel: response.verification_level || null,
      error: null,
    };
  } catch (error: any) {
    return {
      data: [],
      verificationLevel: null,
      error: getErrorMessage(error),
    };
  }
};

export const deleteDocument = async (
  documentId: string,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await apiFetch(`${CORE_URL()}/api/v1/documents/${encodeURIComponent(documentId)}`, {
      method: "DELETE",
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: getErrorMessage(error) };
  }
};

/**
 * Resend email verification
 * POST /api/v1/auth/resend-verification (core-service)
 */
export const resendVerification = async (
  email: string,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    await apiFetch<any>(`${CORE_URL()}/api/v1/auth/resend-verification`, {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: getErrorMessage(error) };
  }
};

export const leadsService = {
  getUserLeads,
  getBrokerLeads,
  getLeadById,
  updateLeadStatus,
  createLead,
  createBrokerRequest,
  getUserBrokerRequests,
  getBrokerRequestById,
  getBrokerRequestOffers,
  getBrokerRequestPropertyShares,
  syncBrokerRequestPropertyShares,
  selectBrokerRequestProperty,
  rematchBrokerRequest,
  acceptBrokerRequestOffer,
  getBrokerAvailability,
  updateBrokerAvailability,
  getNearbyAvailableBrokers,
  createManualLead,
  updateLead,
  syncLeadLifecycle,
  deleteLead,
  respondToLead,
  getLeadAudit,
  getAllLeads,
  getAdminBrokers,
  reassignLead,
  uploadDocument,
  getUserDocuments,
  deleteDocument,
  resendVerification,
};
