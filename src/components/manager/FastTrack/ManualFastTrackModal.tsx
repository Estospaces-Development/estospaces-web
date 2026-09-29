"use client";

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Search, Zap } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    createFastTrackCase,
    type FastTrackCase,
    type PropertyType,
} from '@/services/fastTrackService';
import { getBrokerLeads, type Lead } from '@/services/leadsService';
import { formatLeadStage, resolveLeadStage } from '@/lib/fastTrackWorkflow';
import type { ManagerFastTrackRequestContext } from '@/lib/managerFastTrackRequestNavigation';
import { loadManagerPlanEntitlement } from '@/lib/planLimit';
import {
    findRequestContextCaseMatch,
    getFastTrackStartSuccessMessage,
    getRequestContextCaseHeading,
    hasManagerFastTrackRequestContext,
    isReusableFastTrackCase,
    leadMatchesRequestContext,
    resolveFastTrackStartNotice,
    type FastTrackStartNotice,
} from '@/lib/manualFastTrackStart';

interface ManualFastTrackModalProps {
    open: boolean;
    existingCases: FastTrackCase[];
    /** IDs from a dashboard or notification shortcut, matched by field rather than free-text search. */
    requestContext?: ManagerFastTrackRequestContext | null;
    backgroundBusy?: boolean;
    onClose: () => void;
    onCreated?: (createdCase: FastTrackCase) => void | Promise<void>;
}

const CLOSED_LEAD_STATUSES = new Set(['closed_won', 'closed_lost', 'cancelled']);
const CLOSED_LEAD_STAGES = new Set(['completed', 'expired', 'rejected', 'withdrawn']);

const getLeadKey = (propertyId?: string, clientId?: string) => `${propertyId || ''}:${clientId || ''}`;

const getLeadTitle = (lead: Lead) => (
    lead.property?.title || lead.propertyInterested || lead.property_name || 'Property enquiry'
);

const getLeadClientName = (lead: Lead) => (
    lead.name || lead.email || (lead.user_id ? `Client ${lead.user_id.slice(0, 8)}` : 'Linked client needed')
);

const getLeadAddress = (lead: Lead) => {
    const parts = [lead.property?.address_line_1, lead.property?.city].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Address not available';
};

const mapListingTypeToFastTrackPropertyType = (listingType?: string): PropertyType => {
    switch ((listingType || '').trim().toLowerCase()) {
        case 'sale':
        case 'sell':
        case 'buy':
            return 'buy';
        default:
            return 'rent';
    }
};

const shouldStartFromBrokerSelection = (lead: Lead) => Boolean(
    lead.broker_request_id
    && lead.source === 'broker_request'
    && lead.journey_source === 'broker_request_selection',
);

const isRecoverableBrokerRequestError = (message: string) => {
    const normalized = message.trim().toLowerCase();
    return normalized.includes('broker request') || normalized.includes('broker selection');
};

