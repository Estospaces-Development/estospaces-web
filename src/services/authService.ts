import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    bio?: string;
    role: string;
    avatar_url?: string;
}

export const getProfile = async () => {
    try {
        const data = await apiFetch<UserProfile>(`${CORE_URL()}/api/v1/users/profile`);
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] getProfile error:', error.message);
        return { data: null, error: error.message };
    }
};

export const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
        const data = await apiFetch<UserProfile>(`${CORE_URL()}/api/v1/users/profile`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] updateProfile error:', error.message);
        return { data: null, error: error.message };
    }
};
