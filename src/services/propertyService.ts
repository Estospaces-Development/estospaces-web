/**
 * Property Service
 * Fetches property data from core-service backend
 */

import {
  apiFetch,
  apiFetchEnvelope,
  buildApiUrl,
  getErrorMessage,
  getErrorStatus,
  getServiceUrl,
} from "@/lib/apiUtils";
import { createAsyncRequestCache } from "@/lib/asyncRequestCache";
import { getAuthToken, getAuthTokenVersion } from "@/lib/authToken";
import { LAUNCH_COUNTRY_CODE } from "@/lib/launchLocale";
import { normalizeSavedPropertyId } from "@/lib/savedPropertyState";
import type {
  JourneyAction,
  JourneyBlocker,
  JourneyDeadline,
  JourneyRequirement,
} from "@/types/journey";

const CORE_URL = () => getServiceUrl("core");
const PROPERTY_DETAIL_CACHE_TTL_MS = 5 * 60_000;
const PROPERTY_LIST_CACHE_TTL_MS = 60_000;

interface CachedPropertyLookup {
  cacheable: boolean;
  data: Property | null;
  error: string | null;
}

const propertyDetailCache = createAsyncRequestCache<CachedPropertyLookup>(
  PROPERTY_DETAIL_CACHE_TTL_MS,
  (result) => result.cacheable,
);

interface PropertyListResult {
  data: Property[] | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  } | null;
  error: string | null;
}

const propertyListCache = createAsyncRequestCache<PropertyListResult>(
  PROPERTY_LIST_CACHE_TTL_MS,
  (result) => result.error === null,
);

export const invalidatePropertyListCache = () => {
  propertyListCache.clear();
};

export const invalidatePropertyDetailCache = (id: string) => {
  const normalizedId = id.trim();
  const sessionVersion = getAuthTokenVersion();
  propertyDetailCache.delete(`${sessionVersion}|${normalizedId}|silent`);
  propertyDetailCache.delete(`${sessionVersion}|${normalizedId}|default`);
};

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
  floor_number?: number;
  total_floors?: number;
  occupied_units?: number;
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
): Promise<PropertyListResult> => {
  const url = buildApiUrl(CORE_URL(), endpoint);
  Object.keys(filters)
    .filter((key) => key !== "_cache_key")
    .sort()
    .forEach((key) => {
      const param = FILTER_PARAM_MAP[key] || key;
      const value = normalizeFilterValue(filters[key]);
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.append(param, String(value));
      }
    });

  const cacheKey = `${getAuthTokenVersion()}|${url.toString()}`;
  return propertyListCache.get(cacheKey, async () => {
    try {
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
  });
};

/**
 * Fetch properties with optional filters
 * GET /api/v1/properties (core-service)
 */
export const getProperties = async (filters: Record<string, any> = {}) => {
  const endpoint = getAuthToken()
    ? "/api/v1/properties/catalog"
    : "/api/v1/properties";
  return fetchPropertyList(endpoint, filters);
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
  options: Pick<PropertyMutationOptions, "suppressErrorToast"> = {},
): Promise<{ data: Property | null; error: string | null }> => {
  const normalizedId = id.trim();
  const cacheKey = `${getAuthTokenVersion()}|${normalizedId}|${options.suppressErrorToast === true ? "silent" : "default"}`;
  const result = await propertyDetailCache.get(cacheKey, async () => {
    try {
      const endpoint = getAuthToken()
        ? `/api/v1/properties/catalog/${normalizedId}`
        : `/api/v1/properties/${normalizedId}`;
      const data = await apiFetch<Property>(
        `${CORE_URL()}${endpoint}`,
        options,
      );
      return { cacheable: true, data, error: null };
    } catch (error: unknown) {
      return {
        cacheable: getErrorStatus(error) === 404,
        data: null,
        error: getErrorMessage(error),
      };
    }
  });

  return { data: result.data, error: result.error };
};