export default function ManualFastTrackModal({
    open,
    existingCases,
    requestContext = null,
    backgroundBusy = false,
    onClose,
    onCreated,
}: ManualFastTrackModalProps) {
    const toast = useToast();
    const { user } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [actingLeadId, setActingLeadId] = useState<string | null>(null);
    const [contextFilterActive, setContextFilterActive] = useState(false);
    const [startNotice, setStartNotice] = useState<{ leadId: string; notice: FastTrackStartNotice } | null>(null);

    useEffect(() => {
        // A start error belongs to this modal session; never carry it to the next screen.
        setStartNotice(null);
        if (!open) {
            setSearchQuery('');
            setError(null);
            setContextFilterActive(false);
            return;
        }

        setSearchQuery('');
        setContextFilterActive(hasManagerFastTrackRequestContext(requestContext));

        let cancelled = false;

        const loadLeads = async () => {
            setLoading(true);
            setError(null);

            const result = await getBrokerLeads();

            if (cancelled) {
                return;
            }

            if (result.error) {
                setError(result.error);
                setLeads([]);
                setLoading(false);
                return;
            }

            setLeads(result.data || []);
            setLoading(false);
        };

        void loadLeads();

        return () => {
            cancelled = true;
        };
    }, [open, requestContext]);

    const activeCaseByLeadKey = useMemo(() => {
        const nextMap = new Map<string, FastTrackCase>();

        existingCases.forEach((caseItem) => {
            if (!isReusableFastTrackCase(caseItem)) {
                return;
            }

            nextMap.set(getLeadKey(caseItem.propertyId, caseItem.clientId), caseItem);
        });

        return nextMap;
    }, [existingCases]);

    const eligibleLeads = useMemo(() => {
        return leads
            .filter((lead) => {
                const stage = resolveLeadStage(lead);

                return Boolean(
                    lead.property_id
                    && lead.user_id
                    && !CLOSED_LEAD_STATUSES.has(lead.status)
                    && !CLOSED_LEAD_STAGES.has(stage),
                );
            })
            .map((lead) => ({
                lead,
                stage: resolveLeadStage(lead),
                activeCase: activeCaseByLeadKey.get(getLeadKey(lead.property_id, lead.user_id)) || null,
            }));
    }, [activeCaseByLeadKey, leads]);

    const requestContextMatch = useMemo(
        () => findRequestContextCaseMatch(existingCases, requestContext),
        [existingCases, requestContext],
    );
    const requestContextCase = requestContextMatch?.caseItem || null;

    const filteredLeads = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const scopedLeads = contextFilterActive
            ? eligibleLeads.filter(({ lead }) => leadMatchesRequestContext(lead, requestContext))
            : eligibleLeads;

        if (!query) {
            return scopedLeads;
        }

        return scopedLeads.filter(({ lead, stage, activeCase }) => {
            const haystack = [
                lead.lead_number,
                lead.id,
                lead.broker_request_id,
                lead.user_id,
                lead.property_id,
                getLeadTitle(lead),
                getLeadClientName(lead),
                lead.email,
                getLeadAddress(lead),
                formatLeadStage(stage),
                activeCase?.caseId,
            ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return haystack.includes(query);
        });
    }, [contextFilterActive, eligibleLeads, requestContext, searchQuery]);

    const handleOpenCase = async (caseItem: FastTrackCase) => {
        onClose();
        await onCreated?.(caseItem);
    };

    const handleCreateCase = async (lead: Lead, activeCase: FastTrackCase | null) => {
        if (activeCase) {
            toast.success('This client already has an active 24-hour fast-track case. Opening it now.');
            await handleOpenCase(activeCase);
            return;
        }

        if (!lead.property_id || !lead.user_id) {
            setStartNotice({ leadId: lead.id, notice: { message: 'This lead needs both a linked property and a linked client account before fast-track can start.' } });
            return;
        }

        setStartNotice(null);
        setActingLeadId(lead.id);
        let modalClosed = false;

        try {
            const basePayload = {
                property_id: lead.property_id,
                lead_id: lead.id,
                manager_id: lead.broker_id || lead.matched_broker_id || user?.id,
                client_id: lead.user_id,
                client_name: getLeadClientName(lead),
                property_title: getLeadTitle(lead),
                property_type: mapListingTypeToFastTrackPropertyType(lead.property?.listing_type),
                listing_type: lead.property?.listing_type as 'rent' | 'sale' | 'lease' | undefined,
            } as const;
            const initialPayload = shouldStartFromBrokerSelection(lead)
                ? {
                    ...basePayload,
                    broker_request_id: lead.broker_request_id,
                    started_from: 'broker_request_selection' as const,
                }
                : {
                    ...basePayload,
                    started_from: 'direct_property' as const,
                };

            let result = await createFastTrackCase(initialPayload, { suppressErrorToast: true });
            if (
                result.error
                && initialPayload.started_from === 'broker_request_selection'
                && isRecoverableBrokerRequestError(result.error)
            ) {
                result = await createFastTrackCase({
                    ...basePayload,
                    started_from: 'direct_property',
                }, { suppressErrorToast: true });
            }

            if (result.error || !result.data) {
                const existingCase = activeCaseByLeadKey.get(getLeadKey(lead.property_id, lead.user_id)) || null;
                if (existingCase && (result.error || '').toLowerCase().includes('active fast-track case')) {
                    toast.success('An active 24-hour case already exists for this client. Opening it now.');
                    modalClosed = true;
                    await handleOpenCase(existingCase);
                    return;
                }

                setStartNotice({ leadId: lead.id, notice: await resolveFastTrackStartNotice(result.error, loadManagerPlanEntitlement) });
                return;
            }

            const createdCase = result.data;
            const reused = result.reused || existingCases.some((caseItem) => caseItem.id === createdCase.id);
            toast.success(getFastTrackStartSuccessMessage({ reused, requestedLeadId: result.requestedLeadId }));
            modalClosed = true;
            onClose();
            await onCreated?.(createdCase);
        } catch (createError: unknown) {
            const notice = await resolveFastTrackStartNotice(createError);
            if (modalClosed) {
                // The modal is gone, so only a toast can reach the screen the manager returned to.
                toast.error(notice.message);
            } else {
                setStartNotice({ leadId: lead.id, notice });
            }
        } finally {
            setActingLeadId(null);
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={() => {
                if (!actingLeadId) {
                    onClose();
                }
            }}
            title="Add 24h Fast Track"
            size="xl"
            footer={
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Start fast-track from an existing manager lead with a linked client account.
                    </p>
                    <button
                        onClick={onClose}
                        disabled={Boolean(actingLeadId)}
                        className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                    >
                        Close
                    </button>
                </div>
            }
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/80 p-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                    <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                            <Zap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Manual 24-hour launch</p>
                            <p className="mt-1 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                Pick one of your active leads to start the manager-side fast-track workspace immediately. If a live case already exists, you can jump straight into it.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder="Search by client, property, lead number, or case ID"
                        className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-11 py-3 text-sm text-gray-900 outline-none transition-colors focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                    />
                </div>

                {requestContextCase ? (
                    <div
                        role="status"
                        className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-blue-900/40 dark:bg-blue-950/20"
                    >
                        <div>
                            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                                {getRequestContextCaseHeading(requestContextMatch?.matchedBy || 'client_property')}
                            </p>
                            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                                {requestContextCase.propertyTitle || 'Selected property'} for {requestContextCase.clientName || 'this client'} · Case {requestContextCase.caseId}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                void handleOpenCase(requestContextCase);
                            }}
                            disabled={Boolean(actingLeadId)}
                            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <span>Open existing case</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                ) : null}

                {contextFilterActive ? (
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <span>Showing leads linked to the selected request.</span>
                        <button
                            type="button"
                            onClick={() => setContextFilterActive(false)}
                            className="font-semibold text-orange-600 underline-offset-2 hover:underline dark:text-orange-400"
                        >
                            Show all leads
                        </button>
                    </div>
                ) : null}

                {loading ? (
                    <div className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                        <BrandLoadingScreen variant="panel" label="Loading eligible users and properties..." />
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                        {error}
                    </div>
                ) : filteredLeads.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/40">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">No eligible leads found</p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {searchQuery
                                ? `No active manager leads matched "${searchQuery}".`
                                : contextFilterActive
                                    ? 'No eligible lead is linked to this request yet. Use Show all leads to pick one manually.'
                                    : 'You need an active lead with both a linked property and a linked client account before starting manual fast-track.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredLeads.map(({ lead, stage, activeCase }) => {
                            const isBusy = actingLeadId === lead.id;
                            const shouldDisableStart = isBusy || (!activeCase && backgroundBusy);
                            const leadNotice = startNotice?.leadId === lead.id ? startNotice.notice : null;

                            return (
                                <div
                                    key={lead.id}
                                    className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-black"
                                >
                                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {getLeadTitle(lead)}
                                                </h3>
                                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                                                    {formatLeadStage(stage)}
                                                </span>
                                                {activeCase ? (
                                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                                        Active case {activeCase.caseId}
                                                    </span>
                                                ) : (
                                                    <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                                                        Ready to start
                                                    </span>
                                                )}
                                            </div>

                                            <div className="grid gap-3 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-3">
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Client</p>
                                                    <p className="mt-1 font-medium text-gray-900 dark:text-white">{getLeadClientName(lead)}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{lead.email || lead.phone || 'No contact details'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Property Address</p>
                                                    <p className="mt-1">{getLeadAddress(lead)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lead Reference</p>
                                                    <p className="mt-1">{lead.lead_number || lead.id}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                void handleCreateCase(lead, activeCase);
                                            }}
                                            disabled={shouldDisableStart}
                                            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                                activeCase
                                                    ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900'
                                                    : 'bg-orange-500 text-white hover:bg-orange-600'
                                            }`}
                                        >
                                            {isBusy ? <ActionSpinner className="h-4 w-4" /> : null}
                                            <span>
                                                {activeCase
                                                    ? 'Open active case'
                                                    : backgroundBusy && !isBusy
                                                        ? 'Refreshing queue...'
                                                        : 'Start 24h case'}
                                            </span>
                                            {!isBusy ? <ArrowRight className="h-4 w-4" /> : null}
                                        </button>
                                    </div>
                                    {leadNotice ? (
                                        <div
                                            role="alert"
                                            className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200"
                                        >
                                            {leadNotice.title ? <p className="font-semibold">{leadNotice.title}</p> : null}
                                            <p className={leadNotice.title ? 'mt-1' : undefined}>{leadNotice.message}</p>
                                            {leadNotice.action ? (
                                                <Link
                                                    to={leadNotice.action.href}
                                                    onClick={onClose}
                                                    className="mt-2 inline-flex font-semibold text-orange-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-orange-300"
                                                >
                                                    {leadNotice.action.label}
                                                </Link>
                                            ) : null}
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
