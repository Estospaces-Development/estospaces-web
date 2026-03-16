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

export interface UserPreferences {
    id?: string;
    user_id?: string;
    email_enabled: boolean;
    email_viewing_updates: boolean;
    email_application_updates: boolean;
    email_message_notifications: boolean;
    email_price_alerts: boolean;
    push_enabled: boolean;
    push_viewing_updates: boolean;
    sms_enabled: boolean;
    marketing_emails: boolean;
    two_factor_auth: boolean;
    dark_mode: boolean;
    language: string;
    currency: string;
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
