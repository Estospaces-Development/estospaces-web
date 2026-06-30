import { apiFetch, getServiceUrl } from "@/lib/apiUtils";
import type { ApiFetchOptions } from "@/lib/apiUtils";
import { normalizeContract } from "@/lib/contractStatus";
import { Contract } from "@/types/booking";

const BOOKING_URL = () => getServiceUrl("booking");
type ServiceRequestOptions = Pick<ApiFetchOptions, "suppressErrorToast">;

export interface CreateContractRequest {
  application_id: string;
  start_date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  monthly_rent: number;
  deposit_amount: number;
  terms_and_conditions?: string;
}

export interface SignContractRequest {
  signer_role: "user" | "manager";
}

export interface TenancyPackServiceRecord {
  id: string;
  contract_id: string;
  jurisdiction: string;
  pack_type?: string;
  status: string;
  issued_at?: string | null;
  served_at?: string | null;
  reviewer_id?: string | null;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DepositProtectionRecord {
  id: string;
  contract_id: string;
  jurisdiction: string;
  status: string;
  scheme_name?: string;
  deposit_amount?: number | null;
  deposit_received: boolean;
  first_rent_received: boolean;
  protected_at?: string | null;
  information_served_at?: string | null;
  reviewer_id?: string | null;
  review_notes?: string;
  created_at: string;
  updated_at: string;
}

export const createContract = async (
  data: CreateContractRequest,
): Promise<{ data: Contract | null; error: string | null }> => {
  try {
    const response = await apiFetch<Contract>(
      `${BOOKING_URL()}/api/v1/contracts`,
      {
        method: "POST",
        body: JSON.stringify(data),
        suppressErrorToast: true,
      },
    );
    return { data: normalizeContract(response), error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to create contract" };
  }
};

export const getContract = async (
  id: string,
  options: ServiceRequestOptions = {},
): Promise<{ data: Contract | null; error: string | null }> => {
  try {
    const response = await apiFetch<Contract>(
      `${BOOKING_URL()}/api/v1/contracts/${id}`,
      { suppressErrorToast: options.suppressErrorToast ?? true },
    );
    return { data: normalizeContract(response), error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to fetch contract" };
  }
};

export const getUserContracts = async (
  options: ServiceRequestOptions = {},
): Promise<{ data: Contract[] | null; error: string | null }> => {
  try {
    const response = await apiFetch<Contract[]>(
      `${BOOKING_URL()}/api/v1/contracts/mine`,
      { suppressErrorToast: options.suppressErrorToast ?? true },
    );
    return { data: response.map(normalizeContract), error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to fetch contracts" };
  }
};

export const signContract = async (
  id: string,
  role: "user" | "manager",
): Promise<{ data: Contract | null; error: string | null }> => {
  try {
    const payload: SignContractRequest = { signer_role: role };
    const response = await apiFetch<{ message: string; contract: Contract }>(
      `${BOOKING_URL()}/api/v1/contracts/${id}/sign`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
        suppressErrorToast: true,
      },
    );
    return { data: normalizeContract(response.contract), error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to sign contract" };
  }
};

export const getTenancyPackService = async (
  id: string,
): Promise<{ data: TenancyPackServiceRecord | null; error: string | null }> => {
  try {
    const response = await apiFetch<TenancyPackServiceRecord>(
      `${BOOKING_URL()}/api/v1/contracts/${id}/tenancy-pack`,
      { suppressErrorToast: true },
    );
    return { data: response, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to fetch tenancy pack" };
  }
};

export const updateTenancyPackService = async (
  id: string,
  payload: {
    status: string;
    review_notes?: string;
    pack_type?: string;
    issued_at?: string;
    served_at?: string;
  },
): Promise<{ data: TenancyPackServiceRecord | null; error: string | null }> => {
  try {
    const response = await apiFetch<TenancyPackServiceRecord>(
      `${BOOKING_URL()}/api/v1/contracts/${id}/tenancy-pack`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
        suppressErrorToast: true,
      },
    );
    return { data: response, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to update tenancy pack" };
  }
};

export const getDepositProtectionRecord = async (
  id: string,
): Promise<{ data: DepositProtectionRecord | null; error: string | null }> => {
  try {
    const response = await apiFetch<DepositProtectionRecord>(
      `${BOOKING_URL()}/api/v1/contracts/${id}/deposit-protection`,
      { suppressErrorToast: true },
    );
    return { data: response, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to fetch deposit protection" };
  }
};

export const updateDepositProtectionRecord = async (
  id: string,
  payload: {
    status: string;
    review_notes?: string;
    scheme_name?: string;
    protected_at?: string;
    information_served_at?: string;
    deposit_amount?: number;
    deposit_received?: boolean;
    first_rent_received?: boolean;
  },
): Promise<{ data: DepositProtectionRecord | null; error: string | null }> => {
  try {
    const response = await apiFetch<DepositProtectionRecord>(
      `${BOOKING_URL()}/api/v1/contracts/${id}/deposit-protection`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
        suppressErrorToast: true,
      },
    );
    return { data: response, error: null };
  } catch (error: any) {
    return { data: null, error: error.message || "Failed to update deposit protection" };
  }
};
