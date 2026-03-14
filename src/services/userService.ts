import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

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
    }
};
