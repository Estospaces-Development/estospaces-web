import type {
    PropertyComplianceEvidence,
    PropertyComplianceReadiness,
} from '@/services/propertyService';
import type { JourneyBlocker, JourneyRequirement } from '@/types/journey';

export interface PropertyComplianceEvidenceDraft {
    status: string;
    referenceNumber: string;
    reviewNotes: string;
}

export const normalizePropertyComplianceCode = (code?: string | null) => {
    let normalized = String(code || '').trim().toLowerCase();
    normalized = normalized.replace(/-/g, '_');
    normalized = normalized.replace(/\s+/g, '_');
    if (normalized.startsWith('property_')) {
        normalized = normalized.slice('property_'.length);
    }
    return normalized;
};

const normalizeDraftStatus = (status?: string | null) => {
    const normalized = String(status || '').trim().toLowerCase();
    switch (normalized) {
        case 'approved':
        case 'completed':
        case 'ready':
        case 'satisfied':
            return 'completed';
        case 'waived':
            return 'waived';
        default:
            return 'pending';
    }
};

export const buildLatestPropertyComplianceEvidenceMap = (
    items: PropertyComplianceEvidence[] | null | undefined,
) => {
    const map = new Map<string, PropertyComplianceEvidence>();

    (items || []).forEach((item) => {
        const category = normalizePropertyComplianceCode(item.category);
        if (!category) {
            return;
        }

        const existing = map.get(category);
        if (!existing) {
            map.set(category, item);
            return;
        }

        const existingUpdatedAt = new Date(existing.updated_at || existing.created_at || 0).getTime();
        const candidateUpdatedAt = new Date(item.updated_at || item.created_at || 0).getTime();
        if (candidateUpdatedAt >= existingUpdatedAt) {
            map.set(category, item);
        }
    });

    return map;
};

export const getOfferReadinessRequirements = (
    readiness: PropertyComplianceReadiness | null | undefined,
) => (readiness?.required_evidence || []).filter((item) => item.scope === 'offer_readiness');

export const dedupeJourneyBlockers = (
    blockers: JourneyBlocker[] | null | undefined,
) => {
    const seen = new Set<string>();

    return (blockers || []).filter((item) => {
        const key = [
            String(item.code || '').trim(),
            String(item.title || '').trim(),
            String(item.description || '').trim(),
            String(item.scope || '').trim(),
            String(item.severity || '').trim(),
        ].join('::');

        if (!key || seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
};

export const getOfferReadinessBlockers = (
    readiness: PropertyComplianceReadiness | null | undefined,
) => dedupeJourneyBlockers(readiness?.blockers).filter((item) => item.scope === 'offer_readiness');

export const findRequirementBlocker = (
    blockers: JourneyBlocker[],
    requirementCode: string,
) => blockers.find((item) => String(item.code || '').trim() === String(requirementCode || '').trim());

export const isPropertyOfferReady = (readiness: PropertyComplianceReadiness | null | undefined) =>
    String(readiness?.status || '').trim() === 'offer_ready';

export const isPropertyContractReady = (
    readiness: PropertyComplianceReadiness | null | undefined,
) => {
    const status = String(readiness?.status || '').trim();
    return status === 'contract_ready' || status === 'move_in_ready';
};

export const createPropertyComplianceDrafts = (
    requirements: JourneyRequirement[],
    evidenceMap: Map<string, PropertyComplianceEvidence>,
) => requirements.reduce<Record<string, PropertyComplianceEvidenceDraft>>((accumulator, requirement) => {
    const code = String(requirement.code || '').trim();
    if (!code) {
        return accumulator;
    }

    const evidence = evidenceMap.get(normalizePropertyComplianceCode(code));
    accumulator[code] = {
        status: normalizeDraftStatus(evidence?.status || requirement.status),
        referenceNumber: evidence?.reference_number || '',
        reviewNotes: evidence?.review_notes || '',
    };
    return accumulator;
}, {});

export const getPropertyComplianceStatusLabel = (status?: string | null) => {
    const normalized = normalizeDraftStatus(status);
    switch (normalized) {
        case 'completed':
            return 'Completed';
        case 'waived':
            return 'Waived';
        default:
            return 'Pending';
    }
};
