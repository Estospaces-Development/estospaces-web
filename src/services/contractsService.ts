import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const BOOKING_URL = () => getServiceUrl('booking');

export interface Contract {
    id: string;
    property_id: string;
    user_id: string;
    manager_id: string;
    contract_type: string;
    start_date: string;
    end_date?: string;
    monthly_rent?: number;
    deposit_amount?: number;
    terms_and_conditions?: string;
    contract_pdf_url?: string;
    status: 'draft' | 'pending_user_signature' | 'pending_manager_signature' | 'active' | 'terminated';
    user_signed_at?: string;
    manager_signed_at?: string;
    created_at: string;
    updated_at: string;
}

export interface CreateContractRequest {
    application_id: string;
    start_date: string; // YYYY-MM-DD
    end_date?: string; // YYYY-MM-DD
    monthly_rent: number;
    deposit_amount: number;
    terms_and_conditions?: string;
}

export interface SignContractRequest {
    signer_role: 'user' | 'manager';
}

export const createContract = async (data: CreateContractRequest): Promise<{ data: Contract | null; error: string | null }> => {
    try {
        const response = await apiFetch<Contract>(`${BOOKING_URL()}/api/v1/contracts`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        return { data: response, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || 'Failed to create contract' };
    }
};

export const getContract = async (id: string): Promise<{ data: Contract | null; error: string | null }> => {
    try {
        const response = await apiFetch<Contract>(`${BOOKING_URL()}/api/v1/contracts/${id}`);
        return { data: response, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || 'Failed to fetch contract' };
    }
};

export const getUserContracts = async (): Promise<{ data: Contract[] | null; error: string | null }> => {
    try {
        const response = await apiFetch<{ data: Contract[] }>(`${BOOKING_URL()}/api/v1/contracts/mine`);
        return { data: response.data, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || 'Failed to fetch contracts' };
    }
};

export const signContract = async (id: string, role: 'user' | 'manager'): Promise<{ data: Contract | null; error: string | null }> => {
    try {
        const payload: SignContractRequest = { signer_role: role };
        const response = await apiFetch<{ message: string; contract: Contract }>(`${BOOKING_URL()}/api/v1/contracts/${id}/sign`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        });
        return { data: response.contract, error: null };
    } catch (error: any) {
        return { data: null, error: error.message || 'Failed to sign contract' };
    }
};
