import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface UserProfile {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    phone?: string;
    address?: string;
    postcode?: string;
    bio?: string;
    role: string;
    avatar?: string;
    avatar_url?: string;
}

export interface UserPreferences {
    id?: string;
    user_id?: string;
    preferred_city: string;
    preferred_type: string;
    min_budget: number | null;
    max_budget: number | null;
    min_bedrooms: number | null;
    max_bedrooms: number | null;
    notifications_enabled: boolean;
    email_alerts: boolean;
    search_radius_km: number | null;
    onboarding_done: boolean;
    created_at?: string;
    updated_at?: string;
}

export const getProfile = async () => {
    try {
        const data = await apiFetch<UserProfile>(`${CORE_URL()}/api/v1/auth/me`);
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] getProfile error:', error.message);
        return { data: null, error: error.message };
    }
};

export const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
        const payload = {
            first_name: profileData.first_name,
            last_name: profileData.last_name,
            phone: profileData.phone,
            address: profileData.address,
            postcode: profileData.postcode,
            avatar: profileData.avatar ?? profileData.avatar_url,
        };
        const data = await apiFetch<UserProfile>(`${CORE_URL()}/api/v1/users/profile`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] updateProfile error:', error.message);
        return { data: null, error: error.message };
    }
};

export const getPreferences = async () => {
    try {
        const data = await apiFetch<UserPreferences>(`${CORE_URL()}/api/v1/users/preferences`);
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] getPreferences error:', error.message);
        return { data: null, error: error.message };
    }
};

export const updatePreferences = async (preferences: Partial<UserPreferences>) => {
    try {
        const data = await apiFetch<UserPreferences>(`${CORE_URL()}/api/v1/users/preferences`, {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
        return { data, error: null };
    } catch (error: any) {
        console.error('[authService] updatePreferences error:', error.message);
        return { data: null, error: error.message };
    }
};
