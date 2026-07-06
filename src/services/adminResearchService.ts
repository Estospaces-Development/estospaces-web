import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import type {
    ResearchEvidence,
    ResearchEvidenceType,
    ResearchObservation,
    ResearchSession,
    ResearchSeverity,
    ResearchStatus,
    ResearchSummary,
    ResearchTrack,
} from '@/lib/adminResearch';
import { EMPTY_RESEARCH_SUMMARY, isMissingAdminResearchEndpoint } from '@/lib/adminResearch';

const CORE_URL = () => getServiceUrl('core');

export interface ResearchSessionPayload {
    track: ResearchTrack;
    title: string;
    status?: ResearchStatus;
    participant_role: string;
    scheduled_at?: string;
    observed_at?: string;
    consent_confirmed?: boolean;
    consent_note?: string;
    summary?: string;
}

export interface ResearchSessionUpdatePayload {
    track?: ResearchTrack;
    title?: string;
    status?: ResearchStatus;
    participant_role?: string;
    scheduled_at?: string;
    observed_at?: string;
    consent_confirmed?: boolean;
    consent_note?: string;
    summary?: string;
}

export interface ResearchEvidencePayload {
    evidence_type: ResearchEvidenceType;
    reference_id?: string;
    external_url?: string;
    label?: string;
    notes?: string;
}

export interface ResearchObservationPayload {
    stage?: string;
    friction_tag?: string;
    severity?: ResearchSeverity;
    note: string;
    drop_off_phrase?: string;
    recommended_action?: string;
}

export async function getResearchSummary(): Promise<ResearchSummary> {
    try {
        return await apiFetch<ResearchSummary>(`${CORE_URL()}/api/v1/admin/research/summary`, {
            suppressErrorToast: true,
        });
    } catch (error) {
        if (isMissingAdminResearchEndpoint(error)) {
            return EMPTY_RESEARCH_SUMMARY;
        }
        throw error;
    }
}

export async function getResearchSessions(params: { track?: ResearchTrack | 'all'; status?: ResearchStatus | 'all' } = {}): Promise<ResearchSession[]> {
    const searchParams = new URLSearchParams();
    if (params.track && params.track !== 'all') {
        searchParams.set('track', params.track);
    }
    if (params.status && params.status !== 'all') {
        searchParams.set('status', params.status);
    }
    const query = searchParams.toString();
    try {
        return await apiFetch<ResearchSession[]>(`${CORE_URL()}/api/v1/admin/research/sessions${query ? `?${query}` : ''}`, {
            suppressErrorToast: true,
        });
    } catch (error) {
        if (isMissingAdminResearchEndpoint(error)) {
            return [];
        }
        throw error;
    }
}

export async function createResearchSession(payload: ResearchSessionPayload): Promise<ResearchSession> {
    return apiFetch<ResearchSession>(`${CORE_URL()}/api/v1/admin/research/sessions`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify(payload),
    });
}

export async function updateResearchSession(sessionId: string, payload: ResearchSessionUpdatePayload): Promise<ResearchSession> {
    return apiFetch<ResearchSession>(`${CORE_URL()}/api/v1/admin/research/sessions/${sessionId}`, {
        method: 'PATCH',
        suppressErrorToast: true,
        body: JSON.stringify(payload),
    });
}

export async function addResearchEvidence(sessionId: string, payload: ResearchEvidencePayload): Promise<ResearchEvidence> {
    return apiFetch<ResearchEvidence>(`${CORE_URL()}/api/v1/admin/research/sessions/${sessionId}/evidence`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify(payload),
    });
}

export async function deleteResearchEvidence(evidenceId: string): Promise<void> {
    await apiFetch(`${CORE_URL()}/api/v1/admin/research/evidence/${evidenceId}`, {
        method: 'DELETE',
        suppressErrorToast: true,
    });
}

export async function addResearchObservation(sessionId: string, payload: ResearchObservationPayload): Promise<ResearchObservation> {
    return apiFetch<ResearchObservation>(`${CORE_URL()}/api/v1/admin/research/sessions/${sessionId}/observations`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify(payload),
    });
}

export async function deleteResearchObservation(observationId: string): Promise<void> {
    await apiFetch(`${CORE_URL()}/api/v1/admin/research/observations/${observationId}`, {
        method: 'DELETE',
        suppressErrorToast: true,
    });
}

export const adminResearchService = {
    getResearchSummary,
    getResearchSessions,
    createResearchSession,
    updateResearchSession,
    addResearchEvidence,
    deleteResearchEvidence,
    addResearchObservation,
    deleteResearchObservation,
};
