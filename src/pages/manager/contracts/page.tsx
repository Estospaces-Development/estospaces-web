import React, { useEffect, useState, useCallback } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle, PenTool, Eye, RefreshCw } from 'lucide-react';
import { isPendingManagerSignature, normalizeContractStatus } from '@/lib/contractStatus';
import { getUserContracts, signContract } from '@/services/contractsService';
import { type Contract } from '@/types/booking';
import { useToast } from '@/contexts/ToastContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { buildWorkspacePath, resolveContractWorkspaceContext } from '@/lib/workspaceLinks';
import { getApplications, type Application } from '@/services/applicationsService';
import { getFastTrackCases, type FastTrackCase } from '@/services/fastTrackService';
import FastTrackCompanionPanel from '@/components/fast-track/FastTrackCompanionPanel';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    resolveExactFastTrackCase,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import CreateContractModal from '@/components/manager/contracts/CreateContractModal';

type Tab = 'all' | 'draft' | 'pending' | 'active' | 'terminated';

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'Draft', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: <FileText size={14} /> },
    pending_user_signature: { label: 'Awaiting Tenant', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={14} /> },
    pending_manager_signature: { label: 'Awaiting Your Signature', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', icon: <PenTool size={14} /> },
    active: { label: 'Active', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle size={14} /> },
    terminated: { label: 'Terminated', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <AlertCircle size={14} /> },
};

