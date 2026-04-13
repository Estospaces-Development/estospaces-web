'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    CalendarDays,
    CircleDot,
    Clock3,
    FileCheck2,
    FileText,
    Home,
    Loader2,
    Search,
    ShieldCheck,
    Sparkles,
    Upload,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    FastTrackActivityEntry,
    FastTrackCase,
    FastTrackDocumentItem,
    FastTrackStage,
    getFastTrackCases,
    performFastTrackAction,
} from '@/services/fastTrackService';
import { uploadDocument } from '@/services/leadsService';

type WorkspaceRole = 'user' | 'manager' | 'admin';
type FilterMode = 'all' | 'active' | 'completed' | 'cancelled';

const STAGES: FastTrackStage[] = [
    'selected',
    'documents',
    'viewing',
    'decision',
    'agreement',
    'handover',
];

const FILTERS: Array<{ value: FilterMode; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const STAGE_ICONS: Record<FastTrackStage, React.ElementType> = {
    selected: Home,
    documents: FileText,
    viewing: CalendarDays,
    decision: CircleDot,
    agreement: FileCheck2,
    handover: ShieldCheck,
};

const formatStageLabel = (
    stage: FastTrackStage,
    journeyMode: FastTrackCase['journeyMode'],
): string => {
    switch (stage) {
        case 'documents':
            return 'Documents';
        case 'viewing':
            return 'Viewing';
        case 'decision':
            return journeyMode === 'sale' ? 'Offer' : 'Decision';
        case 'agreement':
            return 'Agreement';
        case 'handover':
            return 'Handover';
        default:
            return 'Selected';
    }
};

const formatStatusChip = (fastTrackCase: FastTrackCase) => {
    switch (fastTrackCase.workspaceFinalStatus) {
        case 'completed':
            return {
                label: 'Completed',
                tone: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300',
            };
        case 'cancelled':
            return {
                label: 'Cancelled',
                tone: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300',
            };
        default:
            return {
                label: 'Active',
                tone: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300',
            };
    }
};

const formatDeadline = (hoursRemaining: number) => {
    if (!Number.isFinite(hoursRemaining)) {
        return '24h window';
    }
    if (hoursRemaining <= 0) {
        return 'Overdue';
    }
    return `${hoursRemaining}h left`;
};

const sortCases = (cases: FastTrackCase[]) => [...cases].sort((left, right) => {
    if (left.workspaceFinalStatus !== right.workspaceFinalStatus) {
        if (left.workspaceFinalStatus === 'active') {
            return -1;
        }
        if (right.workspaceFinalStatus === 'active') {
            return 1;
        }
    }
    if (left.hoursRemaining !== right.hoursRemaining) {
        return left.hoursRemaining - right.hoursRemaining;
    }
    return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
});

const resolveSelectedCaseId = (
    cases: FastTrackCase[],
    params: URLSearchParams,
    previous: string | null,
) => {
    if (cases.length === 0) {
        return null;
    }

    const requestedCaseId = params.get('case');
    if (requestedCaseId && cases.some((item) => item.caseId === requestedCaseId)) {
        return requestedCaseId;
    }

    const requestedLeadId = params.get('lead');
    if (requestedLeadId) {
        const caseByLead = cases.find((item) => item.leadId === requestedLeadId);
        if (caseByLead) {
            return caseByLead.caseId;
        }
    }

    const requestedPropertyId = params.get('property');
    if (requestedPropertyId) {
        const caseByProperty = cases.find((item) => item.propertyId === requestedPropertyId);
        if (caseByProperty) {
            return caseByProperty.caseId;
        }
    }

    if (previous && cases.some((item) => item.caseId === previous)) {
        return previous;
    }

    return cases[0].caseId;
};

const textMatches = (source: string | undefined, query: string) =>
    String(source || '').toLowerCase().includes(query.toLowerCase());

const RoleBadge = ({ role }: { role: WorkspaceRole }) => (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
        {role}
    </span>
);

const StagePill = ({
    stage,
    active,
    complete,
    label,
}: {
    stage: FastTrackStage;
    active: boolean;
    complete: boolean;
    label: string;
}) => {
    const Icon = STAGE_ICONS[stage];

    return (
        <div
            className={[
                'flex min-w-[120px] items-center gap-3 rounded-2xl border px-4 py-3 transition-colors',
                active
                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300'
                    : complete
                        ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300'
                        : 'border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
            ].join(' ')}
        >
            <Icon size={18} />
            <span className="text-sm font-semibold">{label}</span>
        </div>
    );
};

const SectionShell = ({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) => (
    <section className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex flex-col gap-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            {description ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
            ) : null}
        </div>
        <div className="mt-5">{children}</div>
    </section>
);

const ActionButton = ({
    onClick,
    disabled,
    busy,
    children,
    tone = 'primary',
}: {
    onClick?: () => void;
    disabled?: boolean;
    busy?: boolean;
    children: React.ReactNode;
    tone?: 'primary' | 'secondary' | 'danger';
}) => {
    const toneClass = tone === 'secondary'
        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        : tone === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-orange-600 text-white hover:bg-orange-700';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${toneClass}`}
        >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {children}
        </button>
    );
};

