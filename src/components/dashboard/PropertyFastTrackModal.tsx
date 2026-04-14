'use client';

import React, { useMemo } from 'react';
import {
    ArrowUpRight,
    CalendarDays,
    Clock3,
    FileCheck2,
    Home,
    Loader2,
    ShieldCheck,
    X,
} from 'lucide-react';
import { FastTrackCase, FastTrackStage } from '@/services/fastTrackService';
import { Lead, UserDocument } from '@/services/leadsService';

type UploadType = 'identity' | 'address';

interface PropertyFastTrackModalProps {
    open: boolean;
    propertyTitle: string;
    propertyAddress: string;
    lead: Lead | null;
    fastTrackCase: FastTrackCase | null;
    userDocuments: UserDocument[];
    isRefreshing: boolean;
    uploadingType: UploadType | null;
    onClose: () => void;
    onUploadDocument: (type: UploadType, file: File) => Promise<void>;
    onOpenDashboard: () => void;
    onOpenMessages: () => void;
}

const STAGES: Array<{ stage: FastTrackStage; label: string; icon: React.ElementType }> = [
    { stage: 'selected', label: 'Selected', icon: Home },
    { stage: 'documents', label: 'Documents', icon: FileCheck2 },
    { stage: 'viewing', label: 'Viewing', icon: CalendarDays },
    { stage: 'decision', label: 'Decision', icon: FileCheck2 },
    { stage: 'agreement', label: 'Agreement', icon: FileCheck2 },
    { stage: 'handover', label: 'Handover', icon: ShieldCheck },
];

const formatStageLabel = (fastTrackCase: FastTrackCase | null) => {
    if (!fastTrackCase) {
        return 'Selected';
    }
    if (fastTrackCase.stage === 'decision' && fastTrackCase.journeyMode === 'sale') {
        return 'Offer';
    }
    return STAGES.find((item) => item.stage === fastTrackCase.stage)?.label || 'Selected';
};

const formatCountdown = (fastTrackCase: FastTrackCase | null) => {
    if (!fastTrackCase) {
        return '24h window';
    }
    if (fastTrackCase.hoursRemaining <= 0) {
        return 'Overdue';
    }
    return `${fastTrackCase.hoursRemaining}h left`;
};

const workspaceSummary = (fastTrackCase: FastTrackCase | null) => {
    if (!fastTrackCase) {
        return 'One workspace from start to finish.';
    }

    switch (fastTrackCase.stage) {
        case 'documents':
            return 'Upload and review the core files on the same page.';
        case 'viewing':
            return 'Schedule or confirm the viewing without leaving the case.';
        case 'decision':
            return fastTrackCase.journeyMode === 'sale'
                ? 'Record or review the offer outcome inside the case.'
                : 'Record or review the application outcome inside the case.';
        case 'agreement':
            return 'Agreement and payment confirmation stay inside the case.';
        case 'handover':
            return 'Finish handover and close the case from the same page.';
        default:
            return 'Open the live case and keep every next step in one workspace.';
    }
};

const stageIndexForCase = (fastTrackCase: FastTrackCase | null) => {
    if (!fastTrackCase) {
        return 0;
    }
    return Math.max(STAGES.findIndex((item) => item.stage === fastTrackCase.stage), 0);
};

