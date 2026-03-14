import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
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
            console.error('[userService] getAgencies error:', error.message);
            return { data: [], error: error.message };
        }
    },

    getAllUsers: async (page: number = 1, limit: number = 20): Promise<{ data: User[], pagination: any, error: string | null }> => {
        try {
            const response = await apiFetch<any>(`${CORE_URL()}/api/v1/users?page=${page}&limit=${limit}`);
            // The apiFetch helper already unwraps json.data ?? json
            // But for paginated responses, we need to see how it's handled.
            // If response is { success: true, data: [...], pagination: {...} }
            // Then apiFetch returns { data: [...], pagination: {...} } because of (json.data ?? json)
            
            return { 
                data: response.data || response, 
                pagination: response.pagination,
                error: null 
            };
        } catch (error: any) {
            console.error('[userService] getAllUsers error:', error.message);
            return { data: [], pagination: null, error: error.message };
        }
    }
};
