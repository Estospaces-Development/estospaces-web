"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, FileText, Loader2, Shield } from 'lucide-react';
import {
    getPropertyComplianceEvidence,
    upsertPropertyComplianceEvidence,
    type PropertyComplianceEvidence,
    type PropertyComplianceReadiness,
} from '@/services/propertyService';
import {
    buildLatestPropertyComplianceEvidenceMap,
    createPropertyComplianceDrafts,
    dedupeJourneyBlockers,
    getPropertyComplianceStatusLabel,
    normalizePropertyComplianceEvidenceList,
    normalizePropertyComplianceCode,
    type PropertyComplianceEvidenceDraft,
} from '@/lib/propertyCompliance';

interface PropertyCompliancePanelProps {
    propertyId: string;
    initialReadiness?: PropertyComplianceReadiness | null;
    onReadinessChange?: (readiness: PropertyComplianceReadiness | null) => void;
}

const formatReadinessStatus = (status?: string | null) => {
    const normalized = String(status || 'attention_required').replace(/_/g, ' ');
    return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const draftForRequirement = (
    drafts: Record<string, PropertyComplianceEvidenceDraft>,
    code: string,
): PropertyComplianceEvidenceDraft => (
    drafts[code] || { status: 'pending', referenceNumber: '', reviewNotes: '' }
);

export default function PropertyCompliancePanel({
    propertyId,
    initialReadiness = null,
    onReadinessChange,
}: PropertyCompliancePanelProps) {
    const [loading, setLoading] = useState(true);
    const [savingCode, setSavingCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [readiness, setReadiness] = useState<PropertyComplianceReadiness | null>(initialReadiness);
    const [evidence, setEvidence] = useState<PropertyComplianceEvidence[]>([]);
    const [drafts, setDrafts] = useState<Record<string, PropertyComplianceEvidenceDraft>>({});

    const evidenceMap = useMemo(
        () => buildLatestPropertyComplianceEvidenceMap(evidence),
        [evidence],
    );
    const requirements = useMemo(
        () => readiness?.required_evidence || [],
        [readiness],
    );
    const blockers = useMemo(() => dedupeJourneyBlockers(readiness?.blockers), [readiness]);

    const applyReadiness = useCallback((nextReadiness: PropertyComplianceReadiness | null) => {
        setReadiness(nextReadiness);
        onReadinessChange?.(nextReadiness);
    }, [onReadinessChange]);

    const loadCompliance = useCallback(async () => {
        if (!propertyId) {
            return;
        }

        setLoading(true);
        setError(null);
        const result = await getPropertyComplianceEvidence(propertyId, { suppressErrorToast: true });
        if (result.error) {
            setEvidence([]);
            applyReadiness(initialReadiness);
            setError(result.error);
        } else {
            setEvidence(normalizePropertyComplianceEvidenceList(result.data?.evidence));
            applyReadiness(result.data?.readiness || null);
        }
        setLoading(false);
    }, [applyReadiness, initialReadiness, propertyId]);

    useEffect(() => {
        loadCompliance();
    }, [loadCompliance]);

    useEffect(() => {
        setDrafts(createPropertyComplianceDrafts(requirements, evidenceMap));
    }, [evidenceMap, requirements]);

    const updateDraft = (code: string, patch: Partial<PropertyComplianceEvidenceDraft>) => {
        setDrafts((current) => ({
            ...current,
            [code]: {
                ...draftForRequirement(current, code),
                ...patch,
            },
        }));
    };

    const saveEvidence = async (code: string) => {
        const draft = draftForRequirement(drafts, code);
        setSavingCode(code);
        setError(null);
        setSuccessMessage('');

        const result = await upsertPropertyComplianceEvidence(
            propertyId,
            code,
            {
                status: draft.status,
                reference_number: draft.referenceNumber,
                review_notes: draft.reviewNotes,
            },
            { suppressErrorToast: true },
        );

        if (result.error) {
            setError(result.error);
        } else {
            setEvidence(normalizePropertyComplianceEvidenceList(result.data?.evidence));
            applyReadiness(result.data?.readiness || null);
            setSuccessMessage('Compliance evidence recorded.');
        }
        setSavingCode(null);
    };

    const statusLabel = formatReadinessStatus(readiness?.status);

    return (
        <section
            data-testid="manager-property-compliance-panel"
            aria-labelledby="manager-property-compliance-heading"
            className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h3
                        id="manager-property-compliance-heading"
                        className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white"
                    >
                        <Shield className="h-5 w-5 text-orange-600" />
                        Compliance readiness
                    </h3>
                    <p
                        id="manager-property-compliance-status"
                        role="status"
                        aria-live="polite"
                        className="mt-2 text-sm text-gray-600 dark:text-gray-300"
                    >
                        {loading
                            ? 'Loading compliance readiness.'
                            : `Status: ${statusLabel}. ${readiness?.status_reason || 'Review required evidence before publishing.'}`}
                    </p>
                </div>
                {loading && (
                    <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading
                    </div>
                )}
            </div>

            {error && (
                <div
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100"
                >
                    {error}
                </div>
            )}

            {successMessage && (
                <div
                    role="status"
                    className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-100"
                >
                    {successMessage}
                </div>
            )}

            {blockers.length > 0 && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
                        <AlertCircle className="h-4 w-4" />
                        Readiness blockers
                    </h4>
                    <ul aria-label="Compliance readiness blockers" className="mt-3 space-y-3">
                        {blockers.map((blocker) => (
                            <li key={`${blocker.code}-${blocker.scope}`} className="text-sm text-amber-900 dark:text-amber-100">
                                <p className="font-medium">{blocker.title}</p>
                                {blocker.description && (
                                    <p className="mt-1 text-amber-800 dark:text-amber-200">{blocker.description}</p>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="mt-5">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                    <FileText className="h-4 w-4 text-orange-600" />
                    Evidence categories
                </h4>

                {requirements.length === 0 && !loading ? (
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                        No compliance evidence categories are required for this property.
                    </p>
                ) : (
                    <div className="mt-3 space-y-4">
                        {requirements.map((requirement) => {
                            const draft = draftForRequirement(drafts, requirement.code);
                            const evidenceItem = evidenceMap.get(normalizePropertyComplianceCode(requirement.code));
                            const rowStatus = getPropertyComplianceStatusLabel(evidenceItem?.status || requirement.status);
                            const isSaving = savingCode === requirement.code;

                            return (
                                <div
                                    key={requirement.code}
                                    className="rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                                >
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <p className="font-medium text-gray-900 dark:text-white">{requirement.label}</p>
                                            {requirement.description && (
                                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{requirement.description}</p>
                                            )}
                                        </div>
                                        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                            <CheckCircle className="h-3.5 w-3.5" />
                                            {rowStatus}
                                        </span>
                                    </div>

                                    <div className="mt-4 grid gap-3 md:grid-cols-[160px_1fr]">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span>Status</span>
                                            <select
                                                aria-label={`${requirement.label} status`}
                                                value={draft.status}
                                                onChange={(event) => updateDraft(requirement.code, { status: event.target.value })}
                                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="completed">Completed</option>
                                                <option value="waived">Waived</option>
                                            </select>
                                        </label>
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            <span>Reference number</span>
                                            <input
                                                aria-label={`${requirement.label} reference number`}
                                                value={draft.referenceNumber}
                                                onChange={(event) => updateDraft(requirement.code, { referenceNumber: event.target.value })}
                                                className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                                placeholder="Certificate, licence, or pack reference"
                                            />
                                        </label>
                                    </div>

                                    <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        <span>Review notes</span>
                                        <textarea
                                            aria-label={`${requirement.label} review notes`}
                                            value={draft.reviewNotes}
                                            onChange={(event) => updateDraft(requirement.code, { reviewNotes: event.target.value })}
                                            className="mt-1 min-h-20 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            placeholder="Add readiness notes for this evidence category"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        aria-label={`Record ${requirement.label} evidence`}
                                        onClick={() => saveEvidence(requirement.code)}
                                        disabled={isSaving}
                                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Record evidence
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
