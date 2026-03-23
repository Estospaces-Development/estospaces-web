"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    Clock,
    FileText,
    Home,
    Loader2,
    Shield,
} from 'lucide-react';
import { FastTrackCase, getFastTrackCases } from '@/services/fastTrackService';
import FastTrackDocuments from '@/components/manager/FastTrack/FastTrackDocuments';
import FastTrackProgress from '@/components/manager/FastTrack/FastTrackProgress';

const statusMeta: Record<FastTrackCase['finalStatus'], { label: string; tone: string; note: string }> = {
    in_progress: {
        label: 'In progress',
        tone: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        note: 'Your case is still inside the live 24-hour fast-track window.',
    },
    completed: {
        label: 'Completed',
        tone: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        note: 'The fast-track process is complete and ready for the next operational step.',
    },
    expired: {
        label: 'Expired',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'The 24-hour window has expired, so follow-up will continue manually.',
    },
    rejected: {
        label: 'Rejected',
        tone: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        note: 'This fast-track case was rejected and will not auto-progress further.',
    },
};

const stepDescriptions: Record<FastTrackCase['currentStep'], string> = {
    documents: 'The team is reviewing verification documents and supporting records.',
    owner_approval: 'The case is waiting for owner approval before moving forward.',
    legal_check: 'Legal and compliance checks are being completed.',
    payment_ready: 'The case is in final readiness for handoff.',
    completed: 'Everything required for this fast-track case is complete.',
};

