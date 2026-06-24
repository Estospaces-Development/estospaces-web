'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle,
    ArrowUpRight,
    CalendarDays,
    CircleDot,
    Download,
    Eye,
    FileCheck2,
    FileImage,
    FileText,
    Home,
    Loader2,
    SendHorizontal,
    ShieldCheck,
    Star,
    Upload,
    X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
    usePublishWorkspaceSync,
    useWorkspaceRefresh,
} from '@/contexts/WorkspaceSyncContext';
import {
    buildFastTrackDocumentDraftStorageKey,
    buildFastTrackDocumentSearchParams,
    buildFastTrackSelectionSearchParams,
    buildFastTrackStageSearchParams,
    buildFastTrackThreadRecipientLabel,
    canUserConfirmFastTrackHandover,
    describeFastTrackWorkspaceFocus,
    describeFastTrackWorkspaceStatus,
    fastTrackCaseMatchesQuery,
    getFastTrackDecisionGuard,
    getFastTrackFinalDecisionGuard,
    isFastTrackDocumentDraftDirty,
    isFastTrackCaseCompleteForRole,
    resolveFastTrackDocumentSearchParam,
    resolveFastTrackStageSearchParam,
    resolveFastTrackSelectionCaseId,
    resolveFastTrackThreadRecipientId,
} from '@/lib/fastTrackWorkspace';
import {
    WORKSPACE_SYNC_INTERVALS,
    WORKSPACE_SYNC_TAGS,
} from '@/lib/workspaceSync';
import {
    loadFastTrackWorkspaceCases,
    sortFastTrackWorkspaceCases,
} from '@/lib/fastTrackWorkspaceLoad';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
import { getDocumentAccessBlob, getDocumentAccessUrl } from '@/services/documentAccessService';
import {
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
import {
    managerReviewsService,
    type ManagerReview,
} from '@/services/managerReviewsService';
import {
    DELETED_FAST_TRACK_CASE_MESSAGE,
    sanitizeWorkspaceCaseId,
    stripCaseSearchParam,
} from '@/lib/fastTrackCaseContext';
import DateField from '@/components/ui/DateField';
import TimeField from '@/components/ui/TimeField';
import FastTrackCelebrationOverlay from '@/components/dashboard/FastTrackCelebrationOverlay';
import {
    FastTrackCaseMasthead,
    FastTrackCaseRail,
    FastTrackStageStepper,
    FastTrackUtilityDock,
    FastTrackWorkspaceCustomizationDrawer,
    FastTrackWorkspaceHeader,
} from '@/components/fast-track/FastTrackWorkspaceLayout';
import {
    defaultFastTrackWorkspacePreferences,
    FAST_TRACK_WORKSPACE_MODULES,
    moveFastTrackWorkspaceModule,
    normalizeFastTrackWorkspacePreferences,
    orderVisibleFastTrackWorkspaceModules,
    resolveFastTrackCaseRailLayout,
    type FastTrackWorkspaceModule,
    type FastTrackWorkspacePreferences,
    type FastTrackWorkspaceRole,
} from '@/lib/fastTrackWorkspacePreferences';
import {
    getFastTrackWorkspacePreferences,
    updateFastTrackWorkspacePreferences,
} from '@/services/workspacePreferencesService';
import { getJourneyChromeCopy, getJourneyStageLabel } from '@/lib/userJourneyCopy';
import { cn } from '@/lib/utils';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import { formatLaunchCurrency, LAUNCH_CURRENCY_CODE } from '@/lib/launchLocale';

type WorkspaceRole = FastTrackWorkspaceRole;
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
    role: WorkspaceRole,
): string => {
    return getJourneyStageLabel(stage, journeyMode, role);
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

const formatDeadline = (hoursRemaining: number, role: WorkspaceRole) => {
    if (!Number.isFinite(hoursRemaining)) {
        return role === 'user' ? '24 hours' : '24h window';
    }
    if (hoursRemaining <= 0) {
        return role === 'user' ? 'Needs attention' : 'Overdue';
    }
    return `${hoursRemaining}h left`;
};

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
            return 'Reupload requested';
        case 'uploaded':
            return 'Waiting for review';
        default:
            return 'Waiting for upload';
    }
};

