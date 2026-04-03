/**
 * Property Service
 * Fetches property data from core-service backend
 */

import {
  apiFetch,
  apiFetchEnvelope,
  getErrorMessage,
  getServiceUrl,
} from "@/lib/apiUtils";
import type {
  JourneyAction,
  JourneyBlocker,
  JourneyDeadline,
  JourneyRequirement,
} from "@/types/journey";

const CORE_URL = () => getServiceUrl("core");

interface PropertyMutationOptions {
  suppressErrorToast?: boolean;
  throwOnError?: boolean;
}

export interface Property {
  id: string;
  manager_id?: string;
  title: string;
  description?: string;
  property_type: string; // house, apartment, etc.
  listing_type: "rent" | "sale" | "lease" | "short_term";
  status: string;
  rejection_reason?: string;
  price: number;
  currency: string;
  deposit_amount?: number;
  maintenance_charges?: number;
  bedrooms: number;
  bathrooms: number;
  property_size_sqft?: number;
  carpet_area?: number;
  year_built?: number;
  furnished?: boolean;
  condition?: string;
  facing?: string;
  parking_spaces?: number;
  featured?: boolean;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  postcode: string;
  country: string;
  latitude?: number | string;
  longitude?: number | string;
  available_from?: string;
  minimum_lease?: number;
  inclusions?: string;
  exclusions?: string;
  image_urls?: string[];
  video_urls?: string[];
  virtual_tour_url?: string;
  virtual_tour_status?: VirtualTourStatus;
  active_virtual_tour_request?: VirtualTourRequest | null;
  features?: string[] | string;
  amenities?: string[] | string;
  views?: number;
  inquiries?: number;
  favorites?: number;
  is_verified?: boolean;
  agent_name?: string;
  agent_email?: string;
  agent_phone?: string;
  alternate_phone?: string;
  preferred_contact_method?: "email" | "phone" | "whatsapp" | "any";
  license_number?: string;
  agent_company?: string;
  created_at?: string;
  updated_at?: string;
}

export type VirtualTourStatus =
  | "unavailable"
  | "requested"
  | "processing"
  | "ready";

export interface VirtualTourRequest {
  id: string;
  property_id: string;
  manager_id: string;
  requested_by: string;
  status: VirtualTourStatus;
  request_note?: string;
  fulfillment_note?: string;
  virtual_tour_url?: string;
  fulfilled_by?: string | null;
  fulfilled_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface PropertyComplianceReadiness {
  jurisdiction_profile: string;
  listing_type: string;
  status: string;
  status_reason?: string;
  blockers?: JourneyBlocker[];
  deadlines?: JourneyDeadline[];
  required_evidence?: JourneyRequirement[];
  next_actions?: JourneyAction[];
  updated_at?: string | null;
}

export interface PropertyComplianceEvidence {
  id: string;
  property_id: string;
  category: string;
  jurisdiction: string;
  status: string;
  reference_number?: string;
  document_url?: string;
  issued_at?: string | null;
  expires_at?: string | null;
  served_at?: string | null;
  reviewed_at?: string | null;
  reviewer_id?: string | null;
  created_by: string;
  updated_by: string;
  review_notes?: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface PropertyComplianceEvidencePayload {
  status?: string;
  jurisdiction?: string;
  reference_number?: string;
  document_url?: string;
  issued_at?: string;
  expires_at?: string;
  served_at?: string;
  review_notes?: string;
  metadata?: string;
}

interface PropertyComplianceEvidenceEnvelope {
  evidence: PropertyComplianceEvidence[];
  readiness: PropertyComplianceReadiness | null;
}

export interface PropertyFilters {
  country?: string;
  city?: string;
  type?: string;
  status?: string;
  search?: string;
  manager_id?: string;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  limit?: number;
  min_price?: number;
  max_price?: number;
  min_bedrooms?: number;
  max_bedrooms?: number;
  featured?: boolean;
  is_verified?: boolean;
}

export type AdminPropertyStatus = "published" | "rejected" | "suspended";

interface PropertyPagination {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface PropertyListPayload {
  data: Property[];
  pagination: PropertyPagination;
}

const FILTER_PARAM_MAP: Record<string, string> = {
  country: "country",
  city: "city",
  type: "type",
  propertyType: "type",
  listingType: "listing_type",
  listing_type: "listing_type",
  status: "status",
  search: "search",
  manager_id: "manager_id",
  managerId: "manager_id",
  sort_by: "sort_by",
  sort_order: "sort_order",
  page: "page",
  limit: "limit",
  min_price: "min_price",
  priceMin: "min_price",
  max_price: "max_price",
  priceMax: "max_price",
  min_bedrooms: "min_bedrooms",
  bedroomsMin: "min_bedrooms",
  max_bedrooms: "max_bedrooms",
  bedroomsMax: "max_bedrooms",
  featured: "featured",
  is_verified: "is_verified",
  verified: "is_verified",
};

const normalizeFilterValue = (value: unknown) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter((item) => item.length > 0)
      .join(",");
  }

  return value;
};

const fetchPropertyList = async (
  endpoint: string,
  filters: Record<string, any> = {},
): Promise<{
  data: Property[] | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  error: string | null;
}> => {
  try {
    const url = new URL(`${CORE_URL()}${endpoint}`);
    Object.keys(filters).forEach((key) => {
      const param = FILTER_PARAM_MAP[key] || key;
      const value = normalizeFilterValue(filters[key]);
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(param, String(value));
      }
    });

    const response = await apiFetchEnvelope<PropertyListPayload>(
      url.toString(),
    );
    const payload = response.data;
    const properties = Array.isArray(payload?.data) ? payload.data : [];
    const pagination = payload?.pagination
      ? {
          page: payload.pagination.page,
          limit: payload.pagination.limit,
          total: payload.pagination.total,
          totalPages: payload.pagination.total_pages,
        }
      : null;

    return { data: properties, pagination, error: null };
  } catch (error: any) {
    return { data: null, pagination: null, error: getErrorMessage(error) };
  }
};