export default function UserFastTrackPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(searchParams.get('case'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const { data, error: requestError } = await getFastTrackCases();
        if (data) {
            setCases(data);
            setError(null);
            setSelectedCaseId((previous) => {
                const requestedCaseId = searchParams.get('case');
                if (requestedCaseId && data.some((item) => item.caseId === requestedCaseId)) {
                    return requestedCaseId;
                }
                if (previous && data.some((item) => item.caseId === previous)) {
                    return previous;
                }
                return data[0]?.caseId || null;
            });
        } else if (!silent) {
            setError(requestError || 'Unable to load your fast-track cases.');
        }

        if (!silent) {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        const refreshCases = () => {
            void fetchCases(true);
        };

        const interval = window.setInterval(refreshCases, 5000);
        window.addEventListener('focus', refreshCases);
        document.addEventListener('visibilitychange', refreshCases);

        return () => {
            window.clearInterval(interval);
            window.removeEventListener('focus', refreshCases);
            document.removeEventListener('visibilitychange', refreshCases);
        };
    }, [fetchCases]);

    useEffect(() => {
        if (!selectedCaseId) {
            if (!searchParams.get('case')) {
                return;
            }
            setSearchParams((previous) => {
                const next = new URLSearchParams(previous);
                next.delete('case');
                return next;
            });
            return;
        }

        if (searchParams.get('case') === selectedCaseId) {
            return;
        }

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.set('case', selectedCaseId);
            return next;
        });
    }, [searchParams, selectedCaseId, setSearchParams]);

    const selectedCase = useMemo(
        () => cases.find((item) => item.caseId === selectedCaseId) || cases[0] || null,
        [cases, selectedCaseId],
    );

    const stats = useMemo(() => ({
        active: cases.filter((item) => item.finalStatus === 'in_progress').length,
        completed: cases.filter((item) => item.finalStatus === 'completed').length,
        attention: cases.filter((item) => item.finalStatus === 'expired' || item.finalStatus === 'rejected').length,
    }), [cases]);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="max-w-6xl mx-auto px-4 lg:px-6 py-8">
                <button
                    onClick={() => navigate('/user/dashboard')}
                    className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back to Dashboard</span>
                </button>

                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">24-Hour Fast Track</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                            Track every live case, document checkpoint, and stage update in one place.
                        </p>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active cases</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                    <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs attention</p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats.attention}</p>
                    </div>
                </div>

                {loading && cases.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-orange-500">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Loading your fast-track cases...</p>
                    </div>
                ) : error ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-red-200 dark:border-red-900/40 p-10 text-center">
                        <AlertTriangle className="mx-auto text-red-500 mb-4" size={36} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Unable to load fast-track cases</h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{error}</p>
                        <button
                            onClick={() => void fetchCases()}
                            className="mt-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold px-5 py-3 transition-colors"
                        >
                            Try again
                        </button>
                    </div>
                ) : cases.length === 0 ? (
                    <div className="mt-8 rounded-3xl bg-white dark:bg-gray-800 border border-dashed border-gray-200 dark:border-gray-700 p-12 text-center">
                        <Clock className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No fast-track cases yet</h2>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            Start a 24-hour fast-track case from a property page and it will appear here automatically.
                        </p>
                        <button
                            onClick={() => navigate('/user/search')}
                            className="mt-6 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold px-5 py-3 transition-colors"
                        >
                            Explore properties
                        </button>
                    </div>
                ) : selectedCase ? (
                    <div className="mt-8 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                        <aside className="space-y-4">
                            {cases.map((item) => {
                                const meta = statusMeta[item.finalStatus];
                                const isSelected = item.caseId === selectedCase.caseId;
                                return (
                                    <button
                                        key={item.caseId}
                                        type="button"
                                        onClick={() => setSelectedCaseId(item.caseId)}
                                        className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                            isSelected
                                                ? 'border-orange-300 bg-orange-50 shadow-sm shadow-orange-500/10 dark:border-orange-800 dark:bg-orange-950/20'
                                                : 'border-gray-100 bg-white hover:border-orange-200 hover:bg-orange-50/60 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-900/60'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.propertyTitle}</p>
                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Case {item.caseId}</p>
                                            </div>
                                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.tone}`}>
                                                {meta.label}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {item.finalStatus === 'in_progress' ? `${item.hoursRemaining}h remaining` : meta.note}
                                        </div>
                                    </button>
                                );
                            })}
                        </aside>

                        <section className="space-y-6">
                            <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</h2>
                                            <span className="px-2.5 py-0.5 text-xs rounded-full font-medium border bg-gray-50 text-gray-700 border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 dark:text-gray-200">
                                                {selectedCase.propertyType.toUpperCase()}
                                            </span>
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            Submitted {new Date(selectedCase.submittedAt).toLocaleString('en-GB', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold ${statusMeta[selectedCase.finalStatus].tone}`}>
                                        {selectedCase.finalStatus === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} />}
                                        <span>
                                            {selectedCase.finalStatus === 'in_progress'
                                                ? `${selectedCase.hoursRemaining}h remaining`
                                                : statusMeta[selectedCase.finalStatus].label}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-5 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 p-4 text-sm text-gray-600 dark:text-gray-300">
                                    {statusMeta[selectedCase.finalStatus].note}
                                </div>

                                <div className="mt-6">
                                    <FastTrackProgress currentStep={selectedCase.currentStep} />
                                </div>

                                <div className="mt-6 grid gap-4 md:grid-cols-3">
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Clock size={16} className="text-orange-500" />
                                            <p className="font-semibold">Current stage</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{stepDescriptions[selectedCase.currentStep]}</p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <Shield size={16} className="text-blue-500" />
                                            <p className="font-semibold">Document progress</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            {Object.values(selectedCase.documents).filter((status) => status === 'verified').length} of {Object.keys(selectedCase.documents).length} required items are verified.
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
                                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                            <FileText size={16} className="text-indigo-500" />
                                            <p className="font-semibold">Next action</p>
                                        </div>
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                                            If documents are requested or re-uploads are needed, head to your profile upload area right away.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Shield className="text-orange-500" size={20} />
                                        <h3 className="text-lg font-semibold">Document checklist</h3>
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                        This is read-only on your side, so you can see what is verified without accidentally changing the workflow.
                                    </p>
                                    <div className="mt-4">
                                        <FastTrackDocuments
                                            documents={selectedCase.documents}
                                            onVerify={() => {}}
                                            isReadOnly
                                        />
                                    </div>
                                </div>

                                <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                                        <Home className="text-blue-500" size={20} />
                                        <h3 className="text-lg font-semibold">Quick links</h3>
                                    </div>
                                    <div className="mt-4 space-y-3">
                                        <button
                                            onClick={() => navigate('/user/dashboard/profile')}
                                            className="w-full rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold px-4 py-3 transition-colors"
                                        >
                                            Open document uploads
                                        </button>
                                        <button
                                            onClick={() => navigate('/user/dashboard/messages')}
                                            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                        >
                                            Open messages
                                        </button>
                                        {selectedCase.propertyId && (
                                            <button
                                                onClick={() => navigate(`/user/properties/${selectedCase.propertyId}`)}
                                                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                                            >
                                                View property
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
