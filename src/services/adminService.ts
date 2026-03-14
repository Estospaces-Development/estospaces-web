/**
 * Admin Service
 * Handles platform-wide settings and administrative actions via the core-service backend.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

export interface SystemSettings {
    platformName: string;
    supportEmail: string;
    defaultCurrency: string;
    twoFactorAuth: boolean;
    sessionTimeout: string;
    notifications: {
        registrations: boolean;
        verifications: boolean;
        alerts: boolean;
        reports: boolean;
    };
}

export interface PlatformStats {
    storageUsed: number;
    storageTotal: number;
    databaseRecords: number;
}

/**
 * Fetch platform-wide settings
 */
export async function getSettings(): Promise<SystemSettings> {
    return apiFetch<SystemSettings>(`${CORE_URL()}/api/v1/admin/settings`);
}

/**
 * Update platform-wide settings
 */
export async function updateSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    return apiFetch<SystemSettings>(`${CORE_URL()}/api/v1/admin/settings`, {
        method: 'PUT',
        body: JSON.stringify(settings),
    });
}

/**
 * Fetch platform usage statistics
 */
export async function getPlatformStats(): Promise<PlatformStats> {
    return apiFetch<PlatformStats>(`${CORE_URL()}/api/v1/admin/stats`);
}

export const adminService = {
    getSettings,
    updateSettings,
    getPlatformStats,
};