export const getPropertyContextsByIds = async (
  ids: string[],
  options: Pick<PropertyMutationOptions, "suppressErrorToast"> = {},
): Promise<{ data: Property[] | null; error: string | null }> => {
  const normalizedIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  if (normalizedIds.length === 0) {
    return { data: [], error: null };
  }

  try {
    const data = await apiFetch<Property[]>(
      `${CORE_URL()}/api/v1/properties/catalog/context?ids=${encodeURIComponent(normalizedIds.join(","))}`,
      { suppressErrorToast: options.suppressErrorToast ?? true },
    );
    return { data: data || [], error: null };
  } catch (error: unknown) {
    if (getErrorStatus(error) === 404) {
      const fallbackResults = await Promise.all(
        normalizedIds.map((id) => getPropertyById(id, { suppressErrorToast: true })),
      );
      return {
        data: fallbackResults.flatMap((result) => result.data ? [result.data] : []),
        error: null,
      };
    }
    return { data: null, error: getErrorMessage(error) };
  }
};

/**
 * Record an intentional end-user property detail view.
 * Reading a property is deliberately side-effect free; callers should invoke
 * this once when a signed-in user actually opens the detail page.
 */
export const recordPropertyView = async (
  id: string,
): Promise<{ recorded: boolean; error: string | null }> => {
  try {
    await apiFetch<{ property_id: string; recorded: boolean }>(
      `${CORE_URL()}/api/v1/properties/${encodeURIComponent(id.trim())}/view`,
      {
        method: "POST",
        suppressErrorToast: true,
      },
    );
    return { recorded: true, error: null };
  } catch (error: unknown) {
    return { recorded: false, error: getErrorMessage(error) };
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
      suppressErrorToast: options.suppressErrorToast ?? true,
    });
    invalidatePropertyListCache();
    invalidatePropertyDetailCache(data.id);
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
        suppressErrorToast: options.suppressErrorToast ?? true,
      },
    );
    invalidatePropertyListCache();
    invalidatePropertyDetailCache(id);
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
    invalidatePropertyListCache();
    invalidatePropertyDetailCache(id);
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
    invalidatePropertyListCache();
    invalidatePropertyDetailCache(id);
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
    const propertyId = normalizeSavedPropertyId(id);
    if (!propertyId) {
      return { error: "Missing property id" };
    }

    await apiFetch<any>(`${CORE_URL()}/api/v1/properties/${propertyId}/save`, {
      method: "POST",
      suppressErrorToast: true,
    });
    invalidatePropertyDetailCache(propertyId);
    return { error: null };
  } catch (error: any) {
    return { error: getErrorMessage(error) };
  }
};

export const copyProperty = async (
  id: string,
): Promise<{ data: Property | null; error: string | null }> => {
  try {
    const data = await apiFetch<Property>(`${CORE_URL()}/api/v1/properties/${id}/copy`, {
      method: "POST",
      suppressErrorToast: true,
    });
    invalidatePropertyListCache();
    invalidatePropertyDetailCache(data.id);
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
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
    const propertyId = normalizeSavedPropertyId(id);
    if (!propertyId) {
      return { error: "Missing property id" };
    }

    await apiFetch<any>(`${CORE_URL()}/api/v1/properties/${propertyId}/save`, {
      method: "DELETE",
      suppressErrorToast: true,
    });
    invalidatePropertyDetailCache(propertyId);
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
      { suppressErrorToast: true },
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
  country: string = LAUNCH_COUNTRY_CODE,
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
  options: Pick<PropertyMutationOptions, "suppressErrorToast"> = {},
): Promise<{
  data: PropertyComplianceReadiness | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<PropertyComplianceReadiness>(
      `${CORE_URL()}/api/v1/properties/${propertyId}/compliance-readiness`,
      { suppressErrorToast: options.suppressErrorToast ?? true },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getPropertyComplianceEvidence = async (
  propertyId: string,
  options: Pick<PropertyMutationOptions, "suppressErrorToast"> = {},
): Promise<{
  data: PropertyComplianceEvidenceEnvelope | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<PropertyComplianceEvidenceEnvelope>(
      `${CORE_URL()}/api/v1/properties/${propertyId}/compliance-evidence`,
      { suppressErrorToast: options.suppressErrorToast ?? true },
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
  options: Pick<PropertyMutationOptions, "suppressErrorToast"> = {},
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
        suppressErrorToast: options.suppressErrorToast ?? true,
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};
