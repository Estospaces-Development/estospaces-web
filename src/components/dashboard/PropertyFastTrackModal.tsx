'use client';

import React, { useMemo } from 'react';
import {
    ArrowUpRight,
    CalendarClock,
    CheckCircle2,
    Clock,
    FileImage,
    Loader2,
    MessageCircle,
    ShieldCheck,
    Upload,
    X,
} from 'lucide-react';
import { FastTrackCase } from '@/services/fastTrackService';
import { Lead, UserDocument } from '@/services/leadsService';
import FastTrackProgress from '@/components/manager/FastTrack/FastTrackProgress';

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

const formatLeadLabel = (value?: string) => {
    if (!value) {
        return 'Active lead';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDocumentStatus = (value?: string) => {
    if (!value) {
        return {
            label: 'Upload needed',
            className: 'border-stone-200 bg-stone-100 text-gray-600',
        };
    }

    const normalized = value.toLowerCase();
    if (normalized === 'approved' || normalized === 'verified') {
        return {
            label: 'Verified',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }

    if (normalized === 'rejected') {
        return {
            label: 'Needs replacement',
            className: 'border-red-200 bg-red-50 text-red-700',
        };
    }

    return {
        label: 'In review',
        className: 'border-orange-200 bg-orange-50 text-orange-700',
    };
};

const formatWindowLabel = (lead: Lead | null, fastTrackCase: FastTrackCase | null) => {
    if (fastTrackCase) {
        if (fastTrackCase.finalStatus === 'completed') {
            return 'Completed';
        }

        if (fastTrackCase.finalStatus === 'expired') {
            return 'Expired';
        }

        if (fastTrackCase.finalStatus === 'rejected') {
            return 'Rejected';
        }

        return `${Math.max(fastTrackCase.hoursRemaining, 0)}h remaining`;
    }

    if (typeof lead?.sla_remaining_seconds === 'number' && lead.sla_remaining_seconds > 0) {
        return `${Math.max(Math.ceil(lead.sla_remaining_seconds / 60), 1)} min broker SLA`;
    }

    if (lead?.first_response_at) {
        return 'Broker replied';
    }

    return 'Awaiting first response';
};

const buildRoadmap = (
    lead: Lead | null,
    fastTrackCase: FastTrackCase | null,
    hasIdentityDocument: boolean,
    hasAddressDocument: boolean,
) => {
    const activeIndex = (() => {
        if (fastTrackCase?.finalStatus === 'completed') {
            return 4;
        }

        if (fastTrackCase?.currentStep === 'payment_ready') {
            return 4;
        }

        if (fastTrackCase?.currentStep === 'legal_check' || fastTrackCase?.currentStep === 'owner_approval') {
            return 3;
        }

        if (fastTrackCase?.currentStep === 'documents' || lead?.documents_uploaded || hasIdentityDocument || hasAddressDocument) {
            return 2;
        }

        if (lead?.first_response_at || lead?.response_type || lead?.sla_status === 'success') {
            return 1;
        }

        return 0;
    })();

    const currentReviewLabel =
        fastTrackCase?.currentStep === 'owner_approval'
            ? 'Owner approval is in progress.'
            : fastTrackCase?.currentStep === 'legal_check'
                ? 'Legal checks are underway.'
                : fastTrackCase?.currentStep === 'payment_ready'
                    ? 'The case is moving into final readiness.'
                    : 'The broker and operations team take over after documents are ready.';

    return [
        {
            title: 'Lead is live',
            description: lead?.lead_number
                ? `Lead ${lead.lead_number} is active for this property.`
                : 'Your fast-track request is active on this property.',
        },
        {
            title: 'Broker engagement',
            description: lead?.first_response_at
                ? 'The broker has already responded and the case is moving.'
                : 'The broker response window is being tracked live.',
        },
        {
            title: 'Documents and identity',
            description: lead?.documents_verified
                ? 'Identity and address proofs are verified.'
                : lead?.documents_uploaded || hasIdentityDocument || hasAddressDocument
                    ? 'Supporting files are uploaded and waiting for review.'
                    : 'Upload ID and address proof to keep the case moving smoothly.',
        },
        {
            title: 'Review and approvals',
            description: currentReviewLabel,
        },
        {
            title: 'Ready for next step',
            description: fastTrackCase?.finalStatus === 'completed'
                ? 'The fast-track path is complete.'
                : 'Once review clears, the team can move into the final handoff stage.',
        },
    ].map((item, index) => {
        let state: 'completed' | 'current' | 'upcoming' = 'upcoming';
        if (index < activeIndex) {
            state = 'completed';
        } else if (index === activeIndex) {
            state = 'current';
        }

        return { ...item, state };
    });
};

export default function PropertyFastTrackModal({
    open,
    propertyTitle,
    propertyAddress,
    lead,
    fastTrackCase,
    userDocuments,
    isRefreshing,
    uploadingType,
    onClose,
    onUploadDocument,
    onOpenDashboard,
    onOpenMessages,
}: PropertyFastTrackModalProps) {
    const latestDocuments = useMemo(() => {
        const categories = new Map<string, UserDocument>();
        userDocuments.forEach((document) => {
            if (!categories.has(document.document_category)) {
                categories.set(document.document_category, document);
            }
        });

        return {
            identity: categories.get('identity') || null,
            address: categories.get('address') || null,
        };
    }, [userDocuments]);

    const roadmap = useMemo(
        () => buildRoadmap(lead, fastTrackCase, Boolean(latestDocuments.identity), Boolean(latestDocuments.address)),
        [fastTrackCase, lead, latestDocuments.address, latestDocuments.identity],
    );

    const leadStatusLabel = formatLeadLabel(lead?.status);
    const windowLabel = formatWindowLabel(lead, fastTrackCase);
    const verificationLabel = lead?.documents_verified
        ? 'Verified'
        : lead?.documents_uploaded || latestDocuments.identity || latestDocuments.address
            ? 'Uploaded'
            : 'Upload needed';

    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[150] bg-[rgba(15,23,42,0.68)] px-4 py-5 backdrop-blur-sm sm:px-6" onClick={onClose}>
            <div
                className="mx-auto flex h-full max-w-[1180px] flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-[#fcfbf8] shadow-[0_32px_120px_-48px_rgba(15,23,42,0.55)]"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-start justify-between gap-4 border-b border-stone-200/80 px-6 py-5">
                    <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">24-hour fast track</p>
                        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-[2.1rem]">
                            Live progress for {propertyTitle}
                        </h2>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500">
                            {propertyAddress}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 transition hover:border-orange-300 hover:text-orange-600"
                        aria-label="Close fast-track dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
                    {isRefreshing ? (
                        <div className="flex h-full min-h-[20rem] items-center justify-center text-orange-500">
                            <Loader2 className="h-9 w-9 animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                                            <CalendarClock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Live window</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{windowLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Lead status</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{leadStatusLabel}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="rounded-[1.7rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Verification</p>
                                            <p className="mt-1 text-lg font-semibold text-gray-900">{verificationLabel}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {fastTrackCase && (
                                <div className="rounded-[1.9rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Roadmap</p>
                                            <p className="mt-2 text-lg font-semibold text-gray-900">
                                                Case {fastTrackCase.caseId}
                                            </p>
                                        </div>
                                        <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
                                            {formatLeadLabel(fastTrackCase.finalStatus)}
                                        </div>
                                    </div>
                                    <div className="mt-5">
                                        <FastTrackProgress currentStep={fastTrackCase.currentStep} />
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                <section className="rounded-[1.9rem] border border-stone-200/80 bg-white px-5 py-5 shadow-sm">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Stage roadmap</p>
                                    <div className="mt-5 space-y-4">
                                        {roadmap.map((item, index) => {
                                            const tone =
                                                item.state === 'completed'
                                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                    : item.state === 'current'
                                                        ? 'border-orange-200 bg-orange-50 text-orange-700'
                                                        : 'border-stone-200 bg-stone-50 text-gray-400';

                                            return (
                                                <div key={item.title} className="flex gap-4">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${tone}`}>
                                                            {item.state === 'completed' ? <CheckCircle2 size={18} /> : <span className="text-sm font-semibold">{index + 1}</span>}
                                                        </div>
                                                        {index < roadmap.length - 1 && (
                                                            <div className="mt-2 h-10 w-px bg-stone-200" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 pb-3">
                                                        <p className="text-base font-semibold text-gray-900">{item.title}</p>
                                                        <p className="mt-1 text-sm leading-6 text-gray-500">{item.description}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                <section className="rounded-[1.9rem] border border-stone-200/80 bg-[#faf7f2] px-5 py-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Upload lane</p>
                                            <h3 className="mt-2 text-lg font-semibold text-gray-900">Add supporting files here</h3>
                                            <p className="mt-2 text-sm leading-6 text-gray-500">
                                                Upload image or PDF proofs directly from this dialog. The lead updates after the files land.
                                            </p>
                                        </div>
                                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                            <Upload size={18} />
                                        </div>
                                    </div>

                                    <div className="mt-5 space-y-3">
                                        {([
                                            {
                                                type: 'identity' as const,
                                                title: 'Identity proof',
                                                hint: 'Passport, driver licence, or national ID',
                                                document: latestDocuments.identity,
                                            },
                                            {
                                                type: 'address' as const,
                                                title: 'Address proof',
                                                hint: 'Bank statement, utility bill, or tenancy proof',
                                                document: latestDocuments.address,
                                            },
                                        ]).map((item) => {
                                            const status = formatDocumentStatus(item.document?.status);
                                            const isUploading = uploadingType === item.type;

                                            return (
                                                <label
                                                    key={item.type}
                                                    className="block cursor-pointer rounded-[1.5rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm transition hover:border-orange-300"
                                                >
                                                    <input
                                                        type="file"
                                                        accept="image/*,.pdf"
                                                        className="hidden"
                                                        disabled={isUploading}
                                                        onChange={async (event) => {
                                                            const file = event.target.files?.[0];
                                                            event.currentTarget.value = '';
                                                            if (!file) {
                                                                return;
                                                            }

                                                            await onUploadDocument(item.type, file);
                                                        }}
                                                    />
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500">
                                                                    <FileImage size={18} />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                                                    <p className="mt-1 text-xs leading-5 text-gray-500">{item.hint}</p>
                                                                </div>
                                                            </div>
                                                            <p className="mt-3 truncate text-sm text-gray-600">
                                                                {item.document?.file_name || 'No file uploaded yet'}
                                                            </p>
                                                        </div>
                                                        <div className={`inline-flex shrink-0 items-center rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                                                            {isUploading ? <Loader2 size={13} className="animate-spin" /> : status.label}
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-orange-600">
                                                        <Upload size={16} />
                                                        <span>{item.document ? 'Replace file' : 'Upload image or PDF'}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-4 rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 text-sm leading-6 text-gray-600 shadow-sm">
                                        Uploading both identity and address proof helps the fast-track team verify the case faster.
                                    </div>
                                </section>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-3 border-t border-stone-200/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                        type="button"
                        onClick={onOpenMessages}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50"
                    >
                        <MessageCircle size={16} />
                        <span>Open message thread</span>
                    </button>
                    <button
                        type="button"
                        onClick={onOpenDashboard}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                    >
                        <span>Open full fast-track dashboard</span>
                        <ArrowUpRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
