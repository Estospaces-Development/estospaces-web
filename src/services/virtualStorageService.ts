import { apiFetch, getErrorMessage, getServiceUrl } from "@/lib/apiUtils";
import type { UserDocument } from "@/services/leadsService";

const CORE_URL = () => getServiceUrl("core");

export interface VirtualStorageCategory {
  id: string;
  user_id?: string;
  name: string;
  slug: string;
  source: "system" | "user" | "manager" | string;
  created_by?: string;
  created_by_role?: string;
  fast_track_case_id?: string | null;
  lead_id?: string | null;
  application_id?: string | null;
  contract_id?: string | null;
  property_id?: string | null;
  request_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface VirtualStorageCategoriesResponse {
  categories: VirtualStorageCategory[];
  custom_categories_unlocked: boolean;
  required_documents_submitted: Record<string, boolean>;
}

export interface CreateVirtualStorageCategoryPayload {
  name: string;
  user_id?: string;
  fast_track_case_id?: string;
  lead_id?: string;
  application_id?: string;
  contract_id?: string;
  property_id?: string;
  request_id?: string;
}

export interface VirtualStorageDocumentsResponse {
  documents: UserDocument[];
  document_count: number;
  pending_save_count: number;
}

export interface SaveDocumentToVirtualStoragePayload {
  category_id?: string;
}

export const getVirtualStorageCategories = async (): Promise<{
  data: VirtualStorageCategoriesResponse | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<VirtualStorageCategoriesResponse>(
      `${CORE_URL()}/api/v1/virtual-storage/categories`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const createVirtualStorageCategory = async (
  payload: CreateVirtualStorageCategoryPayload,
): Promise<{ data: VirtualStorageCategory | null; error: string | null }> => {
  try {
    const data = await apiFetch<VirtualStorageCategory>(
      `${CORE_URL()}/api/v1/virtual-storage/categories`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const getVirtualStorageDocuments = async (): Promise<{
  data: VirtualStorageDocumentsResponse | null;
  error: string | null;
}> => {
  try {
    const data = await apiFetch<VirtualStorageDocumentsResponse>(
      `${CORE_URL()}/api/v1/virtual-storage/documents`,
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const saveDocumentToVirtualStorage = async (
  documentId: string,
  payload: SaveDocumentToVirtualStoragePayload = {},
): Promise<{ data: UserDocument | null; error: string | null }> => {
  try {
    const data = await apiFetch<UserDocument>(
      `${CORE_URL()}/api/v1/virtual-storage/documents/${encodeURIComponent(documentId)}/save`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const declineVirtualStorageSave = async (
  documentId: string,
): Promise<{ data: UserDocument | null; error: string | null }> => {
  try {
    const data = await apiFetch<UserDocument>(
      `${CORE_URL()}/api/v1/virtual-storage/documents/${encodeURIComponent(documentId)}/decline-save`,
      { method: "POST" },
    );
    return { data, error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};
