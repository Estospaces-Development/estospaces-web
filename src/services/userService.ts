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

export interface UserProfileSummary {
    id: string;
    display_name: string;
    avatar?: string;
    role: string;
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

    getAllUsers: async (
        page: number = 1,
        limit: number = 20,
        filters: { search?: string; role?: string } = {},
    ): Promise<{ data: User[], pagination: any, error: string | null }> => {
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit),
            });
            if (filters.search?.trim()) {
                params.set('search', filters.search.trim());
            }
            if (filters.role?.trim()) {
                params.set('role', filters.role.trim());
            }

            const response = await apiFetchEnvelope<User[]>(`${CORE_URL()}/api/v1/users?${params.toString()}`);
            return {
                data: response.data || [],
                pagination: response.pagination || null,
                error: null
            };
        } catch (error: any) {
            return { data: [], pagination: null, error: getErrorMessage(error) };
        }
    },

    getUserById: async (userId: string): Promise<{ data: User | null; error: string | null }> => {
        try {
            const data = await apiFetch<User>(`${CORE_URL()}/api/v1/users/${userId}`);
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: getErrorMessage(error) };
        }
    },

    getUserSummaries: async (ids: string[]): Promise<{ data: UserProfileSummary[]; error: string | null }> => {
        try {
            const data = await apiFetch<UserProfileSummary[]>(`${CORE_URL()}/api/v1/users/summaries`, {
                method: 'POST',
                suppressErrorToast: true,
                body: JSON.stringify({ ids }),
            });
            return { data: data || [], error: null };
        } catch (error: any) {
            return { data: [], error: getErrorMessage(error) };
        }
    },

    setUserActiveState: async (userId: string, isActive: boolean, reason: string): Promise<{ error: string | null }> => {
        try {
            await apiFetch(`${CORE_URL()}/api/v1/users/${userId}/${isActive ? 'activate' : 'deactivate'}`, {
                method: 'PUT',
                suppressErrorToast: true,
                body: JSON.stringify({ reason: reason.trim() }),
            });
            return { error: null };
        } catch (error: any) {
            return { error: getErrorMessage(error) };
        }
    },

    updateProfile: async (profileData: any): Promise<{ data: any, error: string | null }> => {
        try {
            const data = await apiFetch<any>(`${CORE_URL()}/api/v1/users/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profileData)
            });
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: getErrorMessage(error) };
        }
    }
};
