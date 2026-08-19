'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    ClipboardList,
    ExternalLink,
    FileText,
    Loader2,
    MessageSquare,
    Plus,
    RefreshCw,
    Search,
    ShieldCheck,
    Trash2,
    X,
    Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import { useToast } from '@/contexts/ToastContext';
import {
    buildResearchEvidenceTarget,
    canMarkResearchSessionReviewed,
    getResearchEvidenceTypeLabel,
    getResearchSessionTitleError,
    getResearchStatusLabel,
    getResearchTrackConfig,
    getResearchWorkspaceErrorMessage,
    RESEARCH_STATUSES,
    RESEARCH_TRACK_CONFIGS,
    RESEARCH_TRACKS,
    summarizeResearchWorkspace,
    type ResearchEvidence,
    type ResearchEvidenceType,
    type ResearchObservation,
    type ResearchSession,
    type ResearchStatus,
    type ResearchTrack,
} from '@/lib/adminResearch';
import { adminResearchService, type ResearchSessionPayload } from '@/services/adminResearchService';

type TrackFilter = ResearchTrack | 'all';

const emptySessionForm: ResearchSessionPayload = {
    track: 'in_app_journey',
    title: '',
    status: 'planned',
    participant_role: 'user',
    scheduled_at: '',
    observed_at: '',
    consent_confirmed: false,
    consent_note: '',
    summary: '',
};

const emptyEvidenceForm = {
    evidence_type: 'fast_track_case' as ResearchEvidenceType,
    reference_id: '',
    external_url: '',
    label: '',
    notes: '',
};

const emptyObservationForm = {
    stage: '',
    friction_tag: '',
    severity: 'medium' as const,
    note: '',
    drop_off_phrase: '',
    recommended_action: '',
};

function toDatetimeLocal(value?: string) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value?: string) {
    return value ? new Date(value).toISOString() : undefined;
}

function trackIcon(track: string) {
    if (track === 'broker_console') return <Zap size={18} />;
    if (track === 'call_chat_review') return <MessageSquare size={18} />;
    return <Search size={18} />;
}

function severityClass(severity: string) {
    switch (severity) {
        case 'critical':
            return 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200';
        case 'high':
            return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200';
        case 'low':
            return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200';
        default:
            return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200';
    }
}

