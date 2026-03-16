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
        // TODO: Backend endpoint GET /api/v1/users/agencies does not exist yet
        // return apiFetch<Agency[]>(`${CORE_URL()}/api/v1/users/agencies?limit=${limit}`);
        return { data: [], error: null };
    },

    getAllUsers: async (page: number = 1, limit: number = 20): Promise<{ data: User[], pagination: any, error: string | null }> => {
        try {
            const data = await apiFetch<User[]>(`${CORE_URL()}/api/v1/users?page=${page}&limit=${limit}`);
            return { 
                data, 
                pagination: null, // apiFetch abstraction strips pagination siblings
                error: null 
            };
        } catch (error: any) {
            console.error('[userService] getAllUsers error:', error.message);
            return { data: [], pagination: null, error: error.message };
        }
    }
};
