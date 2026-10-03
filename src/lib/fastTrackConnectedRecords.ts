import type { FastTrackWorkspaceRole } from '@/lib/fastTrackWorkspacePreferences';

export type FastTrackConnectedRecordKind = 'lead' | 'application' | 'viewing' | 'contract' | 'payment' | 'property';

const withQuery = (path: string, key: string, value: string) => `${path}?${new URLSearchParams({ [key]: value }).toString()}`;

/** Existing in-app route for a Fast Track connected record, or null when the viewer's role has no page for it. */
export const getFastTrackConnectedRecordPath = (
    role: FastTrackWorkspaceRole,
    kind: FastTrackConnectedRecordKind,
    recordId: string,
    caseId: string,
): string | null => {
    const id = encodeURIComponent(recordId);
    if (role === 'manager') {
        switch (kind) {
            case 'application': return withQuery('/manager/applications', 'application', recordId);
            case 'property': return `/manager/dashboard/properties/${id}`;
            case 'lead': return withQuery('/manager/leads', 'search', recordId);
            case 'viewing': return withQuery('/manager/appointments', 'case', caseId);
            case 'contract': return withQuery('/manager/contracts', 'contract', recordId);
            default: return null;
        }
    }
    if (role === 'user') {
        switch (kind) {
            case 'application': return withQuery('/user/dashboard/applications', 'application', recordId);
            case 'property': return `/user/properties/${id}`;
            case 'viewing': return withQuery('/user/dashboard/viewings', 'case', caseId);
            case 'contract': return withQuery('/user/dashboard/contracts', 'contract', recordId);
            default: return null;
        }
    }
    return kind === 'property' ? `/admin/properties/${id}` : null;
};
