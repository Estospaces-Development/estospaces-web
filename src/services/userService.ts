import { apiFetch, apiFetchEnvelope, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import { User } from '@/types';

const CORE_URL = () => getServiceUrl('core');

export interface Agency {
    id: string;
    name: string;
    rating: number;
    reviewCount: number;
    distance?: string;
    address: string;
    image: string;
    verified: boolean;
}

export interface AgencyResponse {
    data: Agency[];
    error: string | null;
}

export const userService = {
    getAgencies: async (limit: number = 5): Promise<AgencyResponse> => {
        try {
            const data = await apiFetch<Agency[]>(`${CORE_URL()}/api/v1/users/agencies?limit=${limit}`);
            return { data, error: null };
        } catch (error: any) {
            return { data: [], error: getErrorMessage(error) };
        }
    },

    getAllUsers: async (page: number = 1, limit: number = 20): Promise<{ data: User[], pagination: any, error: string | null }> => {
        try {
            const response = await apiFetchEnvelope<User[]>(`${CORE_URL()}/api/v1/users?page=${page}&limit=${limit}`);
            return {
                data: response.data || [],
                pagination: response.pagination || null,
                error: null
            };
        } catch (error: any) {
            return { data: [], pagination: null, error: getErrorMessage(error) };
        }
    }
};