export default function ManagerContractsPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [applications, setApplications] = useState<Application[]>([]);
    const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
    const [loading, setLoading] = useState(true);
    const [signingId, setSigningId] = useState<string | null>(null);
    const [viewContract, setViewContract] = useState<Contract | null>(null);
    const [createContractTarget, setCreateContractTarget] = useState<Application | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const { success, error: toastError, info } = useToast();
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const [hasAppliedRouteFocus, setHasAppliedRouteFocus] = useState(false);
    const removedCaseNoticeRef = React.useRef<string | null>(null);
    const hasWorkspaceFocusRequest = Boolean(
        searchParams.get('contract')
        || searchParams.get('application')
        || searchParams.get('case')
        || searchParams.get('lead')
        || searchParams.get('property'),
    );

    const fetchContracts = useCallback(async () => {
        setLoading(true);
        const [contractsResult, applicationsResult, fastTrackResult] = await Promise.all([
            getUserContracts(),
            getApplications({ suppressErrorToast: true }),
            getFastTrackCases({ suppressErrorToast: true }),
        ]);

        if (contractsResult.error) {
            toastError(contractsResult.error);
        } else if (contractsResult.data) {
            setContracts(contractsResult.data);
        }

        setApplications(applicationsResult.data || []);
        setFastTrackCases(fastTrackResult.data || []);
        setLoading(false);
    }, [toastError]);

    useEffect(() => { fetchContracts(); }, [fetchContracts]);

    useWorkflowWorkspaceRefresh({
        tags: [
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
        refresh: fetchContracts,
    });

    useEffect(() => {
        setHasAppliedRouteFocus(false);
    }, [searchParams]);

    const rawCaseId = searchParams.get('case');
    const { caseId: sanitizedCaseId, removedCaseId } = React.useMemo(
        () => sanitizeWorkspaceCaseId(rawCaseId, fastTrackCases.map((caseItem) => caseItem.caseId)),
        [fastTrackCases, rawCaseId],
    );

    useEffect(() => {
        if (loading || !removedCaseId) {
            return;
        }

        if (removedCaseNoticeRef.current !== removedCaseId) {
            removedCaseNoticeRef.current = removedCaseId;
            info(DELETED_FAST_TRACK_CASE_MESSAGE);
        }

        setSearchParams((previous) => stripCaseSearchParam(previous));
    }, [info, loading, removedCaseId, setSearchParams]);

    const handleCountersign = async (id: string) => {
        setSigningId(id);
        const { data, error } = await signContract(id, 'manager');
        if (error) {
            toastError(error);
        } else if (data) {
            success('Contract countersigned successfully!');
            // Update in list
            setContracts(prev => prev.map(c => c.id === id ? data : c));
            if (viewContract?.id === id) setViewContract(data);
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.CONTRACTS,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.PAYMENTS,
                ],
                reason: 'Manager countersigned contract',
                ids: {
                    contractId: data.id,
                    applicationId: data.application_id,
                    caseId: data.fast_track_case_id,
                    leadId: data.lead_id,
                    propertyId: data.property_id,
                },
            });
        }
        setSigningId(null);
    };

    const { application: focusedApplication, contract: focusedContract } = resolveContractWorkspaceContext(
        contracts,
        applications,
        {
            contractId: searchParams.get('contract'),
            applicationId: searchParams.get('application'),
            caseId: sanitizedCaseId,
            leadId: searchParams.get('lead'),
            propertyId: searchParams.get('property'),
        },
    );
    const focusedFastTrackCase = resolveExactFastTrackCase(
        fastTrackCases,
        sanitizedCaseId,
        focusedApplication?.fast_track_case_id,
    );
    const focusedJourneyType = focusedFastTrackCase?.journeyType || (focusedApplication?.listing_type === 'sale' ? 'buy' : 'rent');
    const applicationsWorkspacePath = buildWorkspacePath('/manager/applications', {
        applicationId: searchParams.get('application') || focusedApplication?.id,
        caseId: sanitizedCaseId || focusedFastTrackCase?.caseId,
        leadId: searchParams.get('lead') || focusedApplication?.lead_id || focusedFastTrackCase?.leadId,
        propertyId: searchParams.get('property') || focusedApplication?.property_id || focusedFastTrackCase?.propertyId,
    });
    const fastTrackWorkspacePath = focusedFastTrackCase
        ? `/manager/fast-track?case=${focusedFastTrackCase.caseId}`
        : '/manager/fast-track';
    const canDraftLinkedContract = Boolean(
        focusedApplication
        && focusedJourneyType !== 'buy'
        && !focusedContract
        && ['approved', 'ready_for_contract'].includes(String(focusedApplication.status || '').trim()),
    );
    const handleFastTrackCaseUpdated = useCallback((nextCase: FastTrackCase) => {
        setFastTrackCases((previous) => previous.map((caseItem) => (
            caseItem.caseId === nextCase.caseId ? nextCase : caseItem
        )));
    }, []);

    useEffect(() => {
        if (hasAppliedRouteFocus || !focusedContract) {
            return;
        }

        setHasAppliedRouteFocus(true);
    }, [focusedContract, hasAppliedRouteFocus]);

    const filteredContracts = contracts.filter(c => {
        const normalizedStatus = normalizeContractStatus(c.status);
        // Tab filter
        const matchesTab = activeTab === 'all' 
            ? true 
            : activeTab === 'pending' 
                ? (normalizedStatus === 'pending_user_signature' || normalizedStatus === 'pending_manager_signature')
                : normalizedStatus === activeTab;
        
        if (!matchesTab) return false;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const haysack = [
                c.id,
                c.property,
                c.name,
                c.title,
            ].filter(Boolean).join(' ').toLowerCase();
            
            return haysack.includes(query);
        }

        return true;
    }).sort((left, right) => {
        if (!focusedContract) {
            return 0;
        }
        if (left.id === focusedContract.id) {
            return -1;
        }
        if (right.id === focusedContract.id) {
            return 1;
        }
        return 0;
    });

    const tabs: { key: Tab; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: contracts.length },
        { key: 'pending', label: 'Pending', count: contracts.filter(c => normalizeContractStatus(c.status).startsWith('pending')).length },
        { key: 'active', label: 'Active', count: contracts.filter(c => normalizeContractStatus(c.status) === 'active').length },
        { key: 'draft', label: 'Drafts', count: contracts.filter(c => normalizeContractStatus(c.status) === 'draft').length },
    ];

    const formatDate = (d?: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const formatCurrency = (v?: number) => v != null ? `£${v.toLocaleString('en-GB', { minimumFractionDigits: 2 })}` : '—';

    return (
        <div className="p-6 md:p-8 font-outfit">
            {/* Header */}
            {/* Search and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <div className="relative flex-1 max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search contracts by tenant or property..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                    />
                </div>
                <button
                    onClick={fetchContracts}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors self-end md:self-auto"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                                ? 'bg-orange-500 text-white shadow-md'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                    >
                        {tab.label} <span className="ml-1 opacity-70">({tab.count})</span>
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-20">
                    <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Empty State */}
            {!loading && filteredContracts.length === 0 && (
                <div className="text-center py-20">
                    <FileText className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
                    {hasWorkspaceFocusRequest && !focusedContract && (
                        <p className="mx-auto mb-4 max-w-xl rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                            You are in the correct contracts workspace for this fast-track case, but no live tenancy contract has been created yet.
                        </p>
                    )}
                    <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">No contracts found</h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                        Tenancy contracts are created from approved rental applications. Purchase journeys continue in the sale progression workspace.
                    </p>
                </div>
            )}

            {/* Contract Cards */}
            {!loading && filteredContracts.length > 0 && (
                <div className="grid gap-4">
                    {hasWorkspaceFocusRequest && !focusedContract && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                            <p className="font-semibold">
                                {focusedJourneyType === 'buy'
                                    ? 'This linked fast-track case is a purchase journey, so a tenancy contract is not expected here.'
                                    : canDraftLinkedContract
                                        ? 'The linked rental application is approved and ready for a draft tenancy agreement.'
                                        : focusedApplication
                                            ? `The linked rental application is currently ${String(focusedApplication.status || '').replace(/_/g, ' ')}.`
                                            : 'This contracts workspace is linked correctly, but the downstream rental records are not ready for a tenancy agreement yet.'}
                            </p>
                            <p className="mt-2">
                                {focusedJourneyType === 'buy'
                                    ? 'Keep the deal moving from the purchase journey workspace instead of waiting for a rent contract.'
                                    : canDraftLinkedContract
                                        ? 'You can draft the tenancy agreement directly from here without leaving the linked case.'
                                        : focusedApplication
                                            ? 'Open the linked application to continue the review and approval steps before the contract stage.'
                                            : (focusedFastTrackCase?.nextAction || focusedFastTrackCase?.statusReason || 'Continue the live case from fast-track or applications and this workspace will populate automatically once the next record is created.')}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-3">
                                {canDraftLinkedContract && focusedApplication && (
                                    <button
                                        type="button"
                                        onClick={() => setCreateContractTarget(focusedApplication)}
                                        className="rounded-xl bg-orange-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-orange-700"
                                    >
                                        Draft linked contract
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => navigate(applicationsWorkspacePath)}
                                    className="rounded-xl border border-orange-300 px-4 py-2.5 font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-950/30"
                                >
                                    {focusedJourneyType === 'buy' ? 'Open purchase journey' : 'Open applications workspace'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate(fastTrackWorkspacePath)}
                                    className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black"
                                >
                                    Open fast-track case
                                </button>
                            </div>
                        </div>
                    )}
                    {focusedContract && (
                        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                            The contract linked to your fast-track case is pinned first so you can countersign without searching manually.
                        </div>
                    )}
                    {focusedFastTrackCase && (
                        <FastTrackCompanionPanel
                            role="manager"
                            fastTrackCase={focusedFastTrackCase}
                            context={{
                                caseId: sanitizedCaseId || focusedFastTrackCase.caseId,
                                applicationId: searchParams.get('application') || focusedApplication?.id,
                                contractId: searchParams.get('contract') || focusedContract?.id,
                                leadId: searchParams.get('lead') || focusedApplication?.lead_id || focusedFastTrackCase.leadId,
                                propertyId: searchParams.get('property') || focusedApplication?.property_id || focusedFastTrackCase.propertyId,
                            }}
                            title="Linked agreement and handover controls"
                            onCaseUpdated={handleFastTrackCaseUpdated}
                            onRefresh={fetchContracts}
                        />
                    )}
                    {filteredContracts.map(contract => {
                        const normalizedStatus = normalizeContractStatus(contract.status);
                        const status = STATUS_MAP[normalizedStatus] || STATUS_MAP.draft;
                        const needsCountersign = isPendingManagerSignature(contract.status);

                        return (
                            <div
                                key={contract.id}
                                className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow ${
                                    contract.id === focusedContract?.id
                                        ? 'ring-2 ring-orange-400/50'
                                        : needsCountersign
                                            ? 'ring-2 ring-orange-400/50'
                                            : ''
                                }`}
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    {/* Left Side */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                                {status.icon} {status.label}
                                            </span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">
                                                {contract.contract_type === 'rental' || contract.contract_type === 'tenancy'
                                                    ? 'Tenancy Agreement'
                                                    : contract.contract_type}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Rent</span>
                                                <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(contract.monthly_rent)}/mo</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Deposit</span>
                                                <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(contract.deposit_amount)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">Start</span>
                                                <p className="font-medium text-gray-700 dark:text-gray-300">{formatDate(contract.start_date)}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-400 dark:text-gray-500 text-xs">End</span>
                                                <p className="font-medium text-gray-700 dark:text-gray-300">{formatDate(contract.end_date)}</p>
                                            </div>
                                        </div>

                                        {/* Signature Status */}
                                        <div className="flex items-center gap-4 mt-3 text-xs">
                                            <span className={`flex items-center gap-1 ${contract.user_signed_at ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {contract.user_signed_at ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                Tenant {contract.user_signed_at ? `signed ${formatDate(contract.user_signed_at)}` : 'not signed'}
                                            </span>
                                            <span className={`flex items-center gap-1 ${contract.manager_signed_at ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                {contract.manager_signed_at ? <CheckCircle size={12} /> : <Clock size={12} />}
                                                You {contract.manager_signed_at ? `signed ${formatDate(contract.manager_signed_at)}` : 'not signed'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setViewContract(contract)}
                                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            <Eye size={16} /> View
                                        </button>
                                        {needsCountersign && (
                                            <button
                                                onClick={() => handleCountersign(contract.id)}
                                                disabled={signingId === contract.id}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white shadow-sm transition-colors disabled:opacity-70"
                                            >
                                                {signingId === contract.id ? (
                                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing...</>
                                                ) : (
                                                    <><PenTool size={16} /> Countersign</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* View Contract Modal */}
            {viewContract && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" onClick={() => setViewContract(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileText className="text-orange-500" /> Contract Details
                            </h2>
                            <button onClick={() => setViewContract(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500">✕</button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                            {(() => {
                                const s = STATUS_MAP[normalizeContractStatus(viewContract.status)] || STATUS_MAP.draft;
                                return (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${s.color}`}>
                                        {s.icon} {s.label}
                                    </span>
                                );
                            })()}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monthly Rent</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(viewContract.monthly_rent)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Security Deposit</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(viewContract.deposit_amount)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Start Date</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(viewContract.start_date)}</p>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">End Date</p>
                                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(viewContract.end_date)}</p>
                                </div>
                            </div>

                            {viewContract.terms_and_conditions && (
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</h3>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                        {viewContract.terms_and_conditions}
                                    </div>
                                </div>
                            )}

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className={`rounded-xl p-4 border ${viewContract.user_signed_at ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Tenant Signature</p>
                                    <p className={`font-semibold text-sm ${viewContract.user_signed_at ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                                        {viewContract.user_signed_at ? `Signed ${formatDate(viewContract.user_signed_at)}` : 'Pending'}
                                    </p>
                                </div>
                                <div className={`rounded-xl p-4 border ${viewContract.manager_signed_at ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Your Signature</p>
                                    <p className={`font-semibold text-sm ${viewContract.manager_signed_at ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>
                                        {viewContract.manager_signed_at ? `Signed ${formatDate(viewContract.manager_signed_at)}` : 'Pending'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer with Countersign button if needed */}
                        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                            <button
                                onClick={() => setViewContract(null)}
                                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                Close
                            </button>
                            {isPendingManagerSignature(viewContract.status) && (
                                <button
                                    onClick={() => handleCountersign(viewContract.id)}
                                    disabled={signingId === viewContract.id}
                                    className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium shadow-sm transition-colors disabled:opacity-70 flex items-center gap-2"
                                >
                                    {signingId === viewContract.id ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Signing...</>
                                    ) : (
                                        <><PenTool size={16} /> Countersign</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {createContractTarget && (
                <CreateContractModal
                    applicationId={createContractTarget.id}
                    propertyPrice={createContractTarget.property_price || 0}
                    onClose={() => setCreateContractTarget(null)}
                    onSuccess={() => {
                        void fetchContracts();
                    }}
                />
            )}
        </div>
    );
}