const PropertyFastTrackModal = ({
    open,
    propertyTitle,
    propertyAddress,
    fastTrackCase,
    isRefreshing,
    onClose,
    onOpenDashboard,
}: PropertyFastTrackModalProps) => {
    const documentSummary = useMemo(() => {
        const items = fastTrackCase?.documents.items || [];
        return {
            total: items.length,
            uploaded: items.filter((item) => item.status !== 'pending').length,
            approved: items.filter((item) => item.status === 'approved').length,
        };
    }, [fastTrackCase?.documents.items]);

    const stageIndex = useMemo(() => stageIndexForCase(fastTrackCase), [fastTrackCase]);

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/55 px-4 py-6 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl overflow-hidden rounded-[36px] border border-orange-100 bg-[linear-gradient(180deg,#fff7ed_0%,#ffffff_26%,#fffdf8_100%)] shadow-[0_32px_120px_rgba(15,23,42,0.26)] dark:border-orange-900/40 dark:bg-[linear-gradient(180deg,#1c1917_0%,#0f172a_24%,#020617_100%)]">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-5 top-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/85 text-gray-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-orange-700 dark:hover:text-orange-300"
                    aria-label="Close fast-track modal"
                >
                    <X size={18} />
                </button>

                <div className="grid gap-0 lg:grid-cols-[minmax(0,1.25fr)_360px]">
                    <section className="p-7 sm:p-9">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                                Fast-track workspace
                            </span>
                            {fastTrackCase ? (
                                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                    Case {fastTrackCase.caseId}
                                </span>
                            ) : null}
                        </div>

                        <h2 className="mt-5 max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
                            Keep the whole journey in one clean workspace.
                        </h2>
                        <p className="mt-4 max-w-2xl text-base leading-7 text-gray-600 dark:text-gray-300">
                            Open the live case to handle files, viewing, decision, agreement, payment, and handover on one page.
                            No extra workflow screens. No message detours. No compliance-heavy checklist language.
                        </p>

                        <div className="mt-8 grid gap-4 md:grid-cols-3">
                            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                    <Clock3 size={14} />
                                    24h window
                                </div>
                                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatCountdown(fastTrackCase)}
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    The active case stays visible in one place until completion.
                                </p>
                            </div>
                            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Current stage</p>
                                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                                    {formatStageLabel(fastTrackCase)}
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {workspaceSummary(fastTrackCase)}
                                </p>
                            </div>
                            <div className="rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Core files</p>
                                <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                                    {documentSummary.approved}/{Math.max(documentSummary.total, 2)} approved
                                </p>
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    {documentSummary.uploaded} attached. Managers review them in the same workspace.
                                </p>
                            </div>
                        </div>

                        <div className="mt-8 rounded-[32px] border border-white/80 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Property</p>
                                    <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">{propertyTitle}</p>
                                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{propertyAddress}</p>
                                </div>
                                {isRefreshing ? (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
                                        <Loader2 size={14} className="animate-spin" />
                                        Refreshing case
                                    </span>
                                ) : null}
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {STAGES.map((item, index) => {
                                    const Icon = item.icon;
                                    const active = stageIndex === index;
                                    const complete = stageIndex > index || fastTrackCase?.workspaceFinalStatus === 'completed';
                                    return (
                                        <div
                                            key={item.stage}
                                            className={[
                                                'rounded-[24px] border px-4 py-4 transition-colors',
                                                active
                                                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300'
                                                    : complete
                                                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300'
                                                        : 'border-gray-100 bg-gray-50 text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300',
                                            ].join(' ')}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-current/15 bg-white/80 dark:bg-gray-950/40">
                                                    <Icon size={16} />
                                                </span>
                                                <div>
                                                    <p className="text-sm font-semibold">{item.label}</p>
                                                    <p className="mt-1 text-xs opacity-80">
                                                        {index === stageIndex ? 'Open now' : complete ? 'Done here' : 'Stays here'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <aside className="border-t border-orange-100/70 bg-white/85 p-7 dark:border-orange-900/30 dark:bg-white/5 lg:border-l lg:border-t-0">
                        <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">What changes</p>
                            <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                <li>One live page for user, manager, and admin.</li>
                                <li>Files stay attached to the same case and can be reviewed there.</li>
                                <li>Viewing, decision, agreement, and handover stay in that same case.</li>
                                <li>Old links can still open the case, but the work continues inside fast-track.</li>
                            </ul>
                        </div>

                        <div className="mt-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Next step</p>
                            <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">
                                Open the workspace and continue from the live stage. That page is now the only workflow surface you need.
                            </p>
                            <div className="mt-6 flex flex-col gap-3">
                                <button
                                    type="button"
                                    onClick={onOpenDashboard}
                                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
                                >
                                    <ArrowUpRight size={16} />
                                    Open fast-track workspace
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center rounded-[18px] border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default PropertyFastTrackModal;
