import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const coreURL = () => getServiceUrl('core');

export interface ManagerBillingProfile {
    market: 'IN' | 'GB';
    verification_status: 'verified' | 'pending' | 'rejected' | 'revoked';
    verification_source: string;
    verified_at?: string | null;
    effective_at: string;
    profile_version: number;
}

export interface AdminManagerBillingProfile extends ManagerBillingProfile {
    manager_id: string;
    verified_by?: string | null;
}

export function getMyManagerBillingProfile() {
    return apiFetch<ManagerBillingProfile>(`${coreURL()}/api/v1/manager/billing-profile`);
}

export function getAdminManagerBillingProfile(managerID: string) {
    return apiFetch<AdminManagerBillingProfile>(`${coreURL()}/api/v1/admin/billing-profiles/${encodeURIComponent(managerID)}`);
}

export function verifyAdminManagerBillingProfile(managerID: string, market: 'IN' | 'GB', expectedProfileVersion: number) {
    return apiFetch<AdminManagerBillingProfile>(`${coreURL()}/api/v1/admin/billing-profiles/${encodeURIComponent(managerID)}`, {
        method: 'PUT',
        body: JSON.stringify({
            market,
            verification_status: 'verified',
            verification_source: 'admin_document_review',
            expected_profile_version: expectedProfileVersion,
        }),
    });
}