export default function AdminResearchPage() {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [summary, setSummary] = useState(() => summarizeResearchWorkspace(null));
    const [sessions, setSessions] = useState<ResearchSession[]>([]);
    const [activeTrack, setActiveTrack] = useState<TrackFilter>('all');
    const [selectedSessionId, setSelectedSessionId] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSessionId, setEditingSessionId] = useState('');
    const [sessionForm, setSessionForm] = useState<ResearchSessionPayload>(emptySessionForm);
    const [evidenceForm, setEvidenceForm] = useState(emptyEvidenceForm);
    const [observationForm, setObservationForm] = useState(emptyObservationForm);
    const [consentConfirmed, setConsentConfirmed] = useState(false);
    const [consentNote, setConsentNote] = useState('');

    const selectedSession = useMemo(
        () => sessions.find((session) => session.id === selectedSessionId) || sessions[0] || null,
        [selectedSessionId, sessions],
    );
    const sessionTitleError = modalOpen ? getResearchSessionTitleError(sessionForm.title) : '';
    const canSaveSession = !saving && !sessionTitleError;

    const loadResearch = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const [nextSummary, nextSessions] = await Promise.all([
                adminResearchService.getResearchSummary(),
                adminResearchService.getResearchSessions({ track: activeTrack }),
            ]);
            setSummary(summarizeResearchWorkspace(nextSummary));
            setSessions(nextSessions);
            setSelectedSessionId((current) => {
                if (current && nextSessions.some((session) => session.id === current)) return current;
                return nextSessions[0]?.id || '';
            });
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            if (!silent) setLoading(false);
        }
    }, [activeTrack, toast]);

    useEffect(() => {
        void loadResearch();
    }, [loadResearch]);

    useEffect(() => {
        if (!selectedSession) {
            setConsentConfirmed(false);
            setConsentNote('');
            return;
        }
        setConsentConfirmed(Boolean(selectedSession.consent_confirmed));
        setConsentNote(selectedSession.consent_note || '');
        const config = getResearchTrackConfig(selectedSession.track);
        setEvidenceForm((current) => ({
            ...current,
            evidence_type: config.evidenceTypes.includes(current.evidence_type) ? current.evidence_type : config.evidenceTypes[0],
        }));
    }, [selectedSession]);

    const openCreateModal = (track: TrackFilter = activeTrack) => {
        const nextTrack = track === 'all' ? 'in_app_journey' : track;
        setEditingSessionId('');
        setSessionForm({
            ...emptySessionForm,
            track: nextTrack,
            participant_role: nextTrack === 'broker_console' ? 'manager' : 'user',
        });
        setModalOpen(true);
    };

    const openEditModal = (session: ResearchSession) => {
        setEditingSessionId(session.id);
        setSessionForm({
            track: session.track as ResearchTrack,
            title: session.title,
            status: session.status as ResearchStatus,
            participant_role: session.participant_role,
            scheduled_at: toDatetimeLocal(session.scheduled_at),
            observed_at: toDatetimeLocal(session.observed_at),
            consent_confirmed: session.consent_confirmed,
            consent_note: session.consent_note || '',
            summary: session.summary || '',
        });
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingSessionId('');
        setSessionForm(emptySessionForm);
    };

    const saveSession = async (event: React.FormEvent) => {
        event.preventDefault();
        const titleError = getResearchSessionTitleError(sessionForm.title);
        if (titleError) return;
        setSaving(true);
        try {
            const payload = {
                ...sessionForm,
                title: sessionForm.title.trim(),
                participant_role: sessionForm.participant_role.trim(),
                scheduled_at: fromDatetimeLocal(sessionForm.scheduled_at),
                observed_at: fromDatetimeLocal(sessionForm.observed_at),
                summary: sessionForm.summary?.trim(),
                consent_note: sessionForm.consent_note?.trim(),
            };
            const saved = editingSessionId
                ? await adminResearchService.updateResearchSession(editingSessionId, payload)
                : await adminResearchService.createResearchSession(payload);
            closeModal();
            await loadResearch(true);
            setSelectedSessionId(saved.id);
            toast.success(editingSessionId ? 'Research session updated' : 'Research session created');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const saveConsent = async () => {
        if (!selectedSession) return;
        setSaving(true);
        try {
            const saved = await adminResearchService.updateResearchSession(selectedSession.id, {
                consent_confirmed: consentConfirmed,
                consent_note: consentNote.trim(),
            });
            await loadResearch(true);
            setSelectedSessionId(saved.id);
            toast.success('Consent state updated');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (status: ResearchStatus) => {
        if (!selectedSession) return;
        setSaving(true);
        try {
            const saved = await adminResearchService.updateResearchSession(selectedSession.id, {
                status,
                consent_confirmed: consentConfirmed,
                consent_note: consentNote.trim(),
            });
            await loadResearch(true);
            setSelectedSessionId(saved.id);
            toast.success('Research session status updated');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const addEvidence = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSession) return;
        setSaving(true);
        try {
            await adminResearchService.addResearchEvidence(selectedSession.id, {
                evidence_type: evidenceForm.evidence_type,
                reference_id: evidenceForm.reference_id.trim(),
                external_url: evidenceForm.external_url.trim(),
                label: evidenceForm.label.trim(),
                notes: evidenceForm.notes.trim(),
            });
            setEvidenceForm({ ...emptyEvidenceForm, evidence_type: getResearchTrackConfig(selectedSession.track).evidenceTypes[0] });
            await loadResearch(true);
            setSelectedSessionId(selectedSession.id);
            toast.success('Evidence linked');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteEvidence = async (evidence: ResearchEvidence) => {
        if (!evidence.id || !selectedSession) return;
        setSaving(true);
        try {
            await adminResearchService.deleteResearchEvidence(evidence.id);
            await loadResearch(true);
            setSelectedSessionId(selectedSession.id);
            toast.success('Evidence removed');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const addObservation = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selectedSession) return;
        setSaving(true);
        try {
            await adminResearchService.addResearchObservation(selectedSession.id, {
                stage: observationForm.stage.trim(),
                friction_tag: observationForm.friction_tag.trim(),
                severity: observationForm.severity,
                note: observationForm.note.trim(),
                drop_off_phrase: observationForm.drop_off_phrase.trim(),
                recommended_action: observationForm.recommended_action.trim(),
            });
            setObservationForm(emptyObservationForm);
            await loadResearch(true);
            setSelectedSessionId(selectedSession.id);
            toast.success('Observation added');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const deleteObservation = async (observation: ResearchObservation) => {
        if (!selectedSession) return;
        setSaving(true);
        try {
            await adminResearchService.deleteResearchObservation(observation.id);
            await loadResearch(true);
            setSelectedSessionId(selectedSession.id);
            toast.success('Observation removed');
        } catch (error) {
            toast.error(getResearchWorkspaceErrorMessage(error));
        } finally {
            setSaving(false);
        }
    };

    const selectedConfig = selectedSession ? getResearchTrackConfig(selectedSession.track) : RESEARCH_TRACK_CONFIGS.in_app_journey;
    const canReviewSelected = selectedSession ? canMarkResearchSessionReviewed({
        ...selectedSession,
        consent_confirmed: consentConfirmed,
        consent_note: consentNote,
    }) : false;

    if (loading) {
        return <BrandLoadingScreen variant="section" label="Loading observational research..." />;
    }

    return (
        <div className="min-h-screen space-y-8 p-6 lg:p-10">
            <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-500">Observational Research</p>
                    <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                        Admin research workspace
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                        Run seeker journey shadowing, broker console shadowing, and consent-gated call/chat review without copying private transcripts into Core.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        type="button"
                        onClick={() => loadResearch(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-orange-500/10"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                    <button
                        type="button"
                        onClick={() => openCreateModal()}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-700"
                    >
                        <Plus size={16} />
                        New session
                    </button>
                </div>
            </header>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-label="Research overview metrics">
                {[
                    ['Sessions', summary.totalSessions, ClipboardList],
                    ['High severity friction', summary.highSeverityObservations, AlertTriangle],
                    ['Consent pending', summary.consentPendingReviews, ShieldCheck],
                    ['Reviewed sessions', summary.byStatus.reviewed, CheckCircle2],
                ].map(([label, value, Icon]) => (
                    <div key={label as string} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center justify-between gap-3">
                            <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">{label as string}</span>
                            {React.createElement(Icon as typeof ClipboardList, { size: 18, className: 'text-orange-500' })}
                        </div>
                        <p className="mt-4 text-3xl font-black text-gray-950 dark:text-white">{value as number}</p>
                    </div>
                ))}
            </section>

            <section className="grid gap-4 lg:grid-cols-3" aria-label="Research streams">
                {RESEARCH_TRACKS.map((track) => {
                    const config = getResearchTrackConfig(track);
                    return (
                        <button
                            key={track}
                            type="button"
                            onClick={() => setActiveTrack(activeTrack === track ? 'all' : track)}
                            className={`rounded-2xl border p-5 text-left transition ${
                                activeTrack === track
                                    ? 'border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10 dark:border-orange-500/40 dark:bg-orange-500/10'
                                    : 'border-gray-100 bg-white hover:border-orange-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-500/30'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                                        {trackIcon(track)}
                                    </span>
                                    <div>
                                        <p className="text-base font-black text-gray-950 dark:text-white">{config.title}</p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                                            {summary.byTrack[track]} sessions
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-gray-600 dark:text-gray-300">{config.description}</p>
                        </button>
                    );
                })}
            </section>

            <div className="grid gap-8 xl:grid-cols-[minmax(320px,420px),1fr]">
                <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-lg font-black text-gray-950 dark:text-white">Research sessions</h2>
                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                {activeTrack === 'all' ? 'All tracks' : getResearchTrackConfig(activeTrack).title}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => openCreateModal(activeTrack)}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white transition hover:bg-orange-700"
                            aria-label="Create research session"
                        >
                            <Plus size={18} />
                        </button>
                    </div>

                    {sessions.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/60 p-8 text-center dark:border-orange-500/20 dark:bg-orange-500/10">
                            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-orange-500" />
                            <p className="font-bold text-gray-950 dark:text-white">No research sessions yet</p>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">Create the first session for this research stream.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessions.map((session) => {
                                const active = selectedSession?.id === session.id;
                                const config = getResearchTrackConfig(session.track);
                                return (
                                    <button
                                        key={session.id}
                                        type="button"
                                        onClick={() => setSelectedSessionId(session.id)}
                                        className={`w-full rounded-2xl border p-4 text-left transition ${
                                            active
                                                ? 'border-orange-300 bg-orange-50 dark:border-orange-500/40 dark:bg-orange-500/10'
                                                : 'border-gray-100 bg-gray-50 hover:border-orange-200 dark:border-gray-800 dark:bg-gray-950/40'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-black text-gray-950 dark:text-white">{session.title}</p>
                                                <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
                                                    {config.shortTitle}
                                                </p>
                                            </div>
                                            <span className="rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-white dark:bg-white dark:text-gray-950">
                                                {getResearchStatusLabel(session.status)}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            <span>{session.participant_role}</span>
                                            <span>{session.evidence?.length || 0} evidence</span>
                                            <span>{session.observations?.length || 0} observations</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </section>

                {selectedSession ? (
                    <section className="space-y-6">
                        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">{selectedConfig.title}</p>
                                    <h2 className="mt-2 text-2xl font-black text-gray-950 dark:text-white">{selectedSession.title}</h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                        {selectedSession.summary || selectedConfig.description}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditModal(selectedSession)}
                                        className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-700 transition hover:border-orange-200 hover:bg-orange-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-orange-500/10"
                                    >
                                        Edit
                                    </button>
                                    <select
                                        value={selectedSession.status}
                                        onChange={(event) => updateStatus(event.target.value as ResearchStatus)}
                                        disabled={saving}
                                        className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        aria-label="Research session status"
                                    >
                                        {RESEARCH_STATUSES.map((status) => (
                                            <option key={status} value={status}>{getResearchStatusLabel(status)}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        disabled={saving || selectedSession.status === 'reviewed' || !canReviewSelected}
                                        onClick={() => updateStatus('reviewed')}
                                        className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Mark reviewed
                                    </button>
                                </div>
                            </div>

                            {selectedSession.track === 'call_chat_review' && (
                                <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="font-black text-gray-950 dark:text-white">Consent gate</p>
                                            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                Confirm consent before reviewing call recordings or chat transcripts. Store the consent reference here, not the raw transcript.
                                            </p>
                                        </div>
                                        <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                                            <input
                                                type="checkbox"
                                                checked={consentConfirmed}
                                                onChange={(event) => setConsentConfirmed(event.target.checked)}
                                                className="h-4 w-4 accent-orange-600"
                                            />
                                            Consent confirmed
                                        </label>
                                    </div>
                                    <div className="mt-3 flex flex-col gap-3 lg:flex-row">
                                        <input
                                            value={consentNote}
                                            onChange={(event) => setConsentNote(event.target.value)}
                                            placeholder="Consent note or ticket reference"
                                            className="min-w-0 flex-1 rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-orange-500/30 dark:bg-gray-950 dark:text-white"
                                        />
                                        <button
                                            type="button"
                                            onClick={saveConsent}
                                            disabled={saving}
                                            className="rounded-xl border border-orange-200 px-4 py-3 text-sm font-bold text-orange-700 transition hover:bg-white dark:border-orange-500/30 dark:text-orange-200 dark:hover:bg-orange-500/10"
                                        >
                                            Save consent
                                        </button>
                                    </div>
                                    {!canReviewSelected && (
                                        <p className="mt-3 text-sm font-semibold text-orange-700 dark:text-orange-200">
                                            Reviewed status stays disabled until consent is confirmed and a consent note is visible.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h3 className="text-lg font-black text-gray-950 dark:text-white">Shadowing checklist</h3>
                                <div className="mt-4 space-y-3">
                                    {selectedConfig.checklist.map((item) => (
                                        <div key={item} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-950/40">
                                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h3 className="text-lg font-black text-gray-950 dark:text-white">Top friction tags</h3>
                                {summary.topTags.length === 0 ? (
                                    <p className="mt-4 rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                                        Tags from observations will appear here.
                                    </p>
                                ) : (
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {summary.topTags.map((tag) => (
                                            <span key={tag.tag} className="rounded-full bg-orange-100 px-3 py-2 text-sm font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                                                {tag.tag} · {tag.count}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="grid gap-6 xl:grid-cols-2">
                            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h3 className="text-lg font-black text-gray-950 dark:text-white">Evidence</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Link platform records or manual external evidence. Transcripts stay in Messaging.</p>
                                <div className="mt-4 space-y-3">
                                    {(selectedSession.evidence || []).length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No evidence linked yet.</p>
                                    ) : selectedSession.evidence?.map((evidence) => {
                                        const target = buildResearchEvidenceTarget(evidence);
                                        return (
                                            <div key={evidence.id || `${evidence.evidence_type}-${evidence.reference_id}`} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-black text-gray-950 dark:text-white">{evidence.label || getResearchEvidenceTypeLabel(evidence.evidence_type)}</p>
                                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">{getResearchEvidenceTypeLabel(evidence.evidence_type)}</p>
                                                        {(evidence.reference_id || evidence.external_url) && (
                                                            <p className="mt-2 break-all text-xs text-gray-500 dark:text-gray-400">{evidence.reference_id || evidence.external_url}</p>
                                                        )}
                                                        {evidence.notes && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{evidence.notes}</p>}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteEvidence(evidence)}
                                                        className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                                        aria-label="Delete research evidence"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                                {target && (
                                                    <button
                                                        type="button"
                                                        onClick={() => target.external ? window.open(target.path, '_blank', 'noopener,noreferrer') : navigate(target.path)}
                                                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-orange-700 hover:text-orange-800 dark:text-orange-200"
                                                    >
                                                        {target.label}
                                                        <ExternalLink size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <form onSubmit={addEvidence} className="mt-5 space-y-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <select
                                            value={evidenceForm.evidence_type}
                                            onChange={(event) => setEvidenceForm({ ...evidenceForm, evidence_type: event.target.value as ResearchEvidenceType })}
                                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                            aria-label="Evidence type"
                                        >
                                            {selectedConfig.evidenceTypes.map((type) => (
                                                <option key={type} value={type}>{getResearchEvidenceTypeLabel(type)}</option>
                                            ))}
                                        </select>
                                        <input
                                            value={evidenceForm.label}
                                            onChange={(event) => setEvidenceForm({ ...evidenceForm, label: event.target.value })}
                                            placeholder="Evidence label"
                                            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>
                                    {evidenceForm.evidence_type === 'external_url' ? (
                                        <input
                                            value={evidenceForm.external_url}
                                            onChange={(event) => setEvidenceForm({ ...evidenceForm, external_url: event.target.value })}
                                            placeholder="https://recordings.example.com/call"
                                            required
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                    ) : (
                                        <input
                                            value={evidenceForm.reference_id}
                                            onChange={(event) => setEvidenceForm({ ...evidenceForm, reference_id: event.target.value })}
                                            placeholder="Linked record ID"
                                            required
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                    )}
                                    <textarea
                                        value={evidenceForm.notes}
                                        onChange={(event) => setEvidenceForm({ ...evidenceForm, notes: event.target.value })}
                                        placeholder="Evidence notes"
                                        rows={2}
                                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
                                    >
                                        <Plus size={16} />
                                        Add evidence
                                    </button>
                                </form>
                            </section>

                            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h3 className="text-lg font-black text-gray-950 dark:text-white">Observations</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Capture friction tags, drop-off phrases, and next actions.</p>
                                <div className="mt-4 space-y-3">
                                    {(selectedSession.observations || []).length === 0 ? (
                                        <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">No observations captured yet.</p>
                                    ) : selectedSession.observations?.map((observation) => (
                                        <div key={observation.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${severityClass(observation.severity)}`}>{observation.severity}</span>
                                                        {observation.friction_tag && <span className="text-xs font-black uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">{observation.friction_tag}</span>}
                                                    </div>
                                                    {observation.stage && <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">{observation.stage}</p>}
                                                    <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-200">{observation.note}</p>
                                                    {observation.drop_off_phrase && (
                                                        <p className="mt-3 rounded-xl bg-white p-3 text-sm font-semibold italic text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                                                            "{observation.drop_off_phrase}"
                                                        </p>
                                                    )}
                                                    {observation.recommended_action && (
                                                        <p className="mt-2 text-sm font-semibold text-orange-700 dark:text-orange-200">{observation.recommended_action}</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteObservation(observation)}
                                                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                                                    aria-label="Delete research observation"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <form onSubmit={addObservation} className="mt-5 space-y-3">
                                    <div className="grid gap-3 md:grid-cols-2">
                                        <input
                                            value={observationForm.stage}
                                            onChange={(event) => setObservationForm({ ...observationForm, stage: event.target.value })}
                                            placeholder="Stage"
                                            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                        <input
                                            value={observationForm.friction_tag}
                                            onChange={(event) => setObservationForm({ ...observationForm, friction_tag: event.target.value })}
                                            placeholder="Friction tag"
                                            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <select
                                        value={observationForm.severity}
                                        onChange={(event) => setObservationForm({ ...observationForm, severity: event.target.value as typeof emptyObservationForm.severity })}
                                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                        aria-label="Observation severity"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="critical">Critical</option>
                                    </select>
                                    <textarea
                                        value={observationForm.note}
                                        onChange={(event) => setObservationForm({ ...observationForm, note: event.target.value })}
                                        placeholder="Observation note"
                                        required
                                        rows={3}
                                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                    />
                                    <input
                                        value={observationForm.drop_off_phrase}
                                        onChange={(event) => setObservationForm({ ...observationForm, drop_off_phrase: event.target.value })}
                                        placeholder="Drop-off phrase"
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                    />
                                    <textarea
                                        value={observationForm.recommended_action}
                                        onChange={(event) => setObservationForm({ ...observationForm, recommended_action: event.target.value })}
                                        placeholder="Recommended action"
                                        rows={2}
                                        className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                    />
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
                                    >
                                        <FileText size={16} />
                                        Add observation
                                    </button>
                                </form>
                            </section>
                        </div>
                    </section>
                ) : (
                    <section className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-orange-50/50 p-10 text-center dark:border-orange-500/20 dark:bg-orange-500/10">
                        <ClipboardList className="mb-4 h-12 w-12 text-orange-500" />
                        <p className="text-xl font-black text-gray-950 dark:text-white">Create a research session</p>
                        <p className="mt-2 max-w-lg text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Start with one seeker journey, broker shadowing session, or consented call/chat review.
                        </p>
                        <button
                            type="button"
                            onClick={() => openCreateModal()}
                            className="mt-5 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                        >
                            New session
                        </button>
                    </section>
                )}
            </div>

            {modalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
                    <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
                    <form
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="research-session-modal-title"
                        onSubmit={saveSession}
                        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
                    >
                        <div className="mb-5 flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                    {editingSessionId ? 'Edit research' : 'New research'}
                                </p>
                                <h2 id="research-session-modal-title" className="mt-2 text-2xl font-black text-gray-950 dark:text-white">
                                    {editingSessionId ? 'Update session' : 'Create session'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                                aria-label="Close research session modal"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Track</span>
                                <select
                                    value={sessionForm.track}
                                    onChange={(event) => setSessionForm({ ...sessionForm, track: event.target.value as ResearchTrack })}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                >
                                    {RESEARCH_TRACKS.map((track) => (
                                        <option key={track} value={track}>{getResearchTrackConfig(track).title}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Status</span>
                                <select
                                    value={sessionForm.status}
                                    onChange={(event) => setSessionForm({ ...sessionForm, status: event.target.value as ResearchStatus })}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                >
                                    {RESEARCH_STATUSES.map((status) => (
                                        <option key={status} value={status}>{getResearchStatusLabel(status)}</option>
                                    ))}
                                </select>
                            </label>
                        </div>

                        <label className="mt-4 block space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Title</span>
                            <input
                                value={sessionForm.title}
                                onChange={(event) => setSessionForm({ ...sessionForm, title: event.target.value })}
                                required
                                aria-invalid={sessionTitleError ? 'true' : 'false'}
                                aria-describedby={sessionTitleError ? 'research-session-title-error' : undefined}
                                placeholder="New seeker journey shadowing"
                                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                            {sessionTitleError && (
                                <span id="research-session-title-error" role="alert" className="block text-sm font-semibold text-red-600 dark:text-red-300">
                                    {sessionTitleError}
                                </span>
                            )}
                        </label>

                        <div className="mt-4 grid gap-4 md:grid-cols-3">
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Participant</span>
                                <select
                                    value={sessionForm.participant_role}
                                    onChange={(event) => setSessionForm({ ...sessionForm, participant_role: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                >
                                    <option value="user">User</option>
                                    <option value="manager">Manager</option>
                                    <option value="broker">Broker</option>
                                    <option value="support">Support</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Scheduled</span>
                                <input
                                    type="datetime-local"
                                    value={sessionForm.scheduled_at || ''}
                                    onChange={(event) => setSessionForm({ ...sessionForm, scheduled_at: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                            </label>
                            <label className="space-y-2">
                                <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Observed</span>
                                <input
                                    type="datetime-local"
                                    value={sessionForm.observed_at || ''}
                                    onChange={(event) => setSessionForm({ ...sessionForm, observed_at: event.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                                />
                            </label>
                        </div>

                        {sessionForm.track === 'call_chat_review' && (
                            <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-500/30 dark:bg-orange-500/10">
                                <label className="inline-flex items-center gap-2 text-sm font-bold text-gray-800 dark:text-gray-100">
                                    <input
                                        type="checkbox"
                                        checked={Boolean(sessionForm.consent_confirmed)}
                                        onChange={(event) => setSessionForm({ ...sessionForm, consent_confirmed: event.target.checked })}
                                        className="h-4 w-4 accent-orange-600"
                                    />
                                    Consent confirmed for call/chat review
                                </label>
                                <input
                                    value={sessionForm.consent_note || ''}
                                    onChange={(event) => setSessionForm({ ...sessionForm, consent_note: event.target.value })}
                                    placeholder="Consent note or support ticket reference"
                                    className="mt-3 w-full rounded-xl border border-orange-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-orange-500/30 dark:bg-gray-950 dark:text-white"
                                />
                            </div>
                        )}

                        <label className="mt-4 block space-y-2">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Summary</span>
                            <textarea
                                value={sessionForm.summary || ''}
                                onChange={(event) => setSessionForm({ ...sessionForm, summary: event.target.value })}
                                rows={4}
                                placeholder="What this session is trying to learn"
                                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                            />
                        </label>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={closeModal}
                                className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!canSaveSession}
                                aria-disabled={!canSaveSession}
                                className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:opacity-60"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                Save session
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