/**
 * Fetch properties with optional filters
 * GET /api/v1/properties (core-service)
 */
export const getProperties = async (filters: Record<string, any> = {}) => {
  return fetchPropertyList("/api/v1/properties", filters);
};

/**
 * Fetch all properties for admin review
 * GET /api/v1/admin/properties (core-service, admin only)
 */
export const getAdminProperties = async (filters: Record<string, any> = {}) => {
  return fetchPropertyList("/api/v1/admin/properties", filters);
};

/**
 * Fetch a single property by ID
 * GET /api/v1/properties/:id (core-service)
 */
export const getPropertyById = async (
  id: string,
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(
      `${CORE_URL()}/api/v1/properties/${id}`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Fetch a single property by ID for admin review
 * GET /api/v1/admin/properties/:id (core-service, admin only)
 */
export const getAdminPropertyById = async (
  id: string,
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(
      `${CORE_URL()}/api/v1/admin/properties/${id}`,
      {
        suppressErrorToast: true,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Create a new property
 * POST /api/v1/properties (core-service, manager/admin)
 */
export const createProperty = async (
  propertyData: Partial<Property>,
  options: PropertyMutationOptions = {},
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(`${CORE_URL()}/api/v1/properties`, {
      method: "POST",
      body: JSON.stringify(propertyData),
      suppressErrorToast: options.suppressErrorToast,
    });
    return { data, error: null };
  } catch (error: any) {
    if (options.throwOnError) {
      throw error;
    }
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Update a property
 * PUT /api/v1/properties/:id (core-service, owner/admin)
 */
export const updateProperty = async (
  id: string,
  propertyData: Partial<Property>,
  options: PropertyMutationOptions = {},
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(
      `${CORE_URL()}/api/v1/properties/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(propertyData),
        suppressErrorToast: options.suppressErrorToast,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    if (options.throwOnError) {
      throw error;
    }
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Update property lifecycle status as an admin
 * PUT /api/v1/admin/properties/:id/status (core-service, admin)
 */
export const adminUpdatePropertyStatus = async (
  id: string,
  status: AdminPropertyStatus,
  reason?: string,
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(
      `${CORE_URL()}/api/v1/admin/properties/${id}/status`,
      {
        method: "PUT",
        body: JSON.stringify({
          status,
          reason,
        }),
        suppressErrorToast: true,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Delete a property
 * DELETE /api/v1/properties/:id (core-service, owner/admin)
 */
export const deleteProperty = async (
  id: string,
): Promise<{ error: string | null }> => {
  try {
    await apiFetch<any>(`${CORE_URL()}/api/v1/properties/${id}`, {
      method: "DELETE",
      suppressErrorToast: true,
    });
    return { error: null };
  } catch (error: any) {
    return { error: getErrorMessage(error) };
  }
};

/**
 * Save a property to favorites
 * POST /api/v1/properties/:id/save (core-service)
 */
export const saveProperty = async (
  id: string,
): Promise<{ error: string | null }> => {
  try {
    await apiFetch<any>(`${CORE_URL()}/api/v1/properties/${id}/save`, {
      method: "POST",
    });
    return { error: null };
  } catch (error: any) {
    return { error: getErrorMessage(error) };
  }
};

/**
 * Unsave a property from favorites
 * DELETE /api/v1/properties/:id/save (core-service)
 */
export const unsaveProperty = async (
  id: string,
): Promise<{ error: string | null }> => {
  try {
    await apiFetch<any>(`${CORE_URL()}/api/v1/properties/${id}/save`, {
      method: "DELETE",
    });
    return { error: null };
  } catch (error: any) {
    return { error: getErrorMessage(error) };
  }
};

/**
 * Get user's saved properties
 * GET /api/v1/properties/saved (core-service)
 */
export const getSavedProperties = async (): Promise<{
  data: Property[] | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<Property[]>(
      `${CORE_URL()}/api/v1/properties/saved`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Get property sections for the homepage
 * GET /api/v1/properties/sections (core-service)
 */
export const getPropertySections = async (
  country: string = "UK",
): Promise<{ data: any; error: string | null }> => {
  try {
    const data = await apiFetch<any>(
      `${CORE_URL()}/api/v1/properties/sections?country=${country}`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getPropertyComplianceReadiness = async (
  propertyId: string,
): Promise<{
  data: PropertyComplianceReadiness | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<PropertyComplianceReadiness>(
      `${CORE_URL()}/api/v1/properties/${propertyId}/compliance-readiness`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getPropertyComplianceEvidence = async (
  propertyId: string,
): Promise<{
  data: PropertyComplianceEvidenceEnvelope | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<PropertyComplianceEvidenceEnvelope>(
      `${CORE_URL()}/api/v1/properties/${propertyId}/compliance-evidence`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const upsertPropertyComplianceEvidence = async (
  propertyId: string,
  category: string,
  payload: PropertyComplianceEvidencePayload,
): Promise<{
  data: PropertyComplianceEvidenceEnvelope | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<PropertyComplianceEvidenceEnvelope>(
      `${CORE_URL()}/api/v1/properties/${propertyId}/compliance-evidence/${category}`,
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
