'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowLeft,
    ArrowUpRight,
    CalendarDays,
    CircleDot,
    Clock3,
    Download,
    Eye,
    FileCheck2,
    FileImage,
    FileText,
    Home,
    Loader2,
    MessageSquareText,
    Search,
    SendHorizontal,
    ShieldCheck,
    Sparkles,
    Upload,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkflowWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import {
    buildFastTrackThreadRecipientLabel,
    describeFastTrackWorkspaceFocus,
    describeFastTrackWorkspaceStatus,
    resolveFastTrackSelectionCaseId,
    resolveFastTrackThreadRecipientId,
} from '@/lib/fastTrackWorkspace';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import { getDocumentAccessBlob, getDocumentAccessUrl } from '@/services/documentAccessService';
import {
    FastTrackActivityEntry,
    FastTrackCase,
    FastTrackDocumentItem,
    FastTrackStage,
    getFastTrackCases,
    performFastTrackAction,
} from '@/services/fastTrackService';
import { uploadDocument } from '@/services/leadsService';
import {
    Conversation,
    Message,
    getMessages,
    markAsRead,
    sendMessage,
    upsertDirectConversation,
} from '@/services/messagesService';
import PaginationBar from '@/components/ui/PaginationBar';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';

type WorkspaceRole = 'user' | 'manager' | 'admin';
type FilterMode = 'all' | 'active' | 'completed' | 'cancelled';
const FAST_TRACK_CASES_PAGE_SIZE = 12;
const WORKSPACE_HOME_PATH: Record<WorkspaceRole, string> = {
    user: '/user/dashboard',
    manager: '/manager/dashboard',
    admin: '/admin/dashboard',
};

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

const textMatches = (source: string | undefined, query: string) =>
    String(source || '').toLowerCase().includes(query.toLowerCase());

const formatDateTime = (value?: string) => {
    if (!value) {
        return 'Not set';
    }
    return new Date(value).toLocaleString('en-GB');
};

const formatDocumentStatus = (status: FastTrackDocumentItem['status']) => {
    switch (status) {
        case 'approved':
            return 'Approved';
        case 'reupload_needed':
            return 'Replacement needed';
        case 'uploaded':
            return 'Waiting for review';
        default:
            return 'Waiting for upload';
    }
};

const documentStatusTone = (status: FastTrackDocumentItem['status']) => {
    switch (status) {
        case 'approved':
            return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/30 dark:text-green-300';
        case 'reupload_needed':
            return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300';
        case 'uploaded':
            return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300';
        default:
            return 'border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300';
    }
};