export const getFastTrackDocumentUploadCopy = ({
    status,
    hasAttachedFile,
}: {
    status: FastTrackDocumentItem['status'];
    hasAttachedFile: boolean;
}) => {
    if (status === 'reupload_needed') {
        return {
            chooserSummary: 'No replacement selected',
            actionLabel: 'Reupload file',
            statusMessage: 'Reupload requested. Choose a replacement file and submit it here.',
        };
    }

    if (hasAttachedFile || status === 'uploaded' || status === 'approved') {
        return {
            chooserSummary: 'No reupload selected',
            actionLabel: 'Reupload file',
            statusMessage: 'Uploaded and visible to your manager. Preview is ready in this workspace.',
        };
    }

    return {
        chooserSummary: 'No file selected',
        actionLabel: 'Upload file',
        statusMessage: 'Upload the requested file so your manager can review it.',
    };
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

const SectionShell = ({
    title,
    description,
    icon: Icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
}) => (
    <section className="rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start gap-2.5">
            {Icon ? (
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                    <Icon size={16} />
                </span>
            ) : null}
            <div className="flex flex-col gap-1">
                <h3 className="text-[20px] font-semibold text-gray-900 dark:text-white">{title}</h3>
                {description ? (
                    <p className="text-[13px] text-gray-500 dark:text-gray-400">{description}</p>
                ) : null}
            </div>
        </div>
        <div className="mt-4">{children}</div>
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
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-70 dark:focus-visible:ring-offset-gray-950 ${toneClass} ${className}`.trim()}
        >
            {busy ? <Loader2 size={16} className="animate-spin" /> : null}
            {children}
        </button>
    );
};

interface FastTrackDocumentFileChooserProps {
    documentId: string;
    label: string;
    inputRef?: (node: HTMLInputElement | null) => void;
    onFileSelected: (file: File | null) => void;
}

export const FastTrackDocumentFileChooser = ({
    documentId,
    label,
    inputRef,
    onFileSelected,
}: FastTrackDocumentFileChooserProps) => (
    <span className="relative inline-flex">
        <input
            data-fast-track-document-file-input={documentId}
            ref={inputRef}
            type="file"
            name={`fast-track-document-${documentId}`}
            aria-label={`Choose file for ${label}`}
            className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0"
            onChange={(event) => onFileSelected(event.target.files?.[0] || null)}
        />
        <span
            aria-hidden="true"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 peer-focus-visible:ring-2 peer-focus-visible:ring-orange-500 peer-focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800 dark:peer-focus-visible:ring-offset-gray-950"
        >
            <Upload size={14} />
            Choose file
        </span>
    </span>
);

export default function FastTrackWorkspace({ role }: { role: WorkspaceRole }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const toast = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const [cases, setCases] = useState<FastTrackCase[]>([]);
    const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
    const [activeStageOverride, setActiveStageOverride] = useState<FastTrackStage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState(() => (
        searchParams.get('search') || searchParams.get('q') || ''
    ));
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
    const [documentFocusId, setDocumentFocusId] = useState<string | null>(null);
    const [previewItemId, setPreviewItemId] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [previewBusyItemId, setPreviewBusyItemId] = useState<string | null>(null);
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [threadConversation, setThreadConversation] = useState<Conversation | null>(null);
    const [threadMessages, setThreadMessages] = useState<Message[]>([]);
    const [threadDraft, setThreadDraft] = useState('');
    const [threadLoading, setThreadLoading] = useState(false);
    const [threadSending, setThreadSending] = useState(false);
    const [threadError, setThreadError] = useState<string | null>(null);
    const [showCompletionCelebration, setShowCompletionCelebration] = useState(false);
    const [celebrationPropertyTitle, setCelebrationPropertyTitle] = useState<string | null>(null);
    const [managerReview, setManagerReview] = useState<ManagerReview | null>(null);
    const [managerReviewLoading, setManagerReviewLoading] = useState(false);
    const [managerReviewSubmitting, setManagerReviewSubmitting] = useState(false);
    const [managerReviewExpanded, setManagerReviewExpanded] = useState(false);
    const [managerReviewRating, setManagerReviewRating] = useState(0);
    const [managerReviewComment, setManagerReviewComment] = useState('');
    const [managerReviewError, setManagerReviewError] = useState<string | null>(null);
    const [recoveredCaseLink, setRecoveredCaseLink] = useState<string | null>(null);
    const [workspacePreferences, setWorkspacePreferences] = useState<FastTrackWorkspacePreferences>(
        () => defaultFastTrackWorkspacePreferences(role),
    );
    const [customizationOpen, setCustomizationOpen] = useState(false);
    const [caseRailDrawerOpen, setCaseRailDrawerOpen] = useState(false);
    const [compactCaseRailViewport, setCompactCaseRailViewport] = useState(
        () => typeof window !== 'undefined' && window.matchMedia('(max-width: 1279px)').matches,
    );
    const [activeUtilityModule, setActiveUtilityModule] = useState<FastTrackWorkspaceModule>('core_files');
    const [userDetailsOpen, setUserDetailsOpen] = useState(false);
    const [cancelCaseDialogOpen, setCancelCaseDialogOpen] = useState(false);
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
    const previewObjectUrlRef = useRef<string | null>(null);
    const previewSectionRef = useRef<HTMLDivElement | null>(null);
    const managerReviewSectionRef = useRef<HTMLDivElement | null>(null);
    const recoveredCaseNoticeRef = useRef<HTMLDivElement | null>(null);
    const completionStatusRef = useRef<Record<string, FastTrackCase['workspaceFinalStatus']>>({});
    const celebratedCaseIdRef = useRef<string | null>(null);
    const workspacePreferencesLoadedRef = useRef(false);
    const lastSavedWorkspacePreferencesRef = useRef('');
    const lastCasesSignatureRef = useRef('');
    const pendingSelectedCaseIdRef = useRef<string | null>(null);
    const publishWorkspaceSync = usePublishWorkspaceSync();
    const searchParamsKey = searchParams.toString();
    const journeyChromeCopy = getJourneyChromeCopy(role);
    const filters: Array<{ value: FilterMode; label: string }> = role === 'user'
        ? [
            { value: 'all', label: 'All' },
            { value: 'active', label: 'In progress' },
            { value: 'completed', label: 'Done' },
            { value: 'cancelled', label: 'Closed' },
        ]
        : [
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
        ];

    const releasePreviewObjectUrl = useCallback(() => {
        if (previewObjectUrlRef.current?.startsWith('blob:')) {
            URL.revokeObjectURL(previewObjectUrlRef.current);
        }
        previewObjectUrlRef.current = null;
    }, []);

    const handleDocumentFocus = useCallback((documentId: string) => {
        setDocumentFocusId(documentId);
        setSearchParams((previous) => buildFastTrackDocumentSearchParams(previous, documentId));
    }, [setSearchParams]);

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

        try {
            const result = await loadFastTrackWorkspaceCases(
                () => getFastTrackCases({ suppressErrorToast: true }),
                lastCasesSignatureRef.current,
            );
            if (result.cases) {
                if (result.changed) {
                    lastCasesSignatureRef.current = result.signature;
                    setCases(result.cases);
                }
                setError(null);
            } else if (!silent) {
                setError(result.error || 'Unable to load fast-track cases.');
            }
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        void fetchCases();
    }, [fetchCases]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const mediaQuery = window.matchMedia('(max-width: 1279px)');
        const syncCompactCaseRailViewport = () => {
            setCompactCaseRailViewport(mediaQuery.matches);
        };

        syncCompactCaseRailViewport();
        mediaQuery.addEventListener('change', syncCompactCaseRailViewport);

        return () => {
            mediaQuery.removeEventListener('change', syncCompactCaseRailViewport);
        };
    }, []);

    useEffect(() => {
        if (!compactCaseRailViewport && caseRailDrawerOpen) {
            setCaseRailDrawerOpen(false);
        }
    }, [caseRailDrawerOpen, compactCaseRailViewport]);

    useWorkspaceRefresh({
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
        refresh: () => fetchCases(true),
        intervalMs: role === 'user' ? 60000 : WORKSPACE_SYNC_INTERVALS.DASHBOARD,
        refreshOnFocus: true,
        refreshOnVisible: true,
    });

    useEffect(() => {
        const defaults = defaultFastTrackWorkspacePreferences(role);
        workspacePreferencesLoadedRef.current = false;
        lastSavedWorkspacePreferencesRef.current = JSON.stringify(defaults);
        setWorkspacePreferences(defaults);
        setActiveUtilityModule(defaults.defaultActiveModule);

        let cancelled = false;
        const loadWorkspacePreferences = async () => {
            const { data } = await getFastTrackWorkspacePreferences(role);
            if (cancelled) {
                return;
            }

            const nextPreferences = normalizeFastTrackWorkspacePreferences(data, role);
            workspacePreferencesLoadedRef.current = true;
            lastSavedWorkspacePreferencesRef.current = JSON.stringify(nextPreferences);
            setWorkspacePreferences(nextPreferences);
            setActiveUtilityModule(nextPreferences.defaultActiveModule);
        };

        void loadWorkspacePreferences();

        return () => {
            cancelled = true;
        };
    }, [role]);

    useEffect(() => {
        if (!workspacePreferencesLoadedRef.current) {
            return;
        }

        const serializedPreferences = JSON.stringify(workspacePreferences);
        if (serializedPreferences === lastSavedWorkspacePreferencesRef.current) {
            return;
        }

        const timeoutId = window.setTimeout(async () => {
            const { data } = await updateFastTrackWorkspacePreferences(role, workspacePreferences);
            if (!data) {
                return;
            }

            const normalized = normalizeFastTrackWorkspacePreferences(data, role);
            lastSavedWorkspacePreferencesRef.current = JSON.stringify(normalized);
            setWorkspacePreferences(normalized);
            setActiveUtilityModule((previous) =>
                normalized.visibleModules.includes(previous)
                    ? previous
                    : normalized.defaultActiveModule,
            );
        }, 350);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [role, workspacePreferences]);

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

            return fastTrackCaseMatchesQuery(item, query);
        });
    }, [cases, filter, query]);

    useEffect(() => {
        setCurrentCasePage(1);
    }, [filter, query]);

    const selectionParams = useMemo(
        () => new URLSearchParams(searchParamsKey),
        [searchParamsKey],
    );
    const requestedCaseParam = selectionParams.get('case');
    const requestedStageParam = resolveFastTrackStageSearchParam(selectionParams);
    const celebrateRequested = selectionParams.get('celebrate') === '1';
    const requestedCaseIsAvailable = useMemo(
        () => Boolean(
            requestedCaseParam
            && !sanitizeWorkspaceCaseId(requestedCaseParam, cases.map((item) => item.caseId)).removedCaseId,
        ),
        [cases, requestedCaseParam],
    );
    const hasInvalidRequestedCase = Boolean(requestedCaseParam && !loading && !requestedCaseIsAvailable);
    const selectionParamsForResolution = useMemo(
        () => (hasInvalidRequestedCase ? stripCaseSearchParam(selectionParams) : selectionParams),
        [hasInvalidRequestedCase, selectionParams],
    );

    useEffect(() => {
        if (!requestedCaseParam || loading) {
            return;
        }

        const { removedCaseId } = sanitizeWorkspaceCaseId(
            requestedCaseParam,
            cases.map((item) => item.caseId),
        );

        if (!removedCaseId) {
            setRecoveredCaseLink(null);
            return;
        }

        setRecoveredCaseLink(removedCaseId);
        setSearchParams((previous) => stripCaseSearchParam(previous), { replace: true });
    }, [cases, loading, requestedCaseParam, setSearchParams]);

    useEffect(() => {
        if (!recoveredCaseLink) {
            return;
        }

        const frame = window.requestAnimationFrame(() => {
            recoveredCaseNoticeRef.current?.focus();
        });

        return () => window.cancelAnimationFrame(frame);
    }, [recoveredCaseLink]);

    useEffect(() => {
        if (cases.length === 0) {
            pendingSelectedCaseIdRef.current = null;
            setSelectedCaseId(null);
            return;
        }

        const pendingSelectedCaseId = pendingSelectedCaseIdRef.current;
        if (pendingSelectedCaseId) {
            const pendingCaseExists = cases.some((item) => item.caseId === pendingSelectedCaseId);
            if (pendingCaseExists) {
                if (requestedCaseParam === pendingSelectedCaseId) {
                    pendingSelectedCaseIdRef.current = null;
                }
                if (selectedCaseId !== pendingSelectedCaseId) {
                    setSelectedCaseId(pendingSelectedCaseId);
                }
                return;
            }
            pendingSelectedCaseIdRef.current = null;
        }

        const resolvedCaseId = resolveFastTrackSelectionCaseId(cases, selectionParamsForResolution, selectedCaseId);
        if (resolvedCaseId !== selectedCaseId) {
            setSelectedCaseId(resolvedCaseId);
        }
    }, [cases, requestedCaseParam, searchParamsKey, selectedCaseId, selectionParamsForResolution]);

    useEffect(() => {
        if (filteredCases.length === 0) {
            return;
        }

        const requestedCaseStillAvailable = Boolean(
            requestedCaseParam && cases.some((item) => item.caseId === requestedCaseParam),
        );
        if (requestedCaseStillAvailable) {
            return;
        }

        if (query.trim()) {
            if (!selectedCaseId) {
                setSelectedCaseId(filteredCases[0].caseId);
            }
            return;
        }

        if (!selectedCaseId || !filteredCases.some((item) => item.caseId === selectedCaseId)) {
            setSelectedCaseId(filteredCases[0].caseId);
        }
    }, [cases, filteredCases, query, requestedCaseParam, selectedCaseId]);

    const totalCasePages = useMemo(
        () => Math.max(1, Math.ceil(filteredCases.length / FAST_TRACK_CASES_PAGE_SIZE)),
        [filteredCases.length],
    );

    useEffect(() => {
        if (currentCasePage > totalCasePages) {
            setCurrentCasePage(totalCasePages);
        }
    }, [currentCasePage, totalCasePages]);

    const paginatedCases = useMemo(() => {
        const pageStart = (currentCasePage - 1) * FAST_TRACK_CASES_PAGE_SIZE;
        return filteredCases.slice(pageStart, pageStart + FAST_TRACK_CASES_PAGE_SIZE);
    }, [currentCasePage, filteredCases]);

    useEffect(() => {
        if (!selectedCaseId) {
            return;
        }

        if (hasInvalidRequestedCase || recoveredCaseLink) {
            return;
        }

        const requestedCase = requestedCaseParam
            ? sanitizeWorkspaceCaseId(requestedCaseParam, cases.map((item) => item.caseId)).caseId
            : null;
        if (requestedCase && requestedCase !== selectedCaseId) {
            return;
        }

        if (requestedCase === selectedCaseId && requestedCaseParam === selectedCaseId) {
            return;
        }

        setSearchParams((previous) => buildFastTrackSelectionSearchParams(previous, selectedCaseId));
    }, [cases, hasInvalidRequestedCase, recoveredCaseLink, requestedCaseParam, selectedCaseId, setSearchParams]);

    const selectedCase = useMemo(
        () => filteredCases.find((item) => item.caseId === selectedCaseId) || cases.find((item) => item.caseId === selectedCaseId) || null,
        [cases, filteredCases, selectedCaseId],
    );
    const requestedDocumentId = useMemo(
        () => selectedCase
            ? resolveFastTrackDocumentSearchParam(selectionParams, selectedCase.documents.items.map((item) => item.id))
            : null,
        [selectedCase, selectionParams],
    );
    const visibleStage = activeStageOverride ?? selectedCase?.stage ?? 'selected';
    const documentDraftStorageKey = useMemo(
        () => selectedCase
            ? buildFastTrackDocumentDraftStorageKey(role, selectedCase.caseId)
            : '',
        [role, selectedCase?.caseId],
    );
    const isManagerReviewEligible = role === 'user'
        && Boolean(selectedCase?.managerId)
        && selectedCase?.workspaceFinalStatus !== 'cancelled';

    useEffect(() => {
        if (!documentDraftStorageKey) {
            setDocumentNotes({});
            return;
        }

        const savedDraft = window.localStorage.getItem(documentDraftStorageKey);
        if (!savedDraft) {
            setDocumentNotes({});
            return;
        }

        try {
            setDocumentNotes(JSON.parse(savedDraft));
        } catch {
            window.localStorage.removeItem(documentDraftStorageKey);
        }
    }, [documentDraftStorageKey]);

    useEffect(() => {
        if (!documentDraftStorageKey) {
            return;
        }

        if (!isFastTrackDocumentDraftDirty(documentNotes)) {
            window.localStorage.removeItem(documentDraftStorageKey);
            return;
        }

        window.localStorage.setItem(
            documentDraftStorageKey,
            JSON.stringify(documentNotes),
        );
    }, [documentDraftStorageKey, documentNotes]);

    useEffect(() => {
        if (!selectedCase) {
            setActiveStageOverride(null);
            return;
        }

        if (requestedStageParam) {
            setActiveStageOverride(requestedStageParam === selectedCase.stage ? null : requestedStageParam);
            return;
        }

        setActiveStageOverride(null);
    }, [requestedStageParam, selectedCase?.caseId, selectedCase?.stage]);

    useEffect(() => {
        if (!isManagerReviewEligible || !selectedCase) {
            setManagerReview(null);
            setManagerReviewExpanded(false);
            setManagerReviewRating(0);
            setManagerReviewComment('');
            setManagerReviewError(null);
            setManagerReviewLoading(false);
            return;
        }

        let cancelled = false;
        setManagerReviewLoading(true);
        setManagerReviewError(null);

        const loadManagerReview = async () => {
            const result = await managerReviewsService.getManagerReviewForCase(selectedCase.caseId);
            if (cancelled) {
                return;
            }

            if (!result.success) {
                setManagerReview(null);
                setManagerReviewError(result.error || 'Unable to load manager feedback.');
                setManagerReviewLoading(false);
                return;
            }

            setManagerReview(result.data);
            setManagerReviewExpanded(!result.data);
            setManagerReviewRating(result.data?.rating || 0);
            setManagerReviewComment(result.data?.comment || '');
            setManagerReviewLoading(false);
        };

        void loadManagerReview();

        return () => {
            cancelled = true;
        };
    }, [isManagerReviewEligible, selectedCase?.caseId]);

    const openManagerReviewForm = useCallback(() => {
        if (!isManagerReviewEligible) {
            return;
        }

        setManagerReviewExpanded(true);
        setShowCompletionCelebration(false);
        window.requestAnimationFrame(() => {
            managerReviewSectionRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
            });
        });
    }, [isManagerReviewEligible]);

    const openCompletionCelebration = useCallback((nextCase: FastTrackCase) => {
        celebratedCaseIdRef.current = nextCase.caseId;
        setCelebrationPropertyTitle(nextCase.propertyTitle);
        toast.clearAll();
        setShowCompletionCelebration(true);
    }, [toast]);

    const workspaceFocus = useMemo(
        () => (selectedCase ? describeFastTrackWorkspaceFocus(selectedCase, role) : ''),
        [role, selectedCase],
    );

    const workspaceStatus = useMemo(
        () => (selectedCase ? describeFastTrackWorkspaceStatus(selectedCase, role) : ''),
        [role, selectedCase],
    );

    const updateLocalCase = useCallback((nextCase: FastTrackCase) => {
        setCases((previous) => sortFastTrackWorkspaceCases(previous.map((item) => (
            item.caseId === nextCase.caseId ? nextCase : item
        ))));
        setSelectedCaseId(nextCase.caseId);
    }, []);

    const handleSubmitManagerReview = useCallback(async () => {
        if (!selectedCase || !isManagerReviewEligible) {
            return;
        }
        if (managerReviewRating < 1 || managerReviewRating > 5) {
            toast.error('Choose a star rating first.');
            return;
        }

        setManagerReviewSubmitting(true);
        setManagerReviewError(null);

        const result = managerReview
            ? await managerReviewsService.updateManagerReview(managerReview.id, {
                rating: managerReviewRating,
                comment: managerReviewComment.trim(),
            })
            : await managerReviewsService.createManagerReview({
                fast_track_case_id: selectedCase.caseId,
                rating: managerReviewRating,
                comment: managerReviewComment.trim(),
            });

        setManagerReviewSubmitting(false);

        if (!result.success || !result.data) {
            const message = result.error || 'Unable to save your feedback right now.';
            setManagerReviewError(message);
            toast.error(message);
            return;
        }

        setManagerReview(result.data);
        setManagerReviewExpanded(false);
        setManagerReviewRating(result.data.rating);
        setManagerReviewComment(result.data.comment || '');
        toast.success(
            managerReview
                ? 'Your feedback was updated.'
                : 'Thanks. Your feedback is now pending admin approval.',
        );
    }, [
        isManagerReviewEligible,
        managerReview,
        managerReviewComment,
        managerReviewRating,
        selectedCase,
        toast,
    ]);

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
        if (data.workspaceFinalStatus !== 'completed') {
            toast.success(successMessage || 'Workspace updated.');
        }
    }, [publishWorkspaceSync, selectedCase, toast, updateLocalCase]);

    const handleConfirmCancelCase = useCallback(() => {
        setCancelCaseDialogOpen(false);
        void runAction(
            'cancel_case',
            { reason: 'Cancelled from manager workspace.' },
            'Case cancelled.',
        );
    }, [runAction]);

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
        setDocumentNotes((previous) => {
            const next = { ...previous };
            delete next[item.id];
            return next;
        });
        const input = fileInputRefs.current[item.id];
        if (input) {
            input.value = '';
        }
        updateLocalCase(data);
        const uploadedItem = data.documents.items.find((documentItem) => documentItem.id === item.id);
        if (uploadedItem) {
            handleDocumentFocus(uploadedItem.id);
            setPreviewItemId(uploadedItem.id);
            setPreviewModalOpen(true);
        }
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
    }, [documentNotes, handleDocumentFocus, publishWorkspaceSync, revealPreviewSection, role, selectedCase, selectedFiles, toast, updateLocalCase]);

    const stageIndex = selectedCase ? STAGES.indexOf(selectedCase.stage) : -1;
    const statusChip = selectedCase ? formatStatusChip(selectedCase) : null;
    const parsedAgreementAmount = amountDue.trim() ? Number(amountDue) : 0;
    const hasValidAgreementPaymentAmount = Number.isFinite(parsedAgreementAmount) && parsedAgreementAmount > 0;
    const publishAgreementNeedsAmount = PAYMENTS_ENABLED && paymentRequired && !hasValidAgreementPaymentAmount;
    const stats = useMemo(() => ({
        active: cases.filter((item) => item.workspaceFinalStatus === 'active').length,
        completed: cases.filter((item) => item.workspaceFinalStatus === 'completed').length,
        cancelled: cases.filter((item) => item.workspaceFinalStatus === 'cancelled').length,
    }), [cases]);
    const orderedVisibleUtilityModules = useMemo(
        () => orderVisibleFastTrackWorkspaceModules(workspacePreferences),
        [workspacePreferences],
    );
    const utilityModules = useMemo(() => {
        if (previewItemId && !orderedVisibleUtilityModules.includes('preview')) {
            return ['preview', ...orderedVisibleUtilityModules] as FastTrackWorkspaceModule[];
        }
        return orderedVisibleUtilityModules;
    }, [orderedVisibleUtilityModules, previewItemId]);
    const allOrderedModules = useMemo(() => {
        return workspacePreferences.moduleOrder.length > 0
            ? workspacePreferences.moduleOrder
            : [...FAST_TRACK_WORKSPACE_MODULES];
    }, [workspacePreferences.moduleOrder]);

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
        setPaymentRequired(PAYMENTS_ENABLED && (selectedCase.agreement.paymentStatus === 'requested' || selectedCase.agreement.paymentStatus === 'paid'));
        setHandoverNote(selectedCase.handover.note || '');
        setRequestChangeNote(selectedCase.viewing.requestedChange || '');
        setDocumentNotes(
            Object.fromEntries(selectedCase.documents.items.map((item) => [
                item.id,
                role === 'user' ? (item.uploadNote || '') : (item.reviewNote || ''),
            ])),
        );
        setDocumentFocusId((previous) => {
            if (requestedDocumentId) {
                return requestedDocumentId;
            }
            if (previous && selectedCase.documents.items.some((item) => item.id === previous)) {
                return previous;
            }
            return selectedCase.documents.items[0]?.id || null;
        });
        setPreviewItemId((previous) => {
            if (previous && selectedCase.documents.items.some((item) => item.id === previous)) {
                return previous;
            }
            return null;
        });
    }, [requestedDocumentId, role, selectedCase?.caseId]);

    useEffect(() => {
        if (utilityModules.length === 0) {
            return;
        }

        if (!utilityModules.includes(activeUtilityModule)) {
            setActiveUtilityModule(utilityModules[0]);
        }
    }, [activeUtilityModule, utilityModules]);

    useEffect(() => {
        if (!selectedCase) {
            return;
        }

        if (orderedVisibleUtilityModules.includes(workspacePreferences.defaultActiveModule)) {
            setActiveUtilityModule(workspacePreferences.defaultActiveModule);
        }
    }, [orderedVisibleUtilityModules, selectedCase?.caseId, workspacePreferences.defaultActiveModule]);

    useEffect(() => {
        if (!selectedCase) {
            return;
        }

        const previousStatus = completionStatusRef.current[selectedCase.caseId];
        completionStatusRef.current[selectedCase.caseId] = selectedCase.workspaceFinalStatus;

        if (!previousStatus || previousStatus === 'completed' || selectedCase.workspaceFinalStatus !== 'completed') {
            return;
        }

        if (celebratedCaseIdRef.current === selectedCase.caseId) {
            return;
        }

        openCompletionCelebration(selectedCase);
    }, [openCompletionCelebration, selectedCase]);

    useEffect(() => {
        if (!celebrateRequested || !selectedCase || selectedCase.workspaceFinalStatus !== 'completed') {
            return;
        }

        setSearchParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('celebrate');
            return next;
        });

        if (celebratedCaseIdRef.current === selectedCase.caseId) {
            return;
        }

        openCompletionCelebration(selectedCase);
    }, [celebrateRequested, openCompletionCelebration, selectedCase, setSearchParams]);

    useEffect(() => {
        if (!previewItemId || !utilityModules.includes('preview')) {
            return;
        }

        setActiveUtilityModule('preview');
        if (role === 'user') {
            setUserDetailsOpen(true);
        }
    }, [previewItemId, role, utilityModules]);

    const compactActivity = useMemo(
        () => (selectedCase?.activity || []).slice(0, 8),
        [selectedCase?.activity],
    );

    const previewItem = useMemo(
        () => selectedCase?.documents.items.find((item) => item.id === previewItemId) || null,
        [previewItemId, selectedCase?.documents.items],
    );
    const focusedDocumentItem = useMemo(
        () => selectedCase?.documents.items.find((item) => item.id === documentFocusId)
            || selectedCase?.documents.items[0]
            || null,
        [documentFocusId, selectedCase?.documents.items],
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
                payment_required: PAYMENTS_ENABLED && paymentRequired && hasValidAgreementPaymentAmount,
                amount_due: PAYMENTS_ENABLED && paymentRequired && hasValidAgreementPaymentAmount ? parsedAgreementAmount : undefined,
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

    const updateWorkspacePreferencesState = useCallback((
        updater: (previous: FastTrackWorkspacePreferences) => FastTrackWorkspacePreferences,
    ) => {
        setWorkspacePreferences((previous) => normalizeFastTrackWorkspacePreferences(updater(previous), role));
    }, [role]);

    const handleToggleRail = useCallback(() => {
        if (compactCaseRailViewport) {
            setCaseRailDrawerOpen((previous) => !previous);
            return;
        }

        updateWorkspacePreferencesState((previous) => ({
            ...previous,
            caseRailCollapsed: !previous.caseRailCollapsed,
        }));
    }, [compactCaseRailViewport, updateWorkspacePreferencesState]);

    const handleToggleModuleVisibility = useCallback((module: FastTrackWorkspaceModule) => {
        updateWorkspacePreferencesState((previous) => {
            const visible = previous.visibleModules.includes(module)
                ? previous.visibleModules.filter((item) => item !== module)
                : [...previous.visibleModules, module];
            const nextVisible = previous.moduleOrder.filter((item) => visible.includes(item));
            return {
                ...previous,
                visibleModules: visible,
                defaultActiveModule: nextVisible.includes(previous.defaultActiveModule)
                    ? previous.defaultActiveModule
                    : nextVisible[0] || previous.defaultActiveModule,
            };
        });
    }, [updateWorkspacePreferencesState]);

    const handleMoveModule = useCallback((
        module: FastTrackWorkspaceModule,
        direction: 'up' | 'down',
    ) => {
        updateWorkspacePreferencesState((previous) => ({
            ...previous,
            moduleOrder: moveFastTrackWorkspaceModule(previous.moduleOrder, module, direction),
        }));
    }, [updateWorkspacePreferencesState]);

    const handleResetWorkspacePreferences = useCallback(() => {
        const defaults = defaultFastTrackWorkspacePreferences(role);
        workspacePreferencesLoadedRef.current = true;
        lastSavedWorkspacePreferencesRef.current = '';
        setWorkspacePreferences(defaults);
        setActiveUtilityModule(defaults.defaultActiveModule);
    }, [role]);

    const ensureDocumentPreview = useCallback(async (
        item: FastTrackDocumentItem,
        options?: {
            openInNewTab?: boolean;
            revealInViewport?: boolean;
            openInModal?: boolean;
        },
    ) => {
        const openInNewTab = options?.openInNewTab === true;
        const revealInViewport = options?.revealInViewport === true;
        const openInModal = options?.openInModal === true;
        const selectedFile = selectedFiles[item.id] || null;
        if (openInModal) {
            setPreviewModalOpen(true);
        }
        setPreviewItemId(item.id);
        if (selectedFile) {
            releasePreviewObjectUrl();
            const nextUrl = URL.createObjectURL(selectedFile);
            previewObjectUrlRef.current = nextUrl;
            setPreviewBusyItemId(null);
            setPreviewError(null);
            setPreviewUrl(nextUrl);
            if (openInNewTab) {
                window.open(nextUrl, '_blank', 'noopener,noreferrer');
            }
            if (revealInViewport) {
                if (role === 'user') {
                    setUserDetailsOpen(true);
                }
                revealPreviewSection();
            }
            return nextUrl;
        }

        if (!item.documentRecordId && !item.fileUrl) {
            setPreviewError('This file is not attached yet.');
            setPreviewUrl(null);
            setPreviewBusyItemId(null);
            if (revealInViewport) {
                if (role === 'user') {
                    setUserDetailsOpen(true);
                }
                revealPreviewSection();
            }
            return null;
        }

        setPreviewBusyItemId(item.id);
        handleDocumentFocus(item.id);
        setPreviewError(null);

        const previewKind = detectDocumentPreviewKind(item);
        let nextUrl = item.fileUrl || null;
        let nextAccessUrl = item.fileUrl || null;
        try {
            if (item.documentRecordId) {
                if (!openInNewTab && (previewKind === 'image' || previewKind === 'pdf')) {
                    const access = await getDocumentAccessBlob(item.documentRecordId);
                    if (access.error || !access.url || !access.blob) {
                        setPreviewUrl(null);
                        setPreviewError(access.error || 'Preview is unavailable for this document.');
                        if (revealInViewport) {
                            if (role === 'user') {
                                setUserDetailsOpen(true);
                            }
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
                        setPreviewUrl(null);
                        setPreviewError(access.error || 'Preview is unavailable for this document.');
                        if (revealInViewport) {
                            if (role === 'user') {
                                setUserDetailsOpen(true);
                            }
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
                setPreviewUrl(null);
                setPreviewError('Preview is unavailable for this document.');
                if (revealInViewport) {
                    if (role === 'user') {
                        setUserDetailsOpen(true);
                    }
                    revealPreviewSection();
                }
                return null;
            }

            setPreviewUrl(nextUrl);
            setPreviewError(null);
            if (revealInViewport) {
                if (role === 'user') {
                    setUserDetailsOpen(true);
                }
                revealPreviewSection();
            }

            if (openInNewTab && nextAccessUrl) {
                window.open(nextAccessUrl, '_blank', 'noopener,noreferrer');
            }
            return nextUrl;
        } catch (error: any) {
            setPreviewUrl(null);
            setPreviewError(error?.message || 'Preview is unavailable for this document.');
            return null;
        } finally {
            setPreviewBusyItemId(null);
        }
    }, [handleDocumentFocus, releasePreviewObjectUrl, revealPreviewSection, role, selectedFiles]);

    const handleRailPreview = useCallback(async (item: FastTrackDocumentItem) => {
        await ensureDocumentPreview(item, { openInModal: true });
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
        const selectedPreviewFile = selectedFiles[previewItem.id] || null;
        if (!selectedPreviewFile && !previewItem.documentRecordId && !previewItem.fileUrl) {
            releasePreviewObjectUrl();
            setPreviewUrl(null);
            setPreviewError('Choose a document to preview once a file has been attached.');
            return;
        }
        void ensureDocumentPreview(previewItem);
    }, [ensureDocumentPreview, previewItem?.documentRecordId, previewItem?.fileUrl, previewItem?.mimeType, previewItemId, releasePreviewObjectUrl, selectedFiles]);

    useEffect(() => {
        let cancelled = false;

        const loadThread = async () => {
            if (activeUtilityModule !== 'case_chat') {
                return;
            }

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
                        ? 'Your helper will open messages here as soon as someone joins your journey.'
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
                recipientName: role === 'user' ? 'Your helper' : selectedCase.clientName,
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
                setThreadError(error?.message || (role === 'user' ? 'Unable to load your messages right now.' : 'Unable to load the case chat.'));
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
    }, [activeUtilityModule, role, selectedCase?.caseId, selectedCase?.clientName, threadRecipientId, user]);

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
                recipientName: role === 'user' ? 'Your helper' : selectedCase.clientName,
            });
            const nextMessage = await sendMessage({
                conversationId: conversation.id,
                content: threadDraft.trim(),
            });
            setThreadConversation(conversation);
            setThreadMessages((previous) => [...previous, nextMessage]);
            setThreadDraft('');
        } catch (error: any) {
            setThreadError(error?.message || (role === 'user' ? 'Unable to send your message right now.' : 'Unable to send this case message.'));
        } finally {
            setThreadSending(false);
        }
    }, [role, selectedCase, threadConversation, threadDraft, threadRecipientId, user]);

    const renderDocumentPreview = () => {
        if (!previewItem) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Pick a file to preview it here.
                </p>
            );
        }

        const selectedPreviewFile = selectedFiles[previewItem.id] || null;
        const previewDisplayItem: FastTrackDocumentItem = selectedPreviewFile
            ? {
                ...previewItem,
                fileName: selectedPreviewFile.name,
                mimeType: selectedPreviewFile.type || previewItem.mimeType,
            }
            : previewItem;
        const previewKind = detectDocumentPreviewKind(previewDisplayItem);
        const previewAvailable = Boolean(selectedPreviewFile || previewItem.documentRecordId || previewItem.fileUrl);

        return (
            <div className="space-y-4">
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{previewItem.label}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {previewDisplayItem.fileName || 'No file attached yet'}
                            </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${documentStatusTone(previewDisplayItem.status)}`}>
                            {formatDocumentStatus(previewDisplayItem.status)}
                        </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <ActionButton
                            tone="secondary"
                            onClick={() => void ensureDocumentPreview(previewItem, { revealInViewport: true })}
                            busy={previewBusyItemId === previewItem.id}
                            disabled={!previewAvailable}
                        >
                            <Eye size={16} />
                            Preview
                        </ActionButton>
                        <ActionButton
                            tone="secondary"
                            onClick={() => void ensureDocumentPreview(previewItem, { openInNewTab: true })}
                            busy={previewBusyItemId === previewItem.id}
                            disabled={!previewAvailable}
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
                        Choose or upload a file to preview it here.
                    </div>
                ) : previewKind === 'image' ? (
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <img
                            src={previewUrl}
                            alt={previewDisplayItem.fileName || previewDisplayItem.label}
                            className="max-h-[420px] w-full object-contain"
                        />
                    </div>
                ) : previewKind === 'pdf' ? (
                    <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-950">
                        <iframe
                            title={previewDisplayItem.fileName || previewDisplayItem.label}
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
                                Type: {previewDisplayItem.mimeType || 'Unknown'}
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                                {selectedPreviewFile ? 'Ready to upload' : `Uploaded: ${formatDateTime(previewDisplayItem.uploadedAt)}`}
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
        const threadMessageKeyFor = createDuplicateSafeKeyResolver('fast-track-thread-message');

        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-base font-semibold text-gray-900 dark:text-white">{threadRecipientLabel}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {role === 'user' ? 'Messages about your journey stay here.' : 'Messages stay attached to this case only.'}
                        </p>
                    </div>
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                        {role === 'user' ? 'Messages' : 'Case chat'}
                    </span>
                </div>

                {threadError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {threadError}
                    </div>
                ) : null}

                <div className="max-h-[320px] space-y-3 overflow-y-auto rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" tabIndex={0} aria-label={role === 'user' ? 'Journey messages' : 'Case chat transcript'}>
                    {threadLoading ? (
                        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {role === 'user' ? 'Loading your messages' : 'Loading case messages'}
                        </div>
                    ) : threadMessages.length === 0 ? (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {role === 'user' ? 'No messages yet. Keep your updates here.' : 'No case messages yet. Keep every update here instead of leaving the workspace.'}
                        </p>
                    ) : threadMessages.map((message, messageIndex) => {
                        const mine = message.sender_id === user?.id;
                        return (
                            <div
                                key={threadMessageKeyFor(message.id, messageIndex)}
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
                        placeholder={role === 'user' ? 'Write one clear message.' : 'Write one clear update for this case.'}
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

    const renderCoreFilesModule = () => {
        if (!selectedCase) {
            return null;
        }

        const activeDocument = focusedDocumentItem;
        if (!activeDocument) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role === 'user' ? 'Your documents will appear here when the document step opens.' : 'Core files will appear here when this case reaches the document lane.'}
                </p>
            );
        }

        const canPreview = Boolean(activeDocument.documentRecordId || activeDocument.fileUrl);
        const helperNote = activeDocument.reviewNote || activeDocument.uploadNote || activeDocument.note || '';
        const coreFileKeyFor = createDuplicateSafeKeyResolver('fast-track-core-file');

        return (
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {selectedCase.documents.items.map((item, itemIndex) => (
                        <button
                            key={coreFileKeyFor(item.id, itemIndex)}
                            type="button"
                            data-fast-track-document={item.id}
                            onClick={() => handleDocumentFocus(item.id)}
                            className={cn(
                                'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors',
                                activeDocument.id === item.id
                                    ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300'
                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                            )}
                        >
                            <span>{item.label}</span>
                            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', documentStatusTone(item.status))}>
                                {formatDocumentStatus(item.status)}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="rounded-[24px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-base font-semibold text-gray-900 dark:text-white">{activeDocument.label}</p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {activeDocument.fileName || 'No file attached yet'}
                            </p>
                        </div>
                        <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold', documentStatusTone(activeDocument.status))}>
                            {formatDocumentStatus(activeDocument.status)}
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">
                                Last upload
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDateTime(activeDocument.uploadedAt)}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/40">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">
                                Next step
                            </p>
                            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                {role === 'user'
                                    ? (activeDocument.status === 'reupload_needed' ? 'Replace file' : 'Keep file ready')
                                    : (activeDocument.status === 'uploaded' ? 'Review file' : 'Keep workflow moving')}
                            </p>
                        </div>
                    </div>

                    {helperNote ? (
                        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                            {helperNote}
                        </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                        <ActionButton
                            tone="secondary"
                            onClick={() => void handleRailPreview(activeDocument)}
                            disabled={!canPreview}
                            busy={previewBusyItemId === activeDocument.id}
                            ariaLabel={`Preview ${activeDocument.label} from core files`}
                            className="px-3 py-2 text-xs"
                        >
                            <Eye size={12} />
                            Preview
                        </ActionButton>
                        <ActionButton
                            tone="secondary"
                            onClick={() => void handleRailDownload(activeDocument)}
                            disabled={!canPreview}
                            busy={previewBusyItemId === activeDocument.id}
                            ariaLabel={`Download ${activeDocument.label} from core files`}
                            className="px-3 py-2 text-xs"
                        >
                            <Download size={12} />
                            Download
                        </ActionButton>
                    </div>
                </div>
            </div>
        );
    };

    const renderActivityModule = () => {
        const activityKeyFor = createDuplicateSafeKeyResolver('fast-track-activity');

        return (
        <div className="space-y-3">
            {compactActivity.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role === 'user' ? 'Recent updates about your journey will appear here.' : 'Recent case updates will appear here.'}
                </p>
            ) : compactActivity.map((entry, entryIndex) => (
                <div
                    key={activityKeyFor(entry.id, entryIndex)}
                    className="rounded-[24px] border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950"
                >
                    <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{entry.message}</p>
                        <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                            {entry.actorRole}
                        </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{formatDateTime(entry.createdAt)}</p>
                </div>
            ))}
        </div>
        );
    };

    const renderConnectedRecordsModule = () => {
        if (!selectedCase) {
            return null;
        }

        const items = [
            ['Lead', selectedCase.leadId],
            ['Application', selectedCase.applicationId],
            ['Viewing', selectedCase.viewingId],
            ['Contract', selectedCase.contractId],
            ...(PAYMENTS_ENABLED ? [['Payment', selectedCase.paymentId]] : []),
            ['Property', selectedCase.propertyId],
        ].filter(([, value]) => Boolean(value));

        if (items.length === 0) {
            return (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role === 'user' ? 'More linked details will appear here as your journey moves forward.' : 'Linked record ids will appear here as the case progresses.'}
                </p>
            );
        }

        return (
            <div className="grid gap-3 sm:grid-cols-2">
                {items.map(([label, value]) => (
                    <div
                        key={label}
                        className="rounded-[24px] border border-gray-100 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950"
                    >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">
                            {label}
                        </p>
                        <p className="mt-2 break-all text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
                    </div>
                ))}
            </div>
        );
    };

    const renderUtilityModule = (module: FastTrackWorkspaceModule) => {
        switch (module) {
            case 'preview':
                return <div ref={previewSectionRef}>{renderDocumentPreview()}</div>;
            case 'case_chat':
                return renderCaseThread();
            case 'activity':
                return renderActivityModule();
            case 'connected_records':
                return renderConnectedRecordsModule();
            default:
                return renderCoreFilesModule();
        }
    };

    const renderSelectedStage = () => {
        if (!selectedCase) {
            return null;
        }

        return (
            <SectionShell
                title={getJourneyStageLabel('selected', selectedCase.journeyMode, role)}
                description={role === 'user'
                    ? 'This home is now linked to your guided journey.'
                    : 'This case is anchored to one property and one shared workspace.'}
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
                        {selectedCase.workspaceFinalStatus === 'active' ? (
                            <ActionButton
                                tone="danger"
                                onClick={() => setCancelCaseDialogOpen(true)}
                                busy={activeAction === 'cancel_case'}
                            >
                                Cancel case
                            </ActionButton>
                        ) : null}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300">
                        The team will open the document step here. Once that happens, you can upload what is needed on this page.
                    </div>
                )}
            </SectionShell>
        );
    };

    const renderDocumentsStage = () => {
        if (!selectedCase) {
            return null;
        }

        const uploadedCount = selectedCase.documents.items.filter(
            (item) => item.status === 'uploaded' || item.status === 'approved',
        ).length;
        const approvedCount = selectedCase.documents.items.filter(
            (item) => item.status === 'approved',
        ).length;
        const documentCardKeyFor = createDuplicateSafeKeyResolver('fast-track-document-card');

        return (
            <SectionShell
                title={getJourneyStageLabel('documents', selectedCase.journeyMode, role)}
                description={role === 'user'
                    ? 'Share the required documents here. Extra help stays under See details.'
                    : 'A compact checklist for the mandatory files. Use the dock for preview, chat, and activity.'}
            >
                <div className="mb-4 flex flex-wrap gap-2">
                    <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                        {selectedCase.documents.items.length} required
                    </div>
                    <div className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        {uploadedCount} uploaded
                    </div>
                    <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300">
                        {approvedCount} approved
                    </div>
                    <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                        {role === 'user' ? 'Open a file row to see more details.' : 'Click a file row to focus it in the dock.'}
                    </div>
                </div>

                <div className="space-y-2.5 rounded-[24px] border border-gray-100 bg-gray-50/70 p-2.5 dark:border-gray-800 dark:bg-gray-900/30">
                    {selectedCase.documents.items.map((item, itemIndex) => {
                        const canUpload = role === 'user';
                        const busyKey = `upload-${item.id}`;
                        const selectedFile = selectedFiles[item.id] || null;
                        const canPreview = Boolean(selectedFile || item.documentRecordId || item.fileUrl);
                        const uploadCopy = getFastTrackDocumentUploadCopy({
                            status: item.status,
                            hasAttachedFile: Boolean(item.documentRecordId || item.fileUrl),
                        });
                        const focused = focusedDocumentItem?.id === item.id;
                        const supportingNote = item.reviewNote || item.uploadNote || item.note || '';
                        return (
                            <div
                                key={documentCardKeyFor(item.id, itemIndex)}
                                data-fast-track-document-card={item.id}
                                className={cn(
                                    'grid gap-3 rounded-[22px] border bg-white px-3.5 py-3.5 shadow-sm transition-colors dark:bg-gray-950 lg:grid-cols-[minmax(0,1fr)_272px]',
                                    focused
                                        ? 'border-orange-300 ring-1 ring-orange-200 dark:border-orange-800 dark:ring-orange-900/40'
                                        : 'border-gray-100 dark:border-gray-800',
                                )}
                            >
                                <div className="space-y-2.5">
                                    <button
                                        type="button"
                                        onClick={() => handleDocumentFocus(item.id)}
                                        className="w-full text-left"
                                    >
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="text-[15px] font-semibold text-gray-900 dark:text-white">{item.label}</p>
                                                    {focused ? (
                                                        <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300">
                                                            In focus
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="mt-1 truncate text-[13px] text-gray-500 dark:text-gray-400">
                                                    {item.fileName || 'No file attached yet'}
                                                </p>
                                            </div>
                                            <span className={cn('rounded-full border px-3 py-1 text-[11px] font-semibold', documentStatusTone(item.status))}>
                                                {formatDocumentStatus(item.status)}
                                            </span>
                                        </div>
                                    </button>

                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                            Last upload {formatDateTime(item.uploadedAt)}
                                        </span>
                                        {item.reviewedAt ? (
                                            <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                                Reviewed {formatDateTime(item.reviewedAt)}
                                            </span>
                                        ) : null}
                                    </div>

                                    <div className={cn(
                                        'rounded-2xl border px-4 py-3 text-sm',
                                        supportingNote
                                            ? (item.status === 'reupload_needed'
                                                ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                                                : 'border-gray-100 bg-gray-50 text-gray-600 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-300')
                                            : 'border-dashed border-gray-200 bg-white text-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-500',
                                    )}>
                                        {supportingNote || (canUpload
                                            ? 'Add a file and one short upload note.'
                                            : 'Review the file, leave one short note, and move on.')}
                                    </div>
                                    {canUpload ? (
                                        <div
                                            data-fast-track-document-upload-state={item.id}
                                            className={cn(
                                                'rounded-2xl border px-4 py-3 text-sm font-medium',
                                                item.status === 'reupload_needed'
                                                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300'
                                                    : canPreview
                                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300'
                                                        : 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300',
                                            )}
                                        >
                                            {selectedFile
                                                ? `Ready to ${uploadCopy.actionLabel.toLowerCase()}: ${selectedFile.name}`
                                                : uploadCopy.statusMessage}
                                        </div>
                                    ) : null}
                                </div>

                                    <div className="rounded-[20px] border border-gray-100 bg-white/80 p-3.5 dark:border-gray-800 dark:bg-gray-950/80">
                                    <div className="flex flex-wrap gap-2">
                                        <ActionButton
                                            tone="secondary"
                                            onClick={() => void ensureDocumentPreview(item, { openInModal: true })}
                                            busy={previewBusyItemId === item.id}
                                            disabled={!canPreview}
                                            ariaLabel={`Preview ${item.label}`}
                                            className="px-3 py-2 text-xs"
                                        >
                                            <Eye size={14} />
                                            Preview
                                        </ActionButton>
                                        <ActionButton
                                            tone="secondary"
                                            onClick={() => void ensureDocumentPreview(item, { openInNewTab: true })}
                                            busy={previewBusyItemId === item.id}
                                            disabled={!canPreview}
                                            ariaLabel={`Open ${item.label}`}
                                            className="px-3 py-2 text-xs"
                                        >
                                            <ArrowUpRight size={14} />
                                            Open
                                        </ActionButton>
                                    </div>

                                    <input
                                        type="text"
                                        value={documentNotes[item.id] || ''}
                                        onChange={(event) => setDocumentNotes((previous) => ({
                                            ...previous,
                                            [item.id]: event.target.value,
                                        }))}
                                        aria-label={`Note for ${item.label}`}
                                        placeholder={canUpload ? 'Short upload note' : 'Short review note'}
                                        className="mt-3 h-11 w-full rounded-2xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                                    />

                                    {canUpload ? (
                                        <div className="mt-3 space-y-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <FastTrackDocumentFileChooser
                                                    documentId={item.id}
                                                    label={item.label}
                                                    inputRef={(node) => {
                                                        fileInputRefs.current[item.id] = node;
                                                    }}
                                                    onFileSelected={(file) => setSelectedFiles((previous) => ({
                                                        ...previous,
                                                        [item.id]: file,
                                                    }))}
                                                />
                                                <span className="min-w-0 flex-1 truncate rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                                    {selectedFile?.name || uploadCopy.chooserSummary}
                                                </span>
                                            </div>
                                            {item.status === 'reupload_needed' ? (
                                                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                                                    Replacement required. The current reviewer note stays visible until the new file is checked.
                                                </p>
                                            ) : null}
                                            <ActionButton
                                                onClick={() => void handleUploadDocument(item)}
                                                busy={activeAction === busyKey}
                                                disabled={!selectedFiles[item.id]}
                                                className="w-full"
                                            >
                                                <Upload size={16} />
                                                {uploadCopy.actionLabel}
                                            </ActionButton>
                                        </div>
                                    ) : (
                                        <div className="mt-3 flex flex-wrap gap-2">
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
                                                className="flex-1 px-3 py-2 text-xs"
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
                                                className="flex-1 px-3 py-2 text-xs"
                                            >
                                                Request replacement
                                            </ActionButton>
                                        </div>
                                    )}
                                </div>
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
                    title={getJourneyStageLabel('viewing', selectedCase.journeyMode, role)}
                    description="Check your viewing plan here or ask for one change."
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
                title={getJourneyStageLabel('viewing', selectedCase.journeyMode, role)}
                description="Schedule, reschedule, skip, or complete the viewing in this workspace."
            >
                <div className="space-y-5">
                    <div className="grid gap-5 xl:grid-cols-3">
                        <div data-fast-track-viewing-summary-card="current-slot" className="flex min-h-[160px] flex-col justify-between rounded-[24px] border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Current slot</p>
                                <p className="mt-3 text-[15px] font-semibold leading-6 text-gray-900 dark:text-white">
                                    {selectedCase.viewing.scheduledAt
                                        ? new Date(selectedCase.viewing.scheduledAt).toLocaleString('en-GB')
                                        : 'No slot set yet'}
                                </p>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                {selectedCase.viewing.note || 'Add the viewing details below.'}
                            </p>
                        </div>
                        <div data-fast-track-viewing-summary-card="user-response" className="flex min-h-[160px] flex-col justify-between rounded-[24px] border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">User response</p>
                                <p className="mt-3 text-[15px] font-semibold leading-6 text-gray-900 dark:text-white">
                                    {selectedCase.viewing.requestedChange
                                        ? 'Change requested'
                                        : selectedCase.viewing.confirmedByUser
                                            ? 'Confirmed by user'
                                            : 'Waiting for user response'}
                                </p>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                {selectedCase.viewing.requestedChange || 'No change request has been sent back yet.'}
                            </p>
                        </div>
                        <div data-fast-track-viewing-summary-card="last-change" className="flex min-h-[160px] flex-col justify-between rounded-[24px] border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-300">Last change</p>
                                <p className="mt-3 text-[15px] font-semibold leading-6 text-gray-900 dark:text-white">
                                    {formatDateTime(selectedCase.viewing.requestedChangeAt || selectedCase.viewing.scheduledAt)}
                                </p>
                            </div>
                            <p className="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
                                {selectedCase.viewing.requestedChangeAt
                                    ? 'The latest user request is visible here before you reschedule.'
                                    : 'Rescheduling updates this timeline in the same workspace.'}
                            </p>
                        </div>
                    </div>

                    <div data-fast-track-viewing-input-row="true" className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(260px,0.85fr)]">
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
                        className="h-28 w-full rounded-[24px] border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                    />

                    <div className="flex flex-wrap gap-3.5 pt-1">
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
                </div>
            </SectionShell>
        );
    };

    const renderDecisionStage = () => {
        if (!selectedCase) {
            return null;
        }

        const decisionLabel = selectedCase.journeyMode === 'sale' ? 'Offer outcome' : 'Application outcome';
        const rejectDecisionGuard = getFastTrackDecisionGuard(selectedCase, 'rejected', decisionAmount, role);
        const approveFinalDecisionGuard = getFastTrackFinalDecisionGuard(selectedCase, 'approved', decisionAmount, role);
        const rejectFinalDecisionGuard = getFastTrackFinalDecisionGuard(selectedCase, 'rejected', decisionAmount, role);
        const decisionStatus = String(selectedCase.decision.status || '').trim().toLowerCase();
        const isSaleDecision = selectedCase.journeyMode === 'sale';
        const offerReviewStarted = decisionStatus === 'under_review';
        const offerDecisionFinal = decisionStatus === 'approved' || decisionStatus === 'rejected';
        const startOfferReviewGuard = isSaleDecision ? rejectDecisionGuard : null;
        const decisionGuardMessage = approveFinalDecisionGuard || rejectFinalDecisionGuard;
        if (role === 'user') {
            return (
                <SectionShell
                    title={getJourneyStageLabel('decision', selectedCase.journeyMode, role)}
                    description={selectedCase.journeyMode === 'sale'
                        ? 'We will show your latest offer update here.'
                        : 'We will show your latest decision here.'}
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
                {decisionGuardMessage ? (
                    <div
                        role="status"
                        data-fast-track-decision-prerequisite
                        className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
                    >
                        {decisionGuardMessage}
                    </div>
                ) : null}
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
                {isSaleDecision ? (
                    <div
                        role="status"
                        data-fast-track-offer-review-status
                        className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200"
                    >
                        {offerDecisionFinal
                            ? `Offer ${decisionStatus.replace('_', ' ')}.`
                            : offerReviewStarted
                                ? 'Offer is under review.'
                                : 'Offer review has not started.'}
                    </div>
                ) : null}
                <div className="mt-5 flex flex-wrap gap-3">
                    {isSaleDecision && !offerDecisionFinal ? (
                        <ActionButton
                            tone="secondary"
                            onClick={() => void runAction(
                                'start_offer_review',
                                { note: decisionNote },
                                'Offer review started.',
                            )}
                            busy={activeAction === 'start_offer_review'}
                            disabled={Boolean(startOfferReviewGuard) || offerReviewStarted}
                            ariaLabel="Start offer review"
                        >
                            Start offer review
                        </ActionButton>
                    ) : null}
                    <ActionButton
                        onClick={() => void runAction(
                            'record_decision',
                            {
                                outcome: 'approved',
                                note: decisionNote,
                                amount: decisionAmount ? Number(decisionAmount) : undefined,
                                currency: LAUNCH_CURRENCY_CODE,
                            },
                            `${decisionLabel} approved.`,
                        )}
                        busy={activeAction === 'record_decision'}
                        disabled={Boolean(approveFinalDecisionGuard)}
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
                        disabled={Boolean(rejectFinalDecisionGuard)}
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
                    title={getJourneyStageLabel('agreement', selectedCase.journeyMode, role)}
                    description="Read and sign the agreement here."
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
                            {selectedCase.agreement.note || 'Your agreement summary stays here.'}
                        </p>
                        {PAYMENTS_ENABLED && (selectedCase.agreement.paymentStatus === 'requested' || selectedCase.agreement.paymentStatus === 'paid') ? (
                            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                Payment: {selectedCase.agreement.paymentStatus.replace(/_/g, ' ')}
                                {selectedCase.agreement.amountDue ? ` / ${formatLaunchCurrency(selectedCase.agreement.amountDue, { showCode: true })}` : ''}
                            </p>
                        ) : null}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <ActionButton
                            onClick={() => void runAction('confirm_agreement', {}, 'Agreement accepted.')}
                            busy={activeAction === 'confirm_agreement'}
                            disabled={selectedCase.agreement.status === 'accepted'}
                        >
                            Sign agreement
                        </ActionButton>
                    </div>
                </SectionShell>
            );
        }

        return (
            <SectionShell
                title="Agreement"
                description="Send the agreement and keep this case moving toward handover."
            >
                <textarea
                    value={agreementNote}
                    onChange={(event) => setAgreementNote(event.target.value)}
                    placeholder="Agreement summary"
                    className="h-28 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none placeholder:text-gray-400 focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
                />

                {PAYMENTS_ENABLED ? (
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
                ) : null}

                <div className="mt-5 flex flex-wrap gap-3">
                    <ActionButton
                        onClick={handlePublishAgreement}
                        busy={activeAction === 'publish_agreement'}
                        disabled={publishAgreementNeedsAmount}
                        title={publishAgreementNeedsAmount ? 'Enter a payment amount or turn off payment required.' : undefined}
                    >
                        Publish agreement
                    </ActionButton>
                    {PAYMENTS_ENABLED && paymentRequired ? (
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

        const decisionStatus = String(selectedCase.decision.status || '').trim().toLowerCase();
        const agreementStatus = String(selectedCase.agreement.status || '').trim().toLowerCase();
        const handoverStatus = String(selectedCase.handover.status || '').trim().toLowerCase();
        const decisionAccepted = decisionStatus === 'approved' || decisionStatus === 'accepted';
        const agreementAccepted = ['accepted', 'signed', 'completed'].includes(agreementStatus);
        const handoverCompleted = handoverStatus === 'completed';
        const handoverReady = handoverStatus === 'ready';
        const handoverPrerequisiteGuard = !decisionAccepted
            ? selectedCase.journeyMode === 'sale'
                ? 'Accept the offer before starting handover.'
                : 'Approve the application before starting handover.'
            : !agreementAccepted
                ? selectedCase.journeyMode === 'sale'
                    ? 'Finish the memorandum, solicitor conveyancing, exchange, and signed agreement steps before handover.'
                    : 'Send and confirm the agreement before handover.'
                : null;
        const completeHandoverGuard = handoverPrerequisiteGuard || (!handoverReady && !handoverCompleted
            ? 'Mark handover ready before completing it.'
            : null);

        if (role === 'user') {
            if (isFastTrackCaseCompleteForRole(selectedCase, role)) {
                return (
                    <SectionShell
                        title={getJourneyStageLabel('handover', selectedCase.journeyMode, role)}
                        description="The final handover is complete."
                    >
                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
                            <p className="text-base font-semibold">Keys received</p>
                            <p className="mt-2">
                                The keys and final handover are already confirmed. This workspace is now kept for your records.
                            </p>
                        </div>
                    </SectionShell>
                );
            }

            return (
                <SectionShell
                    title={getJourneyStageLabel('handover', selectedCase.journeyMode, role)}
                    description="Confirm when the final handover is complete."
                >
                    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                        <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {selectedCase.handover.status === 'completed' && selectedCase.handover.confirmedByUser
                                ? 'Completed'
                                : selectedCase.handover.status === 'ready' || canUserConfirmFastTrackHandover(selectedCase)
                                    ? 'Ready for your confirmation'
                                    : 'Waiting for the team'}
                        </p>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            {selectedCase.handover.note || 'Your final handover update stays here.'}
                        </p>
                    </div>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <ActionButton
                            onClick={() => void runAction('confirm_handover', {}, 'Handover confirmed.')}
                            busy={activeAction === 'confirm_handover'}
                            disabled={selectedCase.handover.confirmedByUser || !canUserConfirmFastTrackHandover(selectedCase)}
                            title={!canUserConfirmFastTrackHandover(selectedCase) ? 'The manager must mark handover ready first.' : undefined}
                        >
                            Confirm I got the keys
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
                {handoverPrerequisiteGuard ? (
                    <div
                        role="status"
                        data-fast-track-handover-prerequisite
                        className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100"
                    >
                        {handoverPrerequisiteGuard}
                    </div>
                ) : null}
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
                        disabled={Boolean(handoverPrerequisiteGuard) || handoverReady || handoverCompleted}
                        title={handoverPrerequisiteGuard || (handoverReady ? 'Handover is already ready.' : undefined)}
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
                        disabled={Boolean(completeHandoverGuard) || handoverCompleted}
                        title={completeHandoverGuard || (handoverCompleted ? 'Handover is already complete.' : undefined)}
                    >
                        Complete handover
                    </ActionButton>
                </div>
            </SectionShell>
        );
    };

    const renderManagerReviewCard = () => {
        if (!selectedCase || !isManagerReviewEligible) {
            return null;
        }

        const isApproved = managerReview?.approval_status === 'approved';
        const showForm = !isApproved && (managerReviewExpanded || !managerReview);

        return (
            <div ref={managerReviewSectionRef}>
                <SectionShell
                    title={selectedCase.workspaceFinalStatus === 'completed' ? 'Rate your manager' : 'Share feedback about your manager'}
                    description={selectedCase.workspaceFinalStatus === 'completed'
                        ? 'Your feedback helps us improve and updates the public score after admin approval.'
                        : 'You can leave feedback now or after the journey is complete.'}
                    icon={Star}
                >
                    {managerReviewLoading ? (
                        <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                            <Loader2 size={16} className="animate-spin" />
                            Loading your feedback...
                        </div>
                    ) : isApproved ? (
                        <div className="rounded-3xl border border-green-200 bg-green-50/80 p-5 dark:border-green-900/40 dark:bg-green-950/20">
                            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-700 dark:text-green-300">
                                Feedback received
                            </p>
                            <div className="mt-3 flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <Star
                                        key={value}
                                        size={18}
                                        className={value <= (managerReview?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}
                                    />
                                ))}
                            </div>
                            <p className="mt-3 text-sm text-green-900/80 dark:text-green-100/80">
                                {managerReview?.comment?.trim() || 'Your star rating has been approved.'}
                            </p>
                        </div>
                    ) : showForm ? (
                        <div className="space-y-4 rounded-3xl border border-gray-100 bg-gray-50/80 p-5 dark:border-gray-800 dark:bg-gray-900/40">
                            <div>
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">How was your manager?</p>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    Leave a 1 to 5 star rating and an optional short note.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[1, 2, 3, 4, 5].map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setManagerReviewRating(value)}
                                        className={cn(
                                            'inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition-colors',
                                            value <= managerReviewRating
                                                ? 'border-amber-200 bg-amber-50 text-amber-500 dark:border-amber-900/40 dark:bg-amber-950/30'
                                                : 'border-gray-200 bg-white text-gray-300 hover:border-amber-200 hover:text-amber-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-600 dark:hover:border-amber-900/40',
                                        )}
                                        aria-label={`Rate ${value} star${value === 1 ? '' : 's'}`}
                                    >
                                        <Star size={18} className={value <= managerReviewRating ? 'fill-current' : ''} />
                                    </button>
                                ))}
                            </div>
                            <textarea
                                value={managerReviewComment}
                                onChange={(event) => setManagerReviewComment(event.target.value.slice(0, 500))}
                                placeholder="Optional note"
                                rows={4}
                                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-200 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-orange-800 dark:focus:ring-orange-900/40"
                            />
                            {managerReviewError ? (
                                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                                    {managerReviewError}
                                </div>
                            ) : null}
                            <div className="flex flex-wrap gap-3">
                                <ActionButton onClick={() => void handleSubmitManagerReview()} busy={managerReviewSubmitting}>
                                    {managerReview ? 'Update feedback' : 'Submit feedback'}
                                </ActionButton>
                                {managerReview ? (
                                    <ActionButton
                                        tone="secondary"
                                        onClick={() => {
                                            setManagerReviewExpanded(false);
                                            setManagerReviewRating(managerReview.rating);
                                            setManagerReviewComment(managerReview.comment || '');
                                            setManagerReviewError(null);
                                        }}
                                    >
                                        Cancel
                                    </ActionButton>
                                ) : null}
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                                        Feedback submitted
                                    </p>
                                    <p className="mt-2 text-sm text-amber-900/80 dark:text-amber-100/80">
                                        Your rating is pending admin approval. You can still edit it before it is approved.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-1 rounded-full border border-amber-200 bg-white px-3 py-2 dark:border-amber-900/40 dark:bg-gray-950">
                                        {[1, 2, 3, 4, 5].map((value) => (
                                            <Star
                                                key={value}
                                                size={15}
                                                className={value <= (managerReview?.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-700'}
                                            />
                                        ))}
                                    </div>
                                    <ActionButton tone="secondary" onClick={() => setManagerReviewExpanded(true)}>
                                        Edit feedback
                                    </ActionButton>
                                </div>
                            </div>
                        </div>
                    )}
                </SectionShell>
            </div>
        );
    };

    const renderActiveStage = () => {
        if (!selectedCase) {
            return null;
        }

        switch (visibleStage) {
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

    const headerStats = useMemo(
        () => role === 'user'
            ? [
                { label: 'Live', value: stats.active },
                { label: 'Done', value: stats.completed },
                { label: 'Closed', value: stats.cancelled },
            ]
            : [
                { label: 'Active', value: stats.active },
                { label: 'Completed', value: stats.completed },
                { label: 'Cancelled', value: stats.cancelled },
            ],
        [role, stats.active, stats.cancelled, stats.completed],
    );

    const caseRailItems = useMemo(
        () => paginatedCases.map((item) => {
            const chip = formatStatusChip(item);
            return {
                caseId: item.caseId,
                title: item.propertyTitle,
                subtitle: role === 'user'
                    ? `${item.journeyMode === 'sale' ? 'Buying' : 'Renting'} this home`
                    : item.clientName,
                stageLabel: formatStageLabel(item.stage, item.journeyMode, role),
                deadlineLabel: formatDeadline(item.hoursRemaining, role),
                statusLabel: chip.label,
                statusTone: chip.tone,
                selected: selectedCaseId === item.caseId,
            };
        }),
        [paginatedCases, role, selectedCaseId],
    );

    const caseRailLayout = useMemo(
        () => resolveFastTrackCaseRailLayout({
            compactViewport: compactCaseRailViewport,
            desktopRailCollapsed: workspacePreferences.caseRailCollapsed,
            compactDrawerOpen: caseRailDrawerOpen,
        }),
        [caseRailDrawerOpen, compactCaseRailViewport, workspacePreferences.caseRailCollapsed],
    );

    const handleStageSelect = useCallback((stage: string) => {
        if (!selectedCase || !STAGES.includes(stage as FastTrackStage)) {
            return;
        }

        const nextStage = stage as FastTrackStage;
        setActiveStageOverride(nextStage === selectedCase.stage ? null : nextStage);
        setSearchParams((previous) => buildFastTrackStageSearchParams(previous, nextStage));
    }, [selectedCase, setSearchParams]);

    const handleSelectCase = useCallback((caseId: string) => {
        pendingSelectedCaseIdRef.current = caseId;
        setSelectedCaseId(caseId);
        setActiveStageOverride(null);
        setSearchParams((previous) => {
            const next = buildFastTrackSelectionSearchParams(previous, caseId);
            next.delete('section');
            next.delete('stage');
            next.delete('document');
            next.delete('file');
            next.delete('celebrate');
            return next;
        });
    }, [setSearchParams]);

    const stepperItems = useMemo(
        () => STAGES.map((stage, index) => {
            const Icon = STAGE_ICONS[stage];
            return {
                key: stage,
                label: selectedCase
                    ? formatStageLabel(stage, selectedCase.journeyMode, role)
                    : formatStageLabel(stage, 'rent', role),
                icon: <Icon size={16} />,
                active: visibleStage === stage,
                complete: selectedCase?.workspaceFinalStatus === 'completed' || stageIndex > index,
                current: selectedCase?.stage === stage,
            };
        }),
        [role, selectedCase, stageIndex, visibleStage],
    );

    const selectedCaseSubtitle = selectedCase
        ? role === 'user'
            ? `${selectedCase.journeyMode === 'sale' ? 'Buying' : 'Renting'} this home in one guided journey.`
            : `${selectedCase.clientName} / ${selectedCase.listingType === 'sale' ? 'Sale' : 'Rent'} / ${selectedCase.propertyType} / Case ${selectedCase.caseId}`
        : '';
    const workspaceStatusMessage = recoveredCaseLink
        ? DELETED_FAST_TRACK_CASE_MESSAGE
        : loading
            ? role === 'user'
                ? 'Loading your fast-track journeys.'
                : 'Loading fast-track cases.'
            : error
                ? error
                : selectedCase
                    ? `${selectedCase.propertyTitle} selected. ${workspaceStatus}`
                    : filteredCases.length === 0
                        ? role === 'user'
                            ? 'No fast-track journeys match the current filters.'
                            : 'No fast-track cases match the current filters.'
                        : `${filteredCases.length} ${role === 'user' ? 'journeys' : 'cases'} available.`;

    return (
        <div className="space-y-6 pb-16">
            <p role="status" aria-live="polite" className="sr-only" data-fast-track-workspace-status>
                {workspaceStatusMessage}
            </p>
            <FastTrackCelebrationOverlay
                active={showCompletionCelebration}
                role={role}
                title={role === 'user' ? 'Your journey is complete.' : 'Handover complete.'}
                subtitle={celebrationPropertyTitle
                    ? role === 'user'
                        ? `${celebrationPropertyTitle} is ready for your next step.`
                        : `${celebrationPropertyTitle} is fully completed and the fast-track case is now closed.`
                    : role === 'user'
                        ? 'Your 24-hour journey is complete and ready for the next step.'
                        : 'The fast-track case is fully completed and closed.'}
                footerAction={role === 'user' && isManagerReviewEligible && managerReview?.approval_status !== 'approved' ? (
                    <button
                        type="button"
                        onClick={openManagerReviewForm}
                        className="inline-flex items-center justify-center rounded-2xl border border-orange-300/30 bg-orange-400/10 px-4 py-3 text-sm font-semibold text-orange-100 transition hover:bg-orange-400/16"
                    >
                        Rate your manager
                    </button>
                ) : null}
                onComplete={() => setShowCompletionCelebration(false)}
            />
            <FastTrackWorkspaceHeader
                role={role}
                railCollapsed={caseRailLayout.headerRailCollapsed}
                showMetricsStrip={workspacePreferences.showMetricsStrip}
                stats={headerStats}
                onBack={() => navigate(WORKSPACE_HOME_PATH[role])}
                onToggleRail={handleToggleRail}
                onOpenCustomize={() => setCustomizationOpen(true)}
            />

            {recoveredCaseLink ? (
                <div
                    ref={recoveredCaseNoticeRef}
                    role="alert"
                    tabIndex={-1}
                    data-fast-track-link-recovery
                    className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100 dark:focus-visible:ring-offset-gray-950"
                >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                            <div>
                                <p className="font-semibold">Journey link recovered</p>
                                <p className="mt-1 leading-6">
                                    {DELETED_FAST_TRACK_CASE_MESSAGE} Choose an available journey below or return to your dashboard.
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setRecoveredCaseLink(null)}
                                className="inline-flex items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-100 dark:hover:bg-amber-900/40"
                            >
                                View available journeys
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate(WORKSPACE_HOME_PATH[role])}
                                className="inline-flex items-center justify-center rounded-xl bg-amber-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
                            >
                                Back to dashboard
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                </div>
            ) : null}

            {loading ? (
                <div role="status" className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 px-5 py-4 text-sm font-medium text-orange-800 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-200">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {role === 'user' ? 'Loading your fast-track journeys...' : 'Loading fast-track cases...'}
                </div>
            ) : null}

            {caseRailLayout.renderCompactDrawerRail ? (
                <div className="fixed inset-0 z-40 xl:hidden">
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
                    <div className="absolute inset-y-0 left-0 w-full max-w-sm p-4">
                        <FastTrackCaseRail
                            role={role}
                            query={query}
                            filter={filter}
                            filters={filters}
                            currentPage={currentCasePage}
                            totalPages={totalCasePages}
                            totalItems={filteredCases.length}
                            pageSize={FAST_TRACK_CASES_PAGE_SIZE}
                            paginatedCount={paginatedCases.length}
                            items={caseRailItems}
                            isLoading={loading}
                            onQueryChange={setQuery}
                            onFilterChange={setFilter}
                            onSelectCase={(caseId) => {
                                handleSelectCase(caseId);
                                setCaseRailDrawerOpen(false);
                            }}
                            onPageChange={setCurrentCasePage}
                            className="h-full overflow-y-auto"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => setCaseRailDrawerOpen(false)}
                        className="absolute inset-0 -z-10"
                        aria-label="Close case rail"
                    />
                </div>
            ) : null}

            <div
                className={cn(
                    'grid gap-4',
                    caseRailLayout.renderDesktopRail
                        ? 'xl:grid-cols-[224px_minmax(0,1fr)]'
                        : 'xl:grid-cols-[minmax(0,1fr)]',
                )}
            >
                {caseRailLayout.renderDesktopRail ? (
                    <div className="hidden xl:block">
                        <FastTrackCaseRail
                            role={role}
                            query={query}
                            filter={filter}
                            filters={filters}
                            currentPage={currentCasePage}
                            totalPages={totalCasePages}
                            totalItems={filteredCases.length}
                            pageSize={FAST_TRACK_CASES_PAGE_SIZE}
                            paginatedCount={paginatedCases.length}
                            items={caseRailItems}
                            isLoading={loading}
                            onQueryChange={setQuery}
                            onFilterChange={setFilter}
                            onSelectCase={(caseId) => {
                                handleSelectCase(caseId);
                                setCaseRailDrawerOpen(false);
                            }}
                            onPageChange={setCurrentCasePage}
                        />
                    </div>
                ) : null}

                <div className="space-y-6">
                    {selectedCase ? (
                        <>
                            <FastTrackCaseMasthead
                                role={role}
                                title={selectedCase.propertyTitle}
                                subtitle={selectedCaseSubtitle}
                                statusLabel={statusChip?.label || 'Active'}
                                statusTone={statusChip?.tone || 'border-orange-200 bg-orange-50 text-orange-700'}
                                deadlineLabel={formatDeadline(selectedCase.hoursRemaining, role)}
                                currentStage={formatStageLabel(selectedCase.stage, selectedCase.journeyMode, role)}
                                focus={workspaceFocus}
                                statusSummary={workspaceStatus}
                                onOpenCustomize={() => setCustomizationOpen(true)}
                            />

                            <FastTrackStageStepper items={stepperItems} onSelect={handleStageSelect} />

                            <div className={cn(
                                'grid gap-4',
                                role === 'user'
                                    ? 'grid-cols-1'
                                    : 'xl:grid-cols-[minmax(0,1.58fr)_minmax(260px,0.58fr)]',
                            )}>
                                <div className="space-y-6">
                                    {renderActiveStage()}
                                    {renderManagerReviewCard()}
                                </div>
                                {role === 'user' ? (
                                    <details
                                        open={userDetailsOpen}
                                        onToggle={(event) => setUserDetailsOpen(event.currentTarget.open)}
                                        className="group rounded-[28px] border border-gray-100 bg-white px-4 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
                                    >
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-gray-900 dark:text-white">
                                            <span>See details</span>
                                            <span className="text-xs font-medium text-gray-500 transition-transform group-open:rotate-180 dark:text-gray-400">
                                                v
                                            </span>
                                        </summary>
                                        <div className="mt-4">
                                            <FastTrackUtilityDock
                                                role={role}
                                                density={workspacePreferences.secondaryDensity}
                                                modules={utilityModules}
                                                activeModule={activeUtilityModule}
                                                onActiveModuleChange={setActiveUtilityModule}
                                                renderModule={renderUtilityModule}
                                            />
                                        </div>
                                    </details>
                                ) : (
                                    <div className="space-y-6">
                                        <FastTrackUtilityDock
                                            role={role}
                                            density={workspacePreferences.secondaryDensity}
                                            modules={utilityModules}
                                            activeModule={activeUtilityModule}
                                            onActiveModuleChange={setActiveUtilityModule}
                                            renderModule={renderUtilityModule}
                                        />
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="rounded-[32px] border border-dashed border-gray-300 bg-white px-6 py-20 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400">
                            <p className="font-semibold text-gray-900 dark:text-white">
                                {journeyChromeCopy.noSelectionTitle}
                            </p>
                            <p className="mt-2">
                                {journeyChromeCopy.noSelectionDescription}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {previewModalOpen ? (
                <div
                    className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/70 px-4 py-6 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-label={previewItem ? `Preview ${previewItem.label}` : 'Document preview'}
                >
                    <div className="flex max-h-full w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-950">
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-gray-800">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">Document preview</p>
                                <h2 className="mt-1 truncate text-lg font-semibold text-gray-900 dark:text-white">
                                    {previewItem?.label || 'Preview'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setPreviewModalOpen(false)}
                                className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:border-orange-300 hover:text-orange-700 dark:border-gray-800 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:text-orange-300"
                                aria-label="Close document preview"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="max-h-[calc(100vh-11rem)] overflow-y-auto px-5 py-5">
                            {renderDocumentPreview()}
                        </div>
                    </div>
                </div>
            ) : null}

            <FastTrackWorkspaceCustomizationDrawer
                role={role}
                open={customizationOpen}
                preferences={workspacePreferences}
                orderedModules={allOrderedModules}
                onClose={() => setCustomizationOpen(false)}
                onReset={handleResetWorkspacePreferences}
                onToggleMetrics={() => updateWorkspacePreferencesState((previous) => ({
                    ...previous,
                    showMetricsStrip: !previous.showMetricsStrip,
                }))}
                onToggleCaseRailCollapsed={() => updateWorkspacePreferencesState((previous) => ({
                    ...previous,
                    caseRailCollapsed: !previous.caseRailCollapsed,
                }))}
                onDensityChange={(density) => updateWorkspacePreferencesState((previous) => ({
                    ...previous,
                    secondaryDensity: density,
                }))}
                onToggleModule={handleToggleModuleVisibility}
                onMoveModule={handleMoveModule}
                onSetDefaultModule={(module) => updateWorkspacePreferencesState((previous) => ({
                    ...previous,
                    defaultActiveModule: module,
                }))}
            />

            {cancelCaseDialogOpen && selectedCase ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
                    onClick={() => {
                        if (activeAction !== 'cancel_case') {
                            setCancelCaseDialogOpen(false);
                        }
                    }}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Cancel fast-track case confirmation"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-950"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            Cancel fast-track case
                        </h2>
                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                            Cancel the fast-track case for {selectedCase.propertyTitle}? This will stop the active journey for the connected client.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setCancelCaseDialogOpen(false)}
                                disabled={activeAction === 'cancel_case'}
                                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-800 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                                Keep case
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancelCase}
                                disabled={activeAction === 'cancel_case'}
                                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {activeAction === 'cancel_case' ? 'Cancelling...' : 'Cancel case'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
