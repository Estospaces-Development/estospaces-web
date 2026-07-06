export type ResearchTrack = 'in_app_journey' | 'broker_console' | 'call_chat_review';
export type ResearchStatus = 'planned' | 'in_progress' | 'reviewed' | 'archived';
export type ResearchSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ResearchEvidenceType =
    | 'fast_track_case'
    | 'lead'
    | 'broker_request'
    | 'support_ticket'
    | 'conversation'
    | 'external_url'
    | 'property';

export interface ResearchEvidence {
    id?: string;
    session_id?: string;
    evidence_type: ResearchEvidenceType | string;
    reference_id?: string;
    external_url?: string;
    label?: string;
    notes?: string;
    created_by?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ResearchObservation {
    id: string;
    session_id: string;
    stage?: string;
    friction_tag?: string;
    severity: ResearchSeverity | string;
    note: string;
    drop_off_phrase?: string;
    recommended_action?: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

export interface ResearchSession {
    id: string;
    track: ResearchTrack | string;
    title: string;
    status: ResearchStatus | string;
    owner_id: string;
    participant_role: string;
    scheduled_at?: string;
    observed_at?: string;
    consent_confirmed: boolean;
    consent_note?: string;
    summary?: string;
    evidence?: ResearchEvidence[];
    observations?: ResearchObservation[];
    created_at: string;
    updated_at: string;
}

export interface ResearchSummary {
    total_sessions: number;
    by_track?: Partial<Record<ResearchTrack, number>>;
    by_status?: Partial<Record<ResearchStatus, number>>;
    high_severity_observations: number;
    consent_pending_reviews: number;
    top_tags?: Array<{ tag: string; count: number }>;
}

export interface NormalizedResearchSummary {
    totalSessions: number;
    byTrack: Record<ResearchTrack, number>;
    byStatus: Record<ResearchStatus, number>;
    highSeverityObservations: number;
    consentPendingReviews: number;
    topTags: Array<{ tag: string; count: number }>;
}

export const EMPTY_RESEARCH_SUMMARY: ResearchSummary = {
    total_sessions: 0,
    by_track: {},
    by_status: {},
    high_severity_observations: 0,
    consent_pending_reviews: 0,
    top_tags: [],
};

export interface ResearchTrackConfig {
    id: ResearchTrack;
    title: string;
    shortTitle: string;
    description: string;
    checklist: string[];
    evidenceTypes: ResearchEvidenceType[];
}

export const RESEARCH_TRACKS: ResearchTrack[] = ['in_app_journey', 'broker_console', 'call_chat_review'];
export const RESEARCH_STATUSES: ResearchStatus[] = ['planned', 'in_progress', 'reviewed', 'archived'];

export const RESEARCH_TRACK_CONFIGS: Record<ResearchTrack, ResearchTrackConfig> = {
    in_app_journey: {
        id: 'in_app_journey',
        title: 'In-App Journey Shadowing',
        shortTitle: 'Journey Shadowing',
        description: 'Watch new seekers move from search through 24-hour fast-track document upload and next-step clarity.',
        checklist: [
            'Search and filter confidence',
            'Property detail comprehension',
            'Get this home in 24 hours CTA clarity',
            'SLA timer meaning and urgency',
            'Verification requirements',
            'Document upload confidence',
            'Next steps after upload',
        ],
        evidenceTypes: ['fast_track_case', 'lead', 'property', 'external_url'],
    },
    broker_console: {
        id: 'broker_console',
        title: 'Broker Console Shadowing',
        shortTitle: 'Broker Shadowing',
        description: 'Observe how brokers handle notifications, lead queues, response actions, and SLA pressure during real work.',
        checklist: [
            'Notifications arrival and prioritization',
            'Lead queue sorting and triage',
            'Call action confidence',
            'Message action confidence',
            'Schedule viewing action confidence',
            'SLA timer impact on workflow',
            'Follow-up ownership after response',
        ],
        evidenceTypes: ['lead', 'broker_request', 'fast_track_case', 'external_url'],
    },
    call_chat_review: {
        id: 'call_chat_review',
        title: 'Call / Chat Review',
        shortTitle: 'Call / Chat Review',
        description: 'Review consented calls, support tickets, and chat evidence to identify repeated objections and drop-off phrases.',
        checklist: [
            'Consent is visible before review',
            'Repeated friction points',
            'Objections and trust blockers',
            'Drop-off phrases',
            'Unclear next steps',
            'Escalation or handoff confusion',
        ],
        evidenceTypes: ['support_ticket', 'conversation', 'external_url'],
    },
};

export function getResearchTrackConfig(track: string): ResearchTrackConfig {
    return RESEARCH_TRACK_CONFIGS[(track as ResearchTrack) in RESEARCH_TRACK_CONFIGS ? track as ResearchTrack : 'in_app_journey'];
}

export function getResearchStatusLabel(status: string) {
    switch (status) {
        case 'in_progress':
            return 'In progress';
        case 'reviewed':
            return 'Reviewed';
        case 'archived':
            return 'Archived';
        default:
            return 'Planned';
    }
}

export function getResearchSessionTitleError(title: string) {
    return title.trim() ? '' : 'Title is required before saving a research session.';
}

function researchErrorText(error: unknown) {
    const message = (error as { message?: unknown })?.message;
    if (typeof message === 'string' && message.trim()) {
        return message.trim();
    }
    return typeof error === 'string' ? error.trim() : '';
}

export function isMissingAdminResearchEndpoint(error: unknown) {
    const message = researchErrorText(error);
    return /Cannot\s+(GET|POST|PATCH|DELETE)\s+\/api\/v1\/admin\/research/i.test(message)
        || (/not found|API error:\s*404/i.test(message) && /research/i.test(message));
}

export function getResearchWorkspaceErrorMessage(error: unknown) {
    if (isMissingAdminResearchEndpoint(error)) {
        return 'Research workspace is not available in this environment yet.';
    }
    return researchErrorText(error) || 'Research workspace request failed';
}

export function summarizeResearchWorkspace(summary?: ResearchSummary | null): NormalizedResearchSummary {
    const source = summary || EMPTY_RESEARCH_SUMMARY;

    return {
        totalSessions: Number(source.total_sessions || 0),
        byTrack: {
            in_app_journey: Number(source.by_track?.in_app_journey || 0),
            broker_console: Number(source.by_track?.broker_console || 0),
            call_chat_review: Number(source.by_track?.call_chat_review || 0),
        },
        byStatus: {
            planned: Number(source.by_status?.planned || 0),
            in_progress: Number(source.by_status?.in_progress || 0),
            reviewed: Number(source.by_status?.reviewed || 0),
            archived: Number(source.by_status?.archived || 0),
        },
        highSeverityObservations: Number(source.high_severity_observations || 0),
        consentPendingReviews: Number(source.consent_pending_reviews || 0),
        topTags: Array.isArray(source.top_tags) ? source.top_tags : [],
    };
}

export function canMarkResearchSessionReviewed(session: ResearchSession) {
    if (session.track !== 'call_chat_review') {
        return true;
    }
    return Boolean(session.consent_confirmed && String(session.consent_note || '').trim());
}

export function buildResearchEvidenceTarget(evidence: Pick<ResearchEvidence, 'evidence_type' | 'reference_id' | 'external_url'>) {
    const referenceId = String(evidence.reference_id || '').trim();
    switch (evidence.evidence_type) {
        case 'fast_track_case':
            return referenceId ? { label: 'Open fast-track case', path: `/admin/fast-track?case=${encodeURIComponent(referenceId)}` } : null;
        case 'lead':
            return referenceId ? { label: 'Open lead queue', path: `/admin/users?lead=${encodeURIComponent(referenceId)}` } : null;
        case 'broker_request':
            return referenceId ? { label: 'Open broker workflow', path: `/admin/fast-track?brokerRequest=${encodeURIComponent(referenceId)}` } : null;
        case 'support_ticket':
            return referenceId ? { label: 'Open support ticket', path: `/admin/help?ticket=${encodeURIComponent(referenceId)}` } : null;
        case 'conversation':
            return referenceId ? { label: 'Open support conversation', path: `/admin/help?conversation=${encodeURIComponent(referenceId)}` } : null;
        case 'property':
            return referenceId ? { label: 'Open property', path: `/admin/properties/${encodeURIComponent(referenceId)}` } : null;
        case 'external_url': {
            const path = String(evidence.external_url || '').trim();
            return path ? { label: 'Open external evidence', path, external: true } : null;
        }
        default:
            return null;
    }
}

export function getResearchEvidenceTypeLabel(type: string) {
    switch (type) {
        case 'fast_track_case':
            return 'Fast-track case';
        case 'lead':
            return 'Lead';
        case 'broker_request':
            return 'Broker request';
        case 'support_ticket':
            return 'Support ticket';
        case 'conversation':
            return 'Conversation';
        case 'external_url':
            return 'External URL';
        case 'property':
            return 'Property';
        default:
            return 'Evidence';
    }
}