export default function FastTrackWorkspace({ role }: { role: WorkspaceRole }) {
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [viewingDate, setViewingDate] = useState('');
    const [viewingTime, setViewingTime] = useState('');
    const [viewingNote, setViewingNote] = useState('');
    const [decisionAmount, setDecisionAmount] = useState('');
    const [decisionNote, setDecisionNote] = useState('');
    const [agreementNote, setAgreementNote] = useState('');
    const [paymentRequired, setPaymentRequired] = useState(false);
    const [amountDue, setAmountDue] = useState('');
    const [handoverNote, setHandoverNote] = useState('');
    const [requestChangeNote, setRequestChangeNote] = useState('');
    const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({});
    const [selectedFiles, setSelectedFiles] = useState<Record<string, File | null>>({});
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const { data, error: requestError } = await getFastTrackCases({ suppressErrorToast: true });
        if (data) {
            const nextCases = sortCases(data);
            setCases(nextCases);
            setSelectedCaseId((previous) => resolveSelectedCaseId(nextCases, searchParams, previous));
            setError(null);
        } else if (!silent) {
            setError(requestError || 'Unable to load fast-track cases.');
        }

        if (!silent) {
            setLoading(false);
        }
    }, [searchParams]);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useWorkflowWorkspaceRefresh({
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
        refresh: () => fetchCases(true),
    });

    const filteredCases = useMemo(() => {
        return cases.filter((item) => {
            if (filter === 'active' && item.workspaceFinalStatus !== 'active') {
                return false;
            }
            if (filter === 'completed' && item.workspaceFinalStatus !== 'completed') {
                return false;
            }
            if (filter === 'cancelled' && item.workspaceFinalStatus !== 'cancelled') {
                return false;
            }
            if (!query.trim()) {
                return true;
            }

            const normalizedQuery = query.trim().toLowerCase();
            return [
                item.propertyTitle,
                item.clientName,
                item.caseId,
                item.leadId,
                item.propertyId,
            ].some((source) => textMatches(source, normalizedQuery));
        });
    }, [cases, filter, query]);

    useEffect(() => {
        if (filteredCases.length === 0) {
            return;
        }

        if (!selectedCaseId || !filteredCases.some((item) => item.caseId === selectedCaseId)) {
            setSelectedCaseId(filteredCases[0].caseId);
        }
    }, [filteredCases, selectedCaseId]);

    useEffect(() => {
        if (!selectedCaseId) {
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
        () => filteredCases.find((item) => item.caseId === selectedCaseId) || cases.find((item) => item.caseId === selectedCaseId) || null,
        [cases, filteredCases, selectedCaseId],
    );

    const updateLocalCase = useCallback((nextCase: FastTrackCase) => {
        setCases((previous) => sortCases(previous.map((item) => (
            item.caseId === nextCase.caseId ? nextCase : item
        ))));
        setSelectedCaseId(nextCase.caseId);
    }, []);

    const runAction = useCallback(async (
        action: string,
        payload?: Record<string, unknown>,
        successMessage?: string,
    ) => {
        if (!selectedCase) {
            return;
        }

        setActiveAction(action);
        const { data, error: actionError } = await performFastTrackAction(
            selectedCase.id,
            { action, payload },
            { suppressErrorToast: true },
        );
        setActiveAction(null);

        if (actionError || !data) {
            toast.error(actionError || 'Unable to update the fast-track workspace.');
            return;
        }

        updateLocalCase(data);
        publishWorkspaceSync({
            source: 'mutation',
            tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
            reason: `Fast-track action: ${action}`,
            ids: {
                caseId: data.caseId,
                leadId: data.leadId,
                propertyId: data.propertyId,
            },
        });
        toast.success(successMessage || 'Workspace updated.');
    }, [publishWorkspaceSync, selectedCase, toast, updateLocalCase]);

    const handleUploadDocument = useCallback(async (item: FastTrackDocumentItem) => {
        if (!selectedCase) {
            return;
        }

        const file = selectedFiles[item.id];
        if (!file) {
            toast.error(`Choose a file for ${item.label.toLowerCase()} first.`);
            return;
        }

        setActiveAction(`upload-${item.id}`);
        const uploadResult = await uploadDocument(
            item.id === 'identity' ? 'identity' : 'address',
            file,
            {
                targetUserId: selectedCase.clientId,
                leadId: selectedCase.leadId,
                fastTrackCaseId: selectedCase.caseId,
                propertyId: selectedCase.propertyId,
                managerId: selectedCase.managerId,
            },
        );

        if (!uploadResult.success || !uploadResult.data) {
            setActiveAction(null);
            toast.error(uploadResult.error || 'Upload failed.');
            return;
        }

        const { data, error: actionError } = await performFastTrackAction(
            selectedCase.id,
            {
                action: 'upload_document',
                payload: {
                    document_id: item.id,
                    document_record_id: uploadResult.data.id,
                    file_name: uploadResult.data.file_name,
                    file_url: uploadResult.data.file_url,
                    note: documentNotes[item.id] || '',
                    uploaded_at: uploadResult.data.created_at,
                },
            },
            { suppressErrorToast: true },
        );
        setActiveAction(null);

        if (actionError || !data) {
            toast.error(actionError || 'Upload saved, but the workspace did not refresh.');
            return;
        }

        setSelectedFiles((previous) => ({ ...previous, [item.id]: null }));
        const input = fileInputRefs.current[item.id];
        if (input) {
            input.value = '';
        }
        updateLocalCase(data);
        publishWorkspaceSync({
            source: 'mutation',
            tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
            reason: 'Fast-track document uploaded',
            ids: {
                caseId: data.caseId,
                leadId: data.leadId,
                propertyId: data.propertyId,
            },
        });
        toast.success(`${item.label} uploaded.`);
    }, [documentNotes, publishWorkspaceSync, selectedCase, selectedFiles, toast, updateLocalCase]);

    const stageIndex = selectedCase ? STAGES.indexOf(selectedCase.stage) : -1;
    const statusChip = selectedCase ? formatStatusChip(selectedCase) : null;
    const stats = useMemo(() => ({
        active: cases.filter((item) => item.workspaceFinalStatus === 'active').length,
        completed: cases.filter((item) => item.workspaceFinalStatus === 'completed').length,
        cancelled: cases.filter((item) => item.workspaceFinalStatus === 'cancelled').length,
    }), [cases]);

    useEffect(() => {
        if (!selectedCase) {
            return;
        }

        setViewingDate(selectedCase.viewing.scheduledAt ? selectedCase.viewing.scheduledAt.slice(0, 10) : '');
        setViewingTime(selectedCase.viewing.scheduledAt ? selectedCase.viewing.scheduledAt.slice(11, 16) : '');
        setViewingNote(selectedCase.viewing.note || '');
        setDecisionAmount(selectedCase.decision.amount ? String(selectedCase.decision.amount) : '');
        setDecisionNote(selectedCase.decision.note || '');
        setAgreementNote(selectedCase.agreement.note || '');
        setAmountDue(selectedCase.agreement.amountDue ? String(selectedCase.agreement.amountDue) : '');
        setPaymentRequired(selectedCase.agreement.paymentStatus === 'requested' || selectedCase.agreement.paymentStatus === 'paid');
        setHandoverNote(selectedCase.handover.note || '');
        setRequestChangeNote(selectedCase.viewing.requestedChange || '');
        setDocumentNotes(
            Object.fromEntries(selectedCase.documents.items.map((item) => [item.id, item.note || ''])),
        );
    }, [selectedCase?.caseId]);

    const compactActivity = useMemo(
        () => (selectedCase?.activity || []).slice(0, 8),
        [selectedCase?.activity],
    );

    const renderSelectedStage = () => {
        if (!selectedCase) {
            return null;
        }

        return (
            <SectionShell
                title="Selected"
                description="This case is anchored to one property and one shared workspace."
            >
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Property</p>
                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.listingType === 'sale' ? 'Sale' : 'Rent'} · {selectedCase.propertyType}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Participants</p>
                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{selectedCase.clientName}</p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            Manager: {selectedCase.managerId ? 'Assigned' : 'Waiting for claim'}
                        </p>
                    </div>
                </div>

                {role !== 'user' ? (
                    <div className="mt-5 flex flex-wrap gap-3">
                        {!selectedCase.managerId ? (
                            <ActionButton
                                onClick={() => void runAction('claim_case', {}, 'Case claimed.')}
                                busy={activeAction === 'claim_case'}
                            >
                                Claim case
                            </ActionButton>
                        ) : null}
                        <ActionButton
                            onClick={() => void runAction('start_documents', {}, 'Documents stage started.')}
                            busy={activeAction === 'start_documents'}
                        >
                            Start documents
                        </ActionButton>
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                        The manager or admin starts the case from here. Once documents are opened, you can upload them in this same workspace.
                    </div>
                )}
            </SectionShell>
        );
    };

    const renderDocumentsStage = () => {
        if (!selectedCase) {
            return null;
        }

        return (
            <SectionShell
                title="Documents"
                description="Core files stay here until they are approved."
            >
                <div className="grid gap-4 xl:grid-cols-2">
                    {selectedCase.documents.items.map((item) => {
                        const canUpload = role === 'user';
                        const busyKey = `upload-${item.id}`;
                        return (
                            <div key={item.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                            Status: {item.status.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                    <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                        {item.status}
                                    </span>
                                </div>

                                {item.fileName ? (
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                                        Current file: {item.fileName}
                                    </p>
                                ) : null}

                                <textarea
                                    value={documentNotes[item.id] || ''}
                                    onChange={(event) => setDocumentNotes((previous) => ({
                                        ...previous,
                                        [item.id]: event.target.value,
                                    }))}
                                    placeholder={canUpload ? 'Add a short note for this file' : 'Add a short review note'}
                                    className="mt-4 h-24 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                />

                                {canUpload ? (
                                    <div className="mt-4 space-y-3">
                                        <input
                                            ref={(node) => {
                                                fileInputRefs.current[item.id] = node;
                                            }}
                                            type="file"
                                            onChange={(event) => setSelectedFiles((previous) => ({
                                                ...previous,
                                                [item.id]: event.target.files?.[0] || null,
                                            }))}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 dark:text-gray-400 dark:file:bg-orange-950/20 dark:file:text-orange-300"
                                        />
                                        <ActionButton
                                            onClick={() => void handleUploadDocument(item)}
                                            busy={activeAction === busyKey}
                                            disabled={!selectedFiles[item.id]}
                                        >
                                            <Upload size={16} />
                                            Upload {item.label}
                                        </ActionButton>
                                    </div>
                                ) : (
                                    <div className="mt-4 flex flex-wrap gap-3">
                                        <ActionButton
                                            onClick={() => void runAction(
                                                'review_document',
                                                {
                                                    document_id: item.id,
                                                    outcome: 'approved',
                                                    note: documentNotes[item.id] || '',
                                                },
                                                `${item.label} approved.`,
                                            )}
                                            busy={activeAction === 'review_document'}
                                        >
                                            Approve
                                        </ActionButton>
                                        <ActionButton
                                            tone="secondary"
                                            onClick={() => void runAction(
                                                'review_document',
                                                {
                                                    document_id: item.id,
                                                    outcome: 'reupload_needed',
                                                    note: documentNotes[item.id] || '',
                                                },
                                                `${item.label} marked for replacement.`,
                                            )}
                                            busy={activeAction === 'review_document'}
                                        >
                                            Request replacement
                                        </ActionButton>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </SectionShell>
        );
    };

    const renderViewingStage = () => {
        if (!selectedCase) {
            return null;
        }

        if (role === 'user') {
            return (
                <SectionShell
                    title="Viewing"
                    description="Confirm the plan or ask for one change right here."
                >
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {selectedCase.viewing.scheduledAt
                                    ? new Date(selectedCase.viewing.scheduledAt).toLocaleString('en-GB')
                                    : 'No slot has been set yet'}
                            </p>
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                {selectedCase.viewing.note || 'The manager will set or update the viewing here.'}
                            </p>
                        </div>
                        <textarea
                            value={requestChangeNote}
                            onChange={(event) => setRequestChangeNote(event.target.value)}
                            placeholder="Need another slot? Write one short note."
                            className="h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                        />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <ActionButton
                            onClick={() => void runAction('confirm_viewing', {}, 'Viewing confirmed.')}
                            busy={activeAction === 'confirm_viewing'}
                        >
                            Confirm viewing
                        </ActionButton>
                        <ActionButton
                            tone="secondary"
                            onClick={() => void runAction(
                                'request_viewing_change',
                                { note: requestChangeNote },
                                'Viewing change request saved.',
                            )}
                            busy={activeAction === 'request_viewing_change'}
                            disabled={!requestChangeNote.trim()}
                        >
                            Request change
                        </ActionButton>
                    </div>
                </SectionShell>
            );
        }

        return (
            <SectionShell
                title="Viewing"
                description="Schedule, reschedule, skip, or complete the viewing in this workspace."
            >
                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <input
                        type="date"
                        value={viewingDate}
                        onChange={(event) => setViewingDate(event.target.value)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                    <input
                        type="time"
                        value={viewingTime}
                        onChange={(event) => setViewingTime(event.target.value)}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                </div>
                <textarea
                    value={viewingNote}
                    onChange={(event) => setViewingNote(event.target.value)}
                    placeholder="Add one short note for the user."
                    className="mt-4 h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />

                <div className="mt-5 flex flex-wrap gap-3">
                    <ActionButton
                        onClick={() => {
                            if (!viewingDate || !viewingTime) {
                                toast.error('Set both date and time first.');
                                return;
                            }
                            void runAction(
                                selectedCase.viewing.status === 'scheduled' ? 'reschedule_viewing' : 'schedule_viewing',
                                {
                                    scheduled_at: new Date(`${viewingDate}T${viewingTime}:00`).toISOString(),
                                    note: viewingNote,
                                },
                                selectedCase.viewing.status === 'scheduled' ? 'Viewing rescheduled.' : 'Viewing scheduled.',
                            );
                        }}
                        busy={activeAction === 'schedule_viewing' || activeAction === 'reschedule_viewing'}
                    >
                        {selectedCase.viewing.status === 'scheduled' ? 'Reschedule viewing' : 'Schedule viewing'}
                    </ActionButton>
                    <ActionButton
                        tone="secondary"
                        onClick={() => void runAction(
                            'skip_viewing',
                            { note: viewingNote },
                            'Viewing skipped.',
                        )}
                        busy={activeAction === 'skip_viewing'}
                    >
                        Skip viewing
                    </ActionButton>
                    <ActionButton
                        tone="secondary"
                        onClick={() => void runAction(
                            'complete_viewing',
                            { note: viewingNote },
                            'Viewing completed.',
                        )}
                        busy={activeAction === 'complete_viewing'}
                    >
                        Complete viewing
                    </ActionButton>
                </div>
            </SectionShell>
        );
    };

    const renderDecisionStage = () => {
        if (!selectedCase) {
            return null;
        }

        const decisionLabel = selectedCase.journeyMode === 'sale' ? 'Offer outcome' : 'Application outcome';
        if (role === 'user') {
            return (
                <SectionShell
                    title={decisionLabel}
                    description="The manager or admin records the outcome here."
                >
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedCase.decision.status === 'approved'
                                ? 'Approved'
                                : selectedCase.decision.status === 'rejected'
                                    ? 'Rejected'
                                    : 'Pending'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.decision.note || 'You will see the result here as soon as it is recorded.'}
                        </p>
                    </div>
                </SectionShell>
            );
        }

        return (
            <SectionShell
                title={decisionLabel}
                description="Record the live outcome here. Approved cases move forward. Rejected cases close."
            >
                {selectedCase.journeyMode === 'sale' ? (
                    <input
                        type="number"
                        min="0"
                        value={decisionAmount}
                        onChange={(event) => setDecisionAmount(event.target.value)}
                        placeholder="Offer amount"
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                ) : null}
                <textarea
                    value={decisionNote}
                    onChange={(event) => setDecisionNote(event.target.value)}
                    placeholder="Add one short decision note."
                    className="mt-4 h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                    <ActionButton
                        onClick={() => void runAction(
                            'record_decision',
                            {
                                outcome: 'approved',
                                note: decisionNote,
                                amount: decisionAmount ? Number(decisionAmount) : undefined,
                                currency: 'GBP',
                            },
                            `${decisionLabel} approved.`,
                        )}
                        busy={activeAction === 'record_decision'}
                    >
                        Approve
                    </ActionButton>
                    <ActionButton
                        tone="danger"
                        onClick={() => void runAction(
                            'record_decision',
                            {
                                outcome: 'rejected',
                                note: decisionNote,
                            },
                            `${decisionLabel} rejected.`,
                        )}
                        busy={activeAction === 'record_decision'}
                    >
                        Reject
                    </ActionButton>
                </div>
            </SectionShell>
        );
    };

    const renderAgreementStage = () => {
        if (!selectedCase) {
            return null;
        }

        if (role === 'user') {
            return (
                <SectionShell
                    title="Agreement"
                    description="Accept the agreement here. If payment is requested, the manager will confirm it here too."
                >
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedCase.agreement.status === 'accepted'
                                ? 'Accepted'
                                : selectedCase.agreement.status === 'sent'
                                    ? 'Ready for your confirmation'
                                    : 'Waiting to be sent'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.agreement.note || 'The agreement summary stays in this workspace.'}
                        </p>
                        {selectedCase.agreement.paymentStatus === 'requested' || selectedCase.agreement.paymentStatus === 'paid' ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Payment: {selectedCase.agreement.paymentStatus.replace(/_/g, ' ')}
                                {selectedCase.agreement.amountDue ? ` · £${selectedCase.agreement.amountDue}` : ''}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <ActionButton
                            onClick={() => void runAction('confirm_agreement', {}, 'Agreement accepted.')}
                            busy={activeAction === 'confirm_agreement'}
                            disabled={selectedCase.agreement.status === 'accepted'}
                        >
                            Accept agreement
                        </ActionButton>
                    </div>
                </SectionShell>
            );
        }

        return (
            <SectionShell
                title="Agreement"
                description="Send the agreement and keep payment tracking in this workspace."
            >
                <textarea
                    value={agreementNote}
                    onChange={(event) => setAgreementNote(event.target.value)}
                    placeholder="Agreement summary"
                    className="h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />

                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                        <input
                            type="checkbox"
                            checked={paymentRequired}
                            onChange={(event) => setPaymentRequired(event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                        />
                        Payment required
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={amountDue}
                        onChange={(event) => setAmountDue(event.target.value)}
                        placeholder="Amount due"
                        disabled={!paymentRequired}
                        className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                    <ActionButton
                        onClick={() => void runAction(
                            'publish_agreement',
                            {
                                note: agreementNote,
                                payment_required: paymentRequired,
                                amount_due: amountDue ? Number(amountDue) : undefined,
                            },
                            'Agreement published.',
                        )}
                        busy={activeAction === 'publish_agreement'}
                    >
                        Publish agreement
                    </ActionButton>
                    {paymentRequired ? (
                        <ActionButton
                            tone="secondary"
                            onClick={() => void runAction(
                                'mark_payment_received',
                                {},
                                'Payment confirmed.',
                            )}
                            busy={activeAction === 'mark_payment_received'}
                        >
                            Mark payment received
                        </ActionButton>
                    ) : null}
                </div>
            </SectionShell>
        );
    };

    const renderHandoverStage = () => {
        if (!selectedCase) {
            return null;
        }

        if (role === 'user') {
            return (
                <SectionShell
                    title="Handover"
                    description="Confirm that the final handover is complete."
                >
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedCase.handover.status === 'completed'
                                ? 'Completed'
                                : selectedCase.handover.status === 'ready'
                                    ? 'Ready for your confirmation'
                                    : 'Waiting for the team'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.handover.note || 'The final handover stays in this workspace.'}
                        </p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <ActionButton
                            onClick={() => void runAction('confirm_handover', {}, 'Handover confirmed.')}
                            busy={activeAction === 'confirm_handover'}
                            disabled={selectedCase.handover.confirmedByUser}
                        >
                            Confirm receipt
                        </ActionButton>
                    </div>
                </SectionShell>
            );
        }

        return (
            <SectionShell
                title="Handover"
                description="Mark the case ready, then complete it from this workspace."
            >
                <textarea
                    value={handoverNote}
                    onChange={(event) => setHandoverNote(event.target.value)}
                    placeholder="Final note"
                    className="h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />
                <div className="mt-5 flex flex-wrap gap-3">
                    <ActionButton
                        onClick={() => void runAction(
                            'mark_handover_ready',
                            { note: handoverNote },
                            'Handover marked ready.',
                        )}
                        busy={activeAction === 'mark_handover_ready'}
                    >
                        Mark ready
                    </ActionButton>
                    <ActionButton
                        tone="secondary"
                        onClick={() => void runAction(
                            'complete_handover',
                            { note: handoverNote },
                            'Fast-track completed.',
                        )}
                        busy={activeAction === 'complete_handover'}
                    >
                        Complete handover
                    </ActionButton>
                </div>
            </SectionShell>
        );
    };

    const renderActiveStage = () => {
        if (!selectedCase) {
            return null;
        }

        switch (selectedCase.stage) {
            case 'documents':
                return renderDocumentsStage();
            case 'viewing':
                return renderViewingStage();
            case 'decision':
                return renderDecisionStage();
            case 'agreement':
                return renderAgreementStage();
            case 'handover':
                return renderHandoverStage();
            default:
                return renderSelectedStage();
        }
    };

    return (
        <div className="space-y-6 pb-16">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-orange-600 p-3 text-white shadow-lg shadow-orange-500/20">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fast-track workspace</h1>
                            <RoleBadge role={role} />
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            One workspace from property selection to handover. No extra pages.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Active</p>
                        <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Completed</p>
                        <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Cancelled</p>
                        <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stats.cancelled}</p>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                <aside className="space-y-4">
                    <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="relative">
                            <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search property or client"
                                className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                            />
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                            {FILTERS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setFilter(item.value)}
                                    className={[
                                        'rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                                        filter === item.value
                                            ? 'bg-orange-600 text-white'
                                            : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                                    ].join(' ')}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {loading && cases.length === 0 ? (
                            <div className="flex items-center justify-center rounded-[28px] border border-gray-100 bg-white px-6 py-16 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
                                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                                Loading cases
                            </div>
                        ) : filteredCases.length === 0 ? (
                            <div className="rounded-[28px] border border-dashed border-gray-300 bg-white px-6 py-16 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                                No fast-track cases match this filter.
                            </div>
                        ) : filteredCases.map((item) => {
                            const chip = formatStatusChip(item);
                            return (
                                <button
                                    key={item.caseId}
                                    type="button"
                                    onClick={() => setSelectedCaseId(item.caseId)}
                                    className={[
                                        'w-full rounded-[28px] border px-5 py-4 text-left shadow-sm transition-colors',
                                        selectedCaseId === item.caseId
                                            ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
                                            : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900',
                                    ].join(' ')}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.propertyTitle}</p>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{item.clientName}</p>
                                        </div>
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${chip.tone}`}>
                                            {chip.label}
                                        </span>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span>{formatStageLabel(item.stage, item.journeyMode)}</span>
                                        <span>{formatDeadline(item.hoursRemaining)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </aside>

                <div className="space-y-6">
                    {selectedCase ? (
                        <>
                            <section className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-3">
                                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</h2>
                                            {statusChip ? (
                                                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusChip.tone}`}>
                                                    {statusChip.label}
                                                </span>
                                            ) : null}
                                        </div>
                                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                            {selectedCase.clientName} · {selectedCase.listingType === 'sale' ? 'Sale' : 'Rent'} · Case {selectedCase.caseId}
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                <Clock3 size={14} />
                                                24h
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatDeadline(selectedCase.hoursRemaining)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Current stage</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatStageLabel(selectedCase.stage, selectedCase.journeyMode)}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Next</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {selectedCase.nextAction}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
                                    {selectedCase.statusReason}
                                </p>

                                <div className="mt-6 flex gap-3 overflow-x-auto pb-1">
                                    {STAGES.map((stage, index) => (
                                        <StagePill
                                            key={stage}
                                            stage={stage}
                                            label={formatStageLabel(stage, selectedCase.journeyMode)}
                                            active={stage === selectedCase.stage}
                                            complete={index < stageIndex || selectedCase.workspaceFinalStatus === 'completed'}
                                        />
                                    ))}
                                </div>
                            </section>

                            {renderActiveStage()}

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                                <SectionShell
                                    title="Core files"
                                    description={selectedCase.documentPhaseReason}
                                >
                                    <div className="space-y-3">
                                        {selectedCase.documents.items.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        {item.fileName || 'No file attached yet'}
                                                    </p>
                                                </div>
                                                <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-300">
                                                    {item.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </SectionShell>

                                <SectionShell
                                    title="Activity"
                                    description="Recent case changes stay visible here."
                                >
                                    <div className="space-y-3">
                                        {compactActivity.length === 0 ? (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
                                        ) : compactActivity.map((entry: FastTrackActivityEntry) => (
                                            <div key={entry.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.message}</p>
                                                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                        {entry.actorRole}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(entry.createdAt).toLocaleString('en-GB')}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </SectionShell>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-[32px] border border-dashed border-gray-300 bg-white px-6 py-20 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                            No fast-track case is selected.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