const detectDocumentPreviewKind = (item: FastTrackDocumentItem) => {
    const mimeType = String(item.mimeType || '').toLowerCase();
    const fileName = String(item.fileName || '').toLowerCase();

    if (mimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(fileName)) {
        return 'image' as const;
    }
    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
        return 'pdf' as const;
    }
    return 'file' as const;
};

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
    ariaLabel,
    title,
    className = '',
}: {
    onClick?: () => void;
    disabled?: boolean;
    busy?: boolean;
    children: React.ReactNode;
    tone?: 'primary' | 'secondary' | 'danger';
    ariaLabel?: string;
    title?: string;
    className?: string;
}) => {
    const toneClass = tone === 'secondary'
        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        : tone === 'danger'
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-orange-700 text-white hover:bg-orange-800';

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || busy}
            aria-label={ariaLabel}
            title={title}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 ${toneClass} ${className}`.trim()}
        >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {children}
        </button>
    );
};

export default function FastTrackWorkspace({ role }: { role: WorkspaceRole }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<FilterMode>('all');
    const [currentCasePage, setCurrentCasePage] = useState(1);
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
    const [previewItemId, setPreviewItemId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewBusyItemId, setPreviewBusyItemId] = useState<string | null>(null);
    const [threadConversation, setThreadConversation] = useState<Conversation | null>(null);
    const [threadMessages, setThreadMessages] = useState<Message[]>([]);
    const [threadDraft, setThreadDraft] = useState('');
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadSending, setThreadSending] = useState(false);
    const [threadError, setThreadError] = useState<string | null>(null);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const previewObjectUrlRef = useRef<string | null>(null);
    const previewSectionRef = useRef<HTMLDivElement | null>(null);
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const releasePreviewObjectUrl = useCallback(() => {
        if (previewObjectUrlRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        previewObjectUrlRef.current = null;
    }, []);

    const revealPreviewSection = useCallback(() => {
        previewSectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
            inline: 'nearest',
        });
    }, []);

    const fetchCases = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
            setError(null);
        }

        const { data, error: requestError } = await getFastTrackCases({ suppressErrorToast: true });
        if (data) {
            const nextCases = sortCases(data);
            setCases(nextCases);
            setSelectedCaseId((previous) => resolveFastTrackSelectionCaseId(nextCases, searchParams, previous));
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
        setCurrentCasePage(1);
    }, [filter, query]);

    useEffect(() => {
        if (filteredCases.length === 0) {
            return;
        }

        if (!selectedCaseId || !filteredCases.some((item) => item.caseId === selectedCaseId)) {
            setSelectedCaseId(filteredCases[0].caseId);
        }
    }, [filteredCases, selectedCaseId]);

    const totalCasePages = useMemo(
        () => Math.max(1, Math.ceil(filteredCases.length / FAST_TRACK_CASES_PAGE_SIZE)),
        [filteredCases.length],
    );

    useEffect(() => {
        if (currentCasePage > totalCasePages) {
            setCurrentCasePage(totalCasePages);
        }
    }, [currentCasePage, totalCasePages]);

    useEffect(() => {
        if (!selectedCaseId) {
            return;
        }

        const selectedIndex = filteredCases.findIndex((item) => item.caseId === selectedCaseId);
        if (selectedIndex === -1) {
            return;
        }

        const targetPage = Math.floor(selectedIndex / FAST_TRACK_CASES_PAGE_SIZE) + 1;
        if (targetPage !== currentCasePage) {
            setCurrentCasePage(targetPage);
        }
    }, [filteredCases, selectedCaseId]);

    const paginatedCases = useMemo(() => {
        const pageStart = (currentCasePage - 1) * FAST_TRACK_CASES_PAGE_SIZE;
        return filteredCases.slice(pageStart, pageStart + FAST_TRACK_CASES_PAGE_SIZE);
    }, [currentCasePage, filteredCases]);

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

    const workspaceFocus = useMemo(
        () => (selectedCase ? describeFastTrackWorkspaceFocus(selectedCase, role) : ''),
        [role, selectedCase],
    );

    const workspaceStatus = useMemo(
        () => (selectedCase ? describeFastTrackWorkspaceStatus(selectedCase, role) : ''),
        [role, selectedCase],
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
                    mime_type: uploadResult.data.mime_type,
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
    const parsedAgreementAmount = amountDue.trim() ? Number(amountDue) : 0;
    const hasValidAgreementPaymentAmount = Number.isFinite(parsedAgreementAmount) && parsedAgreementAmount > 0;
    const publishAgreementNeedsAmount = paymentRequired && !hasValidAgreementPaymentAmount;
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
            Object.fromEntries(selectedCase.documents.items.map((item) => [
                item.id,
                role === 'user' ? (item.uploadNote || '') : (item.reviewNote || ''),
            ])),
        );
        setPreviewItemId((previous) => {
            if (previous && selectedCase.documents.items.some((item) => item.id === previous)) {
                return previous;
            }
            const uploadedItem = selectedCase.documents.items.find((item) => item.documentRecordId || item.fileUrl);
            return uploadedItem?.id || selectedCase.documents.items[0]?.id || null;
        });
    }, [role, selectedCase?.caseId]);

    const compactActivity = useMemo(
        () => (selectedCase?.activity || []).slice(0, 8),
        [selectedCase?.activity],
    );

    const previewItem = useMemo(
        () => selectedCase?.documents.items.find((item) => item.id === previewItemId) || null,
        [previewItemId, selectedCase?.documents.items],
    );

    const threadRecipientId = useMemo(
        () => resolveFastTrackThreadRecipientId(role, user?.id, selectedCase),
        [role, selectedCase, user?.id],
    );

    const threadRecipientLabel = useMemo(
        () => buildFastTrackThreadRecipientLabel(role, selectedCase),
        [role, selectedCase],
    );

    const handlePublishAgreement = useCallback(() => {
        if (publishAgreementNeedsAmount) {
            toast.error('Enter a payment amount or turn off payment required.');
            return;
        }

        void runAction(
            'publish_agreement',
            {
                note: agreementNote,
                payment_required: paymentRequired && hasValidAgreementPaymentAmount,
                amount_due: paymentRequired && hasValidAgreementPaymentAmount ? parsedAgreementAmount : undefined,
            },
            'Agreement published.',
        );
    }, [
        agreementNote,
        hasValidAgreementPaymentAmount,
        parsedAgreementAmount,
        paymentRequired,
        publishAgreementNeedsAmount,
        runAction,
        toast,
    ]);

    const ensureDocumentPreview = useCallback(async (
        item: FastTrackDocumentItem,
        options?: {
            openInNewTab?: boolean;
            revealInViewport?: boolean;
        },
    ) => {
        const openInNewTab = options?.openInNewTab === true;
        const revealInViewport = options?.revealInViewport === true;
        if (!item.documentRecordId && !item.fileUrl) {
            setPreviewError('This file is not attached yet.');
            setPreviewUrl(null);
            if (revealInViewport) {
                revealPreviewSection();
            }
            return null;
        }

        setPreviewBusyItemId(item.id);
        setPreviewItemId(item.id);
        setPreviewError(null);

        const previewKind = detectDocumentPreviewKind(item);
        let nextUrl = item.fileUrl || null;
        let nextAccessUrl = item.fileUrl || null;
        if (item.documentRecordId) {
            if (!openInNewTab && (previewKind === 'image' || previewKind === 'pdf')) {
                const access = await getDocumentAccessBlob(item.documentRecordId);
                if (access.error || !access.url || !access.blob) {
                    setPreviewBusyItemId(null);
                    setPreviewUrl(null);
                    setPreviewError(access.error || 'Preview is unavailable for this document.');
                    if (revealInViewport) {
                        revealPreviewSection();
                    }
                    return null;
                }
                releasePreviewObjectUrl();
                nextUrl = URL.createObjectURL(access.blob);
                previewObjectUrlRef.current = nextUrl;
            } else {
                const access = await getDocumentAccessUrl(item.documentRecordId);
                if (access.error || !access.url) {
                    setPreviewBusyItemId(null);
                    setPreviewUrl(null);
                    setPreviewError(access.error || 'Preview is unavailable for this document.');
                    if (revealInViewport) {
                        revealPreviewSection();
                    }
                    return null;
                }
                releasePreviewObjectUrl();
                nextUrl = access.url;
                nextAccessUrl = access.url;
            }
        } else {
            releasePreviewObjectUrl();
        }

        if (!nextUrl) {
            setPreviewBusyItemId(null);
            setPreviewUrl(null);
            setPreviewError('Preview is unavailable for this document.');
            if (revealInViewport) {
                revealPreviewSection();
            }
            return null;
        }

        setPreviewBusyItemId(null);
        setPreviewUrl(nextUrl);
        setPreviewError(null);
        if (revealInViewport) {
            revealPreviewSection();
        }

        if (openInNewTab && nextAccessUrl) {
            window.open(nextAccessUrl, '_blank', 'noopener,noreferrer');
        }
        return nextUrl;
    }, [releasePreviewObjectUrl, revealPreviewSection]);

    const handleRailPreview = useCallback(async (item: FastTrackDocumentItem) => {
        await ensureDocumentPreview(item, { revealInViewport: true });
    }, [ensureDocumentPreview]);

    const handleRailDownload = useCallback(async (item: FastTrackDocumentItem) => {
        await ensureDocumentPreview(item, { openInNewTab: true });
    }, [ensureDocumentPreview]);

    useEffect(() => {
        return () => {
            releasePreviewObjectUrl();
        };
    }, [releasePreviewObjectUrl]);

    useEffect(() => {
        if (!previewItem) {
            releasePreviewObjectUrl();
            setPreviewUrl(null);
            setPreviewError(null);
            return;
        }
        if (!previewItem.documentRecordId && !previewItem.fileUrl) {
            releasePreviewObjectUrl();
            setPreviewUrl(null);
            setPreviewError('Choose a document to preview once a file has been attached.');
            return;
        }
        void ensureDocumentPreview(previewItem);
    }, [ensureDocumentPreview, previewItem?.documentRecordId, previewItem?.fileUrl, previewItem?.mimeType, previewItemId, releasePreviewObjectUrl]);

    useEffect(() => {
        let cancelled = false;

        const loadThread = async () => {
            if (!selectedCase || !user) {
                setThreadConversation(null);
                setThreadMessages([]);
                setThreadError(null);
                return;
            }

            if (!threadRecipientId) {
                setThreadConversation(null);
                setThreadMessages([]);
                setThreadError(
                    role === 'user'
                        ? 'A manager or admin needs to claim this case before chat opens.'
                        : 'This case does not have a client attached yet.',
                );
                return;
            }

            setThreadLoading(true);
            setThreadError(null);

            const context = {
                fastTrackCaseId: selectedCase.caseId,
                propertyId: selectedCase.propertyId,
                propertyTitle: selectedCase.propertyTitle,
                listingType: selectedCase.listingType,
                senderName: user.name,
                senderEmail: user.email,
                senderPhone: user.phone,
                recipientName: role === 'user' ? 'Case manager' : selectedCase.clientName,
            };

            try {
                const conversation = await upsertDirectConversation(threadRecipientId, context);
                const messages = await getMessages(conversation.id, 1, 50);
                await markAsRead(conversation.id);
                if (cancelled) {
                    return;
                }
                setThreadConversation(conversation);
                setThreadMessages([...messages].sort((left, right) => (
                    new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
                )));
            } catch (error: any) {
                if (cancelled) {
                    return;
                }
                setThreadConversation(null);
                setThreadMessages([]);
                setThreadError(error?.message || 'Unable to load the case chat.');
            } finally {
                if (!cancelled) {
                    setThreadLoading(false);
                }
            }
        };

        void loadThread();

        return () => {
            cancelled = true;
        };
    }, [role, selectedCase?.caseId, selectedCase?.clientName, threadRecipientId, user]);

    const handleSendThreadMessage = useCallback(async () => {
        if (!selectedCase || !user || !threadRecipientId || !threadDraft.trim()) {
            return;
        }

        setThreadSending(true);
        setThreadError(null);
        try {
            const conversation = threadConversation || await upsertDirectConversation(threadRecipientId, {
                fastTrackCaseId: selectedCase.caseId,
                propertyId: selectedCase.propertyId,
                propertyTitle: selectedCase.propertyTitle,
                listingType: selectedCase.listingType,
                senderName: user.name,
                senderEmail: user.email,
                senderPhone: user.phone,
                recipientName: role === 'user' ? 'Case manager' : selectedCase.clientName,
            });
            const nextMessage = await sendMessage({
                conversationId: conversation.id,
                content: threadDraft.trim(),
            });
            setThreadConversation(conversation);
            setThreadMessages((previous) => [...previous, nextMessage]);
            setThreadDraft('');
        } catch (error: any) {
            setThreadError(error?.message || 'Unable to send this case message.');
        } finally {
            setThreadSending(false);
        }
    }, [role, selectedCase, threadConversation, threadDraft, threadRecipientId, user]);

    const renderDocumentPreview = () => {
        if (!previewItem) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pick a file from the workspace to preview it here.
                </p>
            );
        }

        const previewKind = detectDocumentPreviewKind(previewItem);

        return (
            <div className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{previewItem.label}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {previewItem.fileName || 'No file attached yet'}
                            </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${documentStatusTone(previewItem.status)}`}>
                            {formatDocumentStatus(previewItem.status)}
                        </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <ActionButton
                            tone="secondary"
                            onClick={() => void ensureDocumentPreview(previewItem, { revealInViewport: true })}
                            busy={previewBusyItemId === previewItem.id}
                            disabled={!previewItem.documentRecordId && !previewItem.fileUrl}
                        >
                            <Eye size={16} />
                            Preview
                        </ActionButton>
                        <ActionButton
                            tone="secondary"
                            onClick={() => void ensureDocumentPreview(previewItem, { openInNewTab: true })}
                            busy={previewBusyItemId === previewItem.id}
                            disabled={!previewItem.documentRecordId && !previewItem.fileUrl}
                        >
                            <Download size={16} />
                            Download
                        </ActionButton>
                    </div>
                </div>

                {previewError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {previewError}
                    </div>
                ) : null}

                {!previewUrl ? (
                    <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-4 py-10 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                        Upload a file to preview it here.
                    </div>
                ) : previewKind === 'image' ? (
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <img
                            src={previewUrl}
                            alt={previewItem.fileName || previewItem.label}
                            className="max-h-[420px] w-full object-contain"
                        />
                    </div>
                ) : previewKind === 'pdf' ? (
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <iframe
                            title={previewItem.fileName || previewItem.label}
                            src={previewUrl}
                            className="h-[420px] w-full"
                        />
                    </div>
                ) : (
                    <div className="rounded-3xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-center gap-3">
                            <FileImage size={18} className="text-orange-500" />
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Preview not supported inline</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Open or download this file directly.
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                                Type: {previewItem.mimeType || 'Unknown'}
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                                Uploaded: {formatDateTime(previewItem.uploadedAt)}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderCaseThread = () => {
        if (!selectedCase) {
            return null;
        }

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{threadRecipientLabel}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            Messages stay attached to this case only.
                        </p>
                    </div>
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                        Case chat
                    </span>
                </div>

                {threadError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {threadError}
                    </div>
                ) : null}

                <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" tabIndex={0} aria-label="Case chat transcript">
                    {threadLoading ? (
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading case messages
                        </div>
                    ) : threadMessages.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            No case messages yet. Keep every update here instead of leaving the workspace.
                        </p>
                    ) : threadMessages.map((message) => {
                        const mine = message.sender_id === user?.id;
                        return (
                            <div
                                key={message.id}
                                className={[
                                    'rounded-3xl px-4 py-3',
                                    mine
                                        ? 'bg-orange-700 text-white'
                                        : 'border border-gray-100 bg-white text-gray-700 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200',
                                ].join(' ')}
                            >
                                <p className="text-sm leading-6">{message.content}</p>
                                <p className={`mt-2 text-[11px] ${mine ? 'text-orange-50' : 'text-gray-500 dark:text-gray-300'}`}>
                                    {formatDateTime(message.created_at)}
                                </p>
                            </div>
                        );
                    })}
                </div>

                <div className="rounded-3xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <textarea
                        value={threadDraft}
                        onChange={(event) => setThreadDraft(event.target.value)}
                        placeholder="Write one clear update for this case."
                        className="h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />
                    <div className="mt-4 flex justify-end">
                        <ActionButton
                            onClick={() => void handleSendThreadMessage()}
                            busy={threadSending}
                            disabled={!threadDraft.trim() || !threadRecipientId}
                        >
                            <SendHorizontal size={16} />
                            Send update
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    };

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
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Property</p>
                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{selectedCase.propertyTitle}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {selectedCase.listingType === 'sale' ? 'Sale' : 'Rent'} / {selectedCase.propertyType}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Participants</p>
                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{selectedCase.clientName}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
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
                description="Upload, review, preview, and replace the core files without leaving this page."
            >
                <div className="mb-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl border border-orange-100 bg-orange-50 px-4 py-4 dark:border-orange-900/40 dark:bg-orange-950/30">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Required</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{selectedCase.documents.items.length}</p>
                    </div>
                    <div className="rounded-3xl border border-gray-100 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Uploaded</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedCase.documents.items.filter((item) => item.status === 'uploaded' || item.status === 'approved').length}
                        </p>
                    </div>
                    <div className="rounded-3xl border border-green-100 bg-green-50 px-4 py-4 dark:border-green-900/40 dark:bg-green-950/30">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-500">Approved</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {selectedCase.documents.items.filter((item) => item.status === 'approved').length}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                    {selectedCase.documents.items.map((item) => {
                        const canUpload = role === 'user';
                        const busyKey = `upload-${item.id}`;
                        const canPreview = Boolean(item.documentRecordId || item.fileUrl);
                        return (
                            <div
                                key={item.id}
                                data-fast-track-document-card={item.id}
                                className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-base font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                            {formatDocumentStatus(item.status)}
                                        </p>
                                    </div>
                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${documentStatusTone(item.status)}`}>
                                        {formatDocumentStatus(item.status)}
                                    </span>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Current file</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            {item.fileName || 'No file attached yet'}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Last upload</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            {formatDateTime(item.uploadedAt)}
                                        </p>
                                    </div>
                                </div>

                                {(item.uploadNote || item.reviewNote) ? (
                                    <div className="mt-4 grid gap-3">
                                        {item.uploadNote ? (
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Upload note</p>
                                                <p className="mt-2 text-sm text-gray-700 dark:text-gray-200">{item.uploadNote}</p>
                                            </div>
                                        ) : null}
                                        {item.reviewNote ? (
                                            <div className={[
                                                'rounded-2xl border px-4 py-3',
                                                item.status === 'reupload_needed'
                                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
                                                    : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
                                            ].join(' ')}>
                                                <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-80">Reviewer note</p>
                                                <p className="mt-2 text-sm">{item.reviewNote}</p>
                                                {item.reviewedAt ? (
                                                    <p className="mt-2 text-xs opacity-80">
                                                        Reviewed {formatDateTime(item.reviewedAt)}
                                                    </p>
                                                ) : null}
                                            </div>
                                        ) : null}
                                    </div>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-3">
                                    <ActionButton
                                        tone="secondary"
                                        onClick={() => void ensureDocumentPreview(item, { revealInViewport: true })}
                                        busy={previewBusyItemId === item.id}
                                        disabled={!canPreview}
                                        ariaLabel={`Preview ${item.label}`}
                                    >
                                        <Eye size={16} />
                                        Preview
                                    </ActionButton>
                                    <ActionButton
                                        tone="secondary"
                                        onClick={() => void ensureDocumentPreview(item, { openInNewTab: true })}
                                        busy={previewBusyItemId === item.id}
                                        disabled={!canPreview}
                                        ariaLabel={`Open ${item.label}`}
                                    >
                                        <ArrowUpRight size={16} />
                                        Open file
                                    </ActionButton>
                                </div>

                                <textarea
                                    value={documentNotes[item.id] || ''}
                                    onChange={(event) => setDocumentNotes((previous) => ({
                                        ...previous,
                                        [item.id]: event.target.value,
                                    }))}
                                    aria-label={`Note for ${item.label}`}
                                    placeholder={canUpload ? 'Add one short note with this upload' : 'Add one short review note'}
                                    className="mt-4 h-24 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none ring-0 placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                />

                                {canUpload ? (
                                    <div className="mt-4 space-y-3">
                                        <input
                                            ref={(node) => {
                                                fileInputRefs.current[item.id] = node;
                                            }}
                                            type="file"
                                            aria-label={`Upload ${item.label}`}
                                            onChange={(event) => setSelectedFiles((previous) => ({
                                                ...previous,
                                                [item.id]: event.target.files?.[0] || null,
                                            }))}
                                            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-orange-100 file:px-4 file:py-2 file:font-semibold file:text-orange-700 dark:text-gray-400 dark:file:bg-orange-950/20 dark:file:text-orange-300"
                                        />
                                        {item.status === 'reupload_needed' ? (
                                            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                                                Upload a replacement here. The previous note stays visible until the new file is reviewed.
                                            </p>
                                        ) : null}
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
                                            disabled={!canPreview}
                                            ariaLabel={`Approve ${item.label}`}
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
                                            disabled={!canPreview}
                                            ariaLabel={`Request replacement for ${item.label}`}
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

                    <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Latest response</p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedCase.viewing.requestedChange
                                ? 'Change request sent'
                                : selectedCase.viewing.confirmedByUser
                                    ? 'Viewing confirmed'
                                    : 'No response sent yet'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.viewing.requestedChange || 'If you need a different slot, send one short note here and it will stay on this page.'}
                        </p>
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
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Current slot</p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedCase.viewing.scheduledAt
                                ? new Date(selectedCase.viewing.scheduledAt).toLocaleString('en-GB')
                                : 'No slot set yet'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.viewing.note || 'Add the viewing details below.'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">User response</p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedCase.viewing.requestedChange
                                ? 'Change requested'
                                : selectedCase.viewing.confirmedByUser
                                    ? 'Confirmed by user'
                                    : 'Waiting for user response'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.viewing.requestedChange || 'No change request has been sent back yet.'}
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Last change</p>
                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {formatDateTime(selectedCase.viewing.requestedChangeAt || selectedCase.viewing.scheduledAt)}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.viewing.requestedChangeAt
                                ? 'The latest user request is visible here before you reschedule.'
                                : 'Rescheduling will refresh this timeline on the same page.'}
                        </p>
                    </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                    <DateField
                        value={viewingDate}
                        onChange={setViewingDate}
                        ariaLabel="Viewing date"
                    />
                    <TimeField
                        value={viewingTime}
                        onChange={setViewingTime}
                        ariaLabel="Viewing time"
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
                                {selectedCase.agreement.amountDue ? ` / GBP ${selectedCase.agreement.amountDue}` : ''}
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
                        onClick={handlePublishAgreement}
                        busy={activeAction === 'publish_agreement'}
                        disabled={publishAgreementNeedsAmount}
                        title={publishAgreementNeedsAmount ? 'Enter a payment amount or turn off payment required.' : undefined}
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
                            disabled={!hasValidAgreementPaymentAmount || selectedCase.agreement.paymentStatus === 'paid'}
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
                    <button
                        type="button"
                        onClick={() => navigate(WORKSPACE_HOME_PATH[role])}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
                        aria-label="Back to dashboard"
                        title="Back to dashboard"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="rounded-2xl bg-orange-700 p-3 text-white shadow-lg shadow-orange-500/20">
                        <Sparkles size={22} />
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fast-track workspace</h1>
                            <RoleBadge role={role} />
                        </div>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            One workspace from property selection to handover. No extra pages.
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Active</p>
                        <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Completed</p>
                        <p className="mt-2 text-xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Cancelled</p>
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
                <aside className="space-y-4" aria-label="Fast-track case list">
                    <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Cases</p>
                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                    {filteredCases.length} matching {filteredCases.length === 1 ? 'case' : 'cases'}
                                </p>
                            </div>
                            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                {currentCasePage}/{totalCasePages}
                            </span>
                        </div>

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
                                            ? 'bg-orange-700 text-white'
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
                        ) : paginatedCases.map((item) => {
                            const chip = formatStatusChip(item);
                            return (
                                <button
                                    key={item.caseId}
                                    type="button"
                                    data-fast-track-case-card={item.caseId}
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
                                    <div className="mt-4 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                                        <span>{formatStageLabel(item.stage, item.journeyMode)}</span>
                                        <span>{formatDeadline(item.hoursRemaining)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {filteredCases.length > FAST_TRACK_CASES_PAGE_SIZE ? (
                        <PaginationBar
                            currentPage={currentCasePage}
                            totalPages={totalCasePages}
                            onPageChange={setCurrentCasePage}
                            totalItems={filteredCases.length}
                            pageSize={FAST_TRACK_CASES_PAGE_SIZE}
                            currentItemCount={paginatedCases.length}
                            itemLabel="cases"
                            stacked
                        />
                    ) : null}
                </aside>

                <div className="space-y-6">
                    {selectedCase ? (
                        <>
                            <section className="overflow-hidden rounded-[36px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,237,213,0.95),_rgba(255,255,255,1)_55%)] p-6 shadow-sm dark:border-orange-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,45,18,0.38),_rgba(3,7,18,1)_58%)]">
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
                                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                            {selectedCase.clientName} / {selectedCase.listingType === 'sale' ? 'Sale' : 'Rent'} / {selectedCase.propertyType} / Case {selectedCase.caseId}
                                        </p>
                                        <p className="mt-4 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
                                            Keep everything here: files, viewing changes, decisions, agreement, payment confirmation, handover, and case chat.
                                        </p>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-3">
                                        <div className="rounded-3xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">
                                                <Clock3 size={14} />
                                                24h
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatDeadline(selectedCase.hoursRemaining)}
                                            </p>
                                        </div>
                                        <div className="rounded-3xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Current stage</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {formatStageLabel(selectedCase.stage, selectedCase.journeyMode)}
                                            </p>
                                        </div>
                                        <div className="rounded-3xl border border-white/70 bg-white/80 px-4 py-3 backdrop-blur dark:border-white/10 dark:bg-white/5">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Focus</p>
                                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                                {workspaceFocus}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
                                    {workspaceStatus}
                                </p>

                                <div className="mt-6 flex gap-3 overflow-x-auto pb-1" tabIndex={0} aria-label="Fast-track stage progress">
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

                            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_460px]">
                                <SectionShell
                                    title="Core files"
                                    description="Every file stays attached to this case. Pick one to preview or download."
                                >
                                    <div className="space-y-3">
                                        {selectedCase.documents.items.map((item) => {
                                            const active = previewItemId === item.id;
                                            const canPreview = Boolean(item.documentRecordId || item.fileUrl);
                                            return (
                                                <div
                                                    key={item.id}
                                                    data-fast-track-document={item.id}
                                                    className={[
                                                        'rounded-3xl border px-4 py-4 transition-colors',
                                                        active
                                                            ? 'border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20'
                                                            : 'border-gray-100 bg-gray-50 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900/40 dark:hover:bg-gray-900',
                                                    ].join(' ')}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleRailPreview(item)}
                                                        className="w-full text-left"
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                                                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                                    {item.fileName || 'No file attached yet'}
                                                                </p>
                                                            </div>
                                                            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${documentStatusTone(item.status)}`}>
                                                                {formatDocumentStatus(item.status)}
                                                            </span>
                                                        </div>
                                                    </button>
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        <ActionButton
                                                            tone="secondary"
                                                            onClick={() => void handleRailPreview(item)}
                                                            disabled={!canPreview}
                                                            busy={previewBusyItemId === item.id}
                                                            ariaLabel={`Preview ${item.label} from core files`}
                                                            className="px-3 py-2 text-xs"
                                                        >
                                                            <Eye size={12} />
                                                            Preview
                                                        </ActionButton>
                                                        <ActionButton
                                                            tone="secondary"
                                                            onClick={() => void handleRailDownload(item)}
                                                            disabled={!canPreview}
                                                            busy={previewBusyItemId === item.id}
                                                            ariaLabel={`Download ${item.label} from core files`}
                                                            className="px-3 py-2 text-xs"
                                                        >
                                                            <Download size={12} />
                                                            Download
                                                        </ActionButton>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </SectionShell>

                                <div className="space-y-6">
                                    <div ref={previewSectionRef} data-fast-track-preview-panel className="scroll-mt-24">
                                        <SectionShell
                                            title="Preview"
                                            description="Images and PDFs open here. Other files stay downloadable from this same rail."
                                        >
                                            {renderDocumentPreview()}
                                        </SectionShell>
                                    </div>

                                    <SectionShell
                                        title="Case chat"
                                        description="Keep quick coordination on the same case page."
                                    >
                                        {renderCaseThread()}
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
                                                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">
                                                            {entry.actorRole}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                        {formatDateTime(entry.createdAt)}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </SectionShell>
                                </div>
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
