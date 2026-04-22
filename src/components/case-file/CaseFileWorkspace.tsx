"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderOpen,
  Loader2,
  Paperclip,
  Plus,
  RefreshCw,
  Shield,
  Upload,
  XCircle,
} from "lucide-react";

import {
  createCaseFileDocumentRequest,
  getCaseFile,
  linkDocumentToCaseFile,
  reviewCaseFileDocumentLink,
  unlinkCaseFileDocument,
  type CaseFile,
  type CaseFileDocument,
  type CaseFileRequest,
} from "@/services/caseFilesService";
import { openDocumentAccessUrl } from "@/services/documentAccessService";
import { uploadDocument, type UserDocument } from "@/services/leadsService";
import { useToast } from "@/contexts/ToastContext";
import DateField from "@/components/ui/DateField";
import {
  usePublishWorkspaceSync,
  useWorkflowWorkspaceRefresh,
} from "@/contexts/WorkspaceSyncContext";
import {
  buildCaseFileMutationContext,
  buildCaseFileUploadContext,
} from "@/lib/caseFileContext";
import { DELETED_FAST_TRACK_CASE_MESSAGE } from "@/lib/fastTrackCaseContext";
import { WORKSPACE_SYNC_TAGS } from "@/lib/workspaceSync";
import {
  filterReusableDocumentsForRequest,
  matchCaseFileRequestForFileName,
  inferCaseFileUploadDescriptor,
  summarizeCaseFileDocuments,
  type CaseFileUploadDescriptor,
} from "@/lib/caseFileDocuments";
import { getCaseFileWaitingCopy } from "@/lib/caseFileWorkflow";
import { resolveFastTrackLinkedJourney } from "@/lib/fastTrackLinkedJourney";
import { deriveLiveFastTrackCurrentStep } from "@/lib/fastTrackWorkflow";
import { buildWorkspacePath } from "@/lib/workspaceLinks";
import {
  caseFileTabToWorkspaceSection,
  resolveWorkspaceSection,
  workspaceSectionToCaseFileTab,
  type CaseFileTab,
  type WorkspaceSection,
} from "@/lib/liveCaseWorkspace";
import { getCaseFileSupportCopy } from "@/lib/userJourneyCopy";
import PaginationBar from "@/components/ui/PaginationBar";
import Modal from "@/components/ui/Modal";

type CaseFileRole = "manager" | "user";
type ReviewDocumentStatus = "approved" | "reupload_required" | "under_review";

interface ReviewDialogState {
  document: CaseFileDocument;
  status: ReviewDocumentStatus;
}

type BulkUploadStatus = "ready" | "uploading" | "uploaded" | "failed";

type RequestChecklistState =
  | "approved"
  | "review"
  | "uploading"
  | "queued"
  | "attention"
  | "missing";

interface BulkUploadItem {
  id: string;
  file: File;
  fileName: string;
  requestId: string;
  presetKey: string;
  linkFamily: string;
  visibility: string;
  note: string;
  status: BulkUploadStatus;
  error: string | null;
}

interface RequestChecklistItem {
  request: CaseFileRequest;
  latestDocument: CaseFileDocument | null;
  linkedDocumentCount: number;
  queueCount: number;
  state: RequestChecklistState;
  statusLabel: string;
  helper: string;
  tone: string;
}

interface CaseFileWorkspaceProps {
  role: CaseFileRole;
  caseId?: string | null;
  embedded?: boolean;
  initialTab?: CaseFileTab;
  layout?: "tabs" | "stacked";
  requestedSection?: WorkspaceSection | null;
  appearance?: "default" | "manager";
  workflowStageOverride?: string | null;
  workflowSummaryOverride?: string | null;
}

const normalizeNestedFastTrackCase = (fastTrackCase: CaseFile["fast_track_case"]) => {
  if (!fastTrackCase) {
    return null;
  }

  const source = fastTrackCase as Record<string, any>;
  return {
    ...source,
    caseId: source.caseId || source.id,
    currentStep:
      source.currentStep ||
      source.liveStage ||
      source.live_stage ||
      source.current_step ||
      "property_selected",
    finalStatus: source.finalStatus || source.final_status || "in_progress",
    journeyType: source.journeyType || source.journey_type,
    liveStage: source.liveStage || source.live_stage,
    journeyStatusReason:
      source.journeyStatusReason || source.journey_status_reason,
    documentPhase: source.documentPhase || source.document_phase,
    propertyId: source.propertyId || source.property_id,
    propertyCountry: source.propertyCountry || source.property_country,
    brokerRequestId: source.brokerRequestId || source.broker_request_id,
    leadId: source.leadId || source.lead_id,
    managerId: source.managerId || source.manager_id,
    clientId: source.clientId || source.client_id,
    propertyTitle: source.propertyTitle || source.property_title,
    propertyType: source.propertyType || source.property_type,
    listingType: source.listingType || source.listing_type,
    startedFrom: source.startedFrom || source.started_from,
    clientName: source.clientName || source.client_name,
    submittedAt: source.submittedAt || source.submitted_at,
    expiresAt: source.expiresAt || source.expires_at,
    hoursRemaining: source.hoursRemaining || source.hours_remaining || 0,
    documents: source.documents || {
      identityProof: "pending",
      addressProof: "pending",
    },
  };
};

const tabOrder: Array<{ key: CaseFileTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "tasks", label: "Tasks" },
  { key: "activity", label: "Activity" },
];

const uploadPresetOptions: Array<{
  key: string;
  label: string;
  descriptor: Pick<
    CaseFileUploadDescriptor,
    "uploadType" | "documentType" | "documentCategory"
  >;
}> = [
  {
    key: "identity",
    label: "Identity",
    descriptor: {
      uploadType: "identity",
      documentType: "government_id",
      documentCategory: "identity",
    },
  },
  {
    key: "address",
    label: "Address",
    descriptor: {
      uploadType: "address",
      documentType: "address_proof",
      documentCategory: "address",
    },
  },
  {
    key: "proof_of_funds",
    label: "Proof of funds",
    descriptor: {
      uploadType: "proof_of_funds",
      documentType: "proof_of_funds",
      documentCategory: "financial",
    },
  },
  {
    key: "employment",
    label: "Employment",
    descriptor: {
      uploadType: "employment",
      documentType: "employment_proof",
      documentCategory: "employment",
    },
  },
  {
    key: "reference",
    label: "Reference",
    descriptor: {
      uploadType: "reference",
      documentType: "reference_letter",
      documentCategory: "reference",
    },
  },
  {
    key: "transactional",
    label: "Transactional",
    descriptor: {
      uploadType: "transactional",
      documentType: "transaction_document",
      documentCategory: "transactional",
    },
  },
  {
    key: "supporting_document",
    label: "Supporting",
    descriptor: {
      uploadType: "supporting_document",
      documentType: "supporting_document",
      documentCategory: "supporting",
    },
  },
];

const statusTone = (status?: string) => {
  switch (String(status || "").trim()) {
    case "approved":
    case "completed":
    case "paid":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300";
    case "reupload_required":
    case "rejected":
    case "failed":
    case "cancelled":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300";
    case "uploaded":
    case "under_review":
    case "open":
    case "draft":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300";
    default:
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300";
  }
};

const formatLabel = (value?: string | null) => {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "Not available";
  }

  return normalized
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Date pending";
  }

  return parsed.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Date pending";
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getLatestCaseFileDocument = (documents: CaseFileDocument[] = []) =>
  [...documents].sort((left, right) => {
    const leftTime = new Date(
      left.document.created_at || left.latest_review?.created_at || 0,
    ).getTime();
    const rightTime = new Date(
      right.document.created_at || right.latest_review?.created_at || 0,
    ).getTime();
    return rightTime - leftTime;
  })[0] || null;

const buildRequestChecklistSummary = ({
  request,
  latestDocument,
  queueItems,
}: {
  request: CaseFileRequest;
  latestDocument: CaseFileDocument | null;
  queueItems: BulkUploadItem[];
}): Omit<
  RequestChecklistItem,
  "request" | "latestDocument" | "linkedDocumentCount" | "queueCount"
> => {
  const requestStatus = String(request.status || "").trim().toLowerCase();
  const documentStatus = String(latestDocument?.status || "")
    .trim()
    .toLowerCase();
  const hasUploading = queueItems.some((item) => item.status === "uploading");
  const hasQueued = queueItems.some((item) => item.status === "ready");
  const hasFailed = queueItems.some((item) => item.status === "failed");
  const hasUploaded = queueItems.some((item) => item.status === "uploaded");

  if (
    ["approved", "waived"].includes(requestStatus) ||
    documentStatus === "approved"
  ) {
    return {
      state: "approved",
      statusLabel: "Approved",
      helper: latestDocument
        ? `${latestDocument.document.file_name} is accepted for this request.`
        : "This request is already complete.",
      tone:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300",
    };
  }

  if (hasUploading) {
    return {
      state: "uploading",
      statusLabel: "Uploading now",
      helper: "Your selected file is uploading into this request right now.",
      tone:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300",
    };
  }

  if (
    hasFailed ||
    ["reupload_required", "rejected"].includes(requestStatus) ||
    ["reupload_required", "rejected"].includes(documentStatus)
  ) {
    return {
      state: "attention",
      statusLabel: hasFailed ? "Retry needed" : "Replace file",
      helper: hasFailed
        ? "One selected file failed to upload. Retry it after checking the request details."
        : latestDocument?.latest_review?.reject_reason ||
          "A replacement file is needed before this request can move forward.",
      tone:
        "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300",
    };
  }

  if (
    hasUploaded ||
    ["uploaded", "under_review", "open"].includes(documentStatus) ||
    requestStatus === "under_review" ||
    latestDocument
  ) {
    return {
      state: "review",
      statusLabel: "Waiting for review",
      helper: latestDocument
        ? `${latestDocument.document.file_name} is attached and waiting for review.`
        : "A file is linked to this request and is waiting for review.",
      tone:
        "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300",
    };
  }

  if (hasQueued) {
    return {
      state: "queued",
      statusLabel: "Ready in queue",
      helper: "A selected file is ready to upload for this request.",
      tone:
        "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300",
    };
  }

  return {
    state: "missing",
    statusLabel: "Needs upload",
    helper:
      request.description ||
      "Add this document so your journey can keep moving without delays.",
    tone:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-300",
  };
};

const canUploadAgainstRequest = (request?: CaseFileRequest | null) =>
  !["approved", "waived", "uploaded", "under_review"].includes(
    String(request?.status || "").trim(),
  );

const buildDescriptorFromPreset = (
  presetKey: string,
  request?: CaseFileRequest | null,
) => {
  const inferredDescriptor = inferCaseFileUploadDescriptor(request);
  const selectedPreset = uploadPresetOptions.find(
    (item) => item.key === presetKey,
  );

  if (!selectedPreset) {
    return inferredDescriptor;
  }

  return {
    ...inferredDescriptor,
    ...selectedPreset.descriptor,
  };
};

const buildBulkUploadNote = (
  request?: CaseFileRequest | null,
  options: { ambiguous?: boolean } = {},
) => {
  if (request?.title) {
    return `This file is lined up for ${request.title}. Review the request, type, and visibility below before uploading.`;
  }
  if (options.ambiguous) {
    return "We found more than one possible match for this filename. Pick the correct request before uploading so it lands in the right checklist item.";
  }
  return "We could not match this file to a request yet. Choose the right request below or keep it as a general case upload.";
};

const getDocumentAttributionLabel = (document: CaseFileDocument) => {
  switch (String(document.linked_by_role || "").trim()) {
    case "manager":
      return "Added by manager for the client";
    case "admin":
      return "Added by admin";
    default:
      return "Added by client";
  }
};

const buildWorkspaceLinks = (role: CaseFileRole, caseFile: CaseFile) => {
  const copy = getCaseFileSupportCopy(role);
  const shared = {
    applicationId: caseFile.application_id,
    viewingId: caseFile.viewing?.id,
    contractId: caseFile.contract_id,
    paymentId: undefined,
    invoiceId: caseFile.invoices[0]?.id,
    caseId: caseFile.case_id,
    leadId: caseFile.lead_id,
    propertyId: caseFile.property_id,
  };
  const base = role === "manager" ? "/manager" : "/user/dashboard";

  return [
    {
      label: copy.primaryLabel,
      description: copy.primaryDescription,
      path: buildWorkspacePath(`${base}/fast-track`, {
        ...shared,
        section: "overview",
      }),
    },
    {
      label: copy.secondaryLabel,
      description: copy.secondaryDescription,
      path: buildWorkspacePath(`${base}/fast-track`, {
        ...shared,
        section: "documents",
      }),
    },
  ];
};

const ActorWaitingCard = ({ caseFile }: { caseFile: CaseFile }) => {
  const summary = summarizeCaseFileDocuments(
    caseFile.documents,
    caseFile.requests,
  );
  const waitingState = getCaseFileWaitingCopy(summary, caseFile.requests);

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
        Who is waiting
      </p>
      <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
        {waitingState.waitingOn}
      </p>
      <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
        {waitingState.explanation}
      </p>
    </div>
  );
};

const activityTimelinePageSize = 6;

const CaseFileWorkspace: React.FC<CaseFileWorkspaceProps> = ({
  role,
  caseId,
  embedded = false,
  initialTab = "overview",
  layout = "tabs",
  requestedSection,
  appearance,
  workflowStageOverride,
  workflowSummaryOverride,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const resolvedCaseId = caseId || searchParams.get("case") || "";
  const resolvedAppearance =
    appearance ?? (role === "manager" ? "manager" : "default");
  const routeRequestedSection = resolveWorkspaceSection(
    requestedSection || searchParams.get("section"),
    caseFileTabToWorkspaceSection(initialTab),
  );
  const stackedLayout = layout === "stacked";
  const [activeTab, setActiveTab] = useState<CaseFileTab>(
    embedded
      ? workspaceSectionToCaseFileTab(routeRequestedSection, initialTab)
      : workspaceSectionToCaseFileTab(
          searchParams.get("tab") || searchParams.get("section"),
          initialTab,
        ),
  );
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    requirement_codes: "",
    visibility: "shared_with_user",
    link_family: "client_reusable",
    due_at: "",
  });
  const [creatingRequest, setCreatingRequest] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reviewReasonByLinkId, setReviewReasonByLinkId] = useState<
    Record<string, string>
  >({});
  const [reviewDialog, setReviewDialog] = useState<ReviewDialogState | null>(null);
  const [bulkUploadItems, setBulkUploadItems] = useState<BulkUploadItem[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const deletedCaseRedirectRef = useRef<string | null>(null);
  const sectionRefs = useRef<Record<CaseFileTab, HTMLElement | null>>({
    overview: null,
    documents: null,
    tasks: null,
    activity: null,
  });
  const publishWorkspaceSync = usePublishWorkspaceSync();
  const managerAppearance = resolvedAppearance === "manager";
  const compactManagerEmbeddedLayout = managerAppearance && embedded;
  const liveFastTrackCase = useMemo(
    () => normalizeNestedFastTrackCase(caseFile?.fast_track_case || null),
    [caseFile?.fast_track_case],
  );
  const linkedJourney = useMemo(
    () =>
      liveFastTrackCase
        ? resolveFastTrackLinkedJourney(liveFastTrackCase, {
            applications: caseFile?.application ? [caseFile.application] : [],
            viewings: caseFile?.viewing ? [caseFile.viewing] : [],
            contracts: caseFile?.contract ? [caseFile.contract] : [],
            saleProgressions: caseFile?.sale_progression
              ? [caseFile.sale_progression]
              : [],
            payments: [],
            invoices: caseFile?.invoices || [],
          })
        : null,
    [
      caseFile?.application,
      caseFile?.contract,
      caseFile?.invoices,
      caseFile?.sale_progression,
      caseFile?.viewing,
      liveFastTrackCase,
    ],
  );
  const normalizedWorkflowStage = useMemo(() => {
    if (workflowStageOverride) {
      return workflowStageOverride;
    }

    if (!liveFastTrackCase) {
      return caseFile?.workflow?.live_stage || "";
    }

    return deriveLiveFastTrackCurrentStep(
      liveFastTrackCase.currentStep,
      [],
      liveFastTrackCase.documents,
      {
        finalStatus: liveFastTrackCase.finalStatus,
        journeyType: liveFastTrackCase.journeyType,
        jurisdiction: liveFastTrackCase.jurisdiction,
        linkedJourney: linkedJourney || undefined,
        liveStage: liveFastTrackCase.liveStage,
      },
    );
  }, [
    caseFile?.workflow?.live_stage,
    linkedJourney,
    liveFastTrackCase,
    workflowStageOverride,
  ]);
  const normalizedWorkflowSummary =
    workflowSummaryOverride ||
    linkedJourney?.primarySummary ||
    liveFastTrackCase?.journeyStatusReason ||
    caseFile?.workflow?.journey_status_reason ||
    "The journey state is synced from the backend workflow.";

  const loadCaseFile = useCallback(
    async (silent: boolean = false) => {
      if (!resolvedCaseId) {
        setCaseFile(null);
        setLoading(false);
        setError("A case reference is required to open the shared case file.");
        return;
      }

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const result = await getCaseFile(resolvedCaseId);
      if (result.error) {
        const normalizedError = String(result.error).trim().toLowerCase();
        if (
          normalizedError === "case file not found" ||
          normalizedError === "fast-track case not found"
        ) {
          if (deletedCaseRedirectRef.current !== resolvedCaseId) {
            deletedCaseRedirectRef.current = resolvedCaseId;
            toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
          }

          setCaseFile(null);
          setError(null);
          setLoading(false);
          if (!embedded) {
            navigate(
              role === "manager"
                ? "/manager/fast-track"
                : "/user/dashboard/fast-track",
              { replace: true },
            );
          }
          return;
        }

        setError(result.error);
        if (!silent) {
          setLoading(false);
        }
        return;
      }

      setCaseFile(result.data);
      setError(null);
      if (!silent) {
        setLoading(false);
      }
    },
    [resolvedCaseId],
  );

  useEffect(() => {
    void loadCaseFile();
  }, [loadCaseFile]);

  useWorkflowWorkspaceRefresh({
    tags: [
      WORKSPACE_SYNC_TAGS.CASE_FILE,
      WORKSPACE_SYNC_TAGS.FAST_TRACK,
      WORKSPACE_SYNC_TAGS.APPLICATIONS,
      WORKSPACE_SYNC_TAGS.CONTRACTS,
      WORKSPACE_SYNC_TAGS.PAYMENTS,
    ],
    refresh: () => loadCaseFile(true),
    enabled: Boolean(resolvedCaseId),
  });

  useEffect(() => {
    if (embedded) {
      setActiveTab(workspaceSectionToCaseFileTab(routeRequestedSection, initialTab));
      return;
    }

    setActiveTab(
      workspaceSectionToCaseFileTab(
        searchParams.get("tab") || searchParams.get("section"),
        initialTab,
      ),
    );
  }, [embedded, initialTab, routeRequestedSection, searchParams]);

  const setTab = (tab: CaseFileTab) => {
    setActiveTab(tab);
    if (stackedLayout) {
      sectionRefs.current[tab]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

    if (embedded) {
      return;
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (resolvedCaseId) {
        next.set("case", resolvedCaseId);
      }
      next.set("tab", tab);
      next.set("section", caseFileTabToWorkspaceSection(tab));
      return next;
    });
  };

  useEffect(() => {
    if (!stackedLayout) {
      return;
    }

    const targetTab = workspaceSectionToCaseFileTab(routeRequestedSection, activeTab);
    const targetElement = sectionRefs.current[targetTab];
    if (!targetElement) {
      return;
    }

    const timeout = window.setTimeout(() => {
      targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timeout);
  }, [activeTab, routeRequestedSection, stackedLayout, caseFile?.case_id]);

  const summary = useMemo(
    () =>
      summarizeCaseFileDocuments(
        caseFile?.documents || [],
        caseFile?.requests || [],
      ),
    [caseFile],
  );
  const workspaceLinks = useMemo(
    () => (caseFile ? buildWorkspaceLinks(role, caseFile) : []),
    [caseFile, role],
  );
  const caseFileSupportCopy = useMemo(() => getCaseFileSupportCopy(role), [role]);
  const primaryWorkspaceLink = workspaceLinks[0] || null;
  const secondaryWorkspaceLinks = workspaceLinks.slice(1);
  const openRequests = useMemo(
    () =>
      (caseFile?.requests || []).filter(
        (item) =>
          !["approved", "waived", "uploaded", "under_review"].includes(
            String(item.status || "").trim(),
          ),
      ),
    [caseFile?.requests],
  );
  const waitingState = useMemo(
    () => getCaseFileWaitingCopy(summary, caseFile?.requests || []),
    [caseFile?.requests, summary],
  );
  const showSection = useCallback(
    (tab: CaseFileTab) => stackedLayout || activeTab === tab,
    [activeTab, stackedLayout],
  );
  const requestDocumentsById = useMemo(() => {
    const map = new Map<string, CaseFileDocument[]>();
    (caseFile?.documents || []).forEach((document) => {
      if (!document.request_id) {
        return;
      }
      const existing = map.get(document.request_id) || [];
      existing.push(document);
      map.set(document.request_id, existing);
    });
    return map;
  }, [caseFile?.documents]);
  const requestChecklistItems = useMemo<RequestChecklistItem[]>(() => {
    return [...(caseFile?.requests || [])]
      .map((request) => {
        const linkedDocuments = requestDocumentsById.get(request.id) || [];
        const latestDocument = getLatestCaseFileDocument(linkedDocuments);
        const queueItems = bulkUploadItems.filter(
          (item) => item.requestId === request.id,
        );
        const checklistSummary = buildRequestChecklistSummary({
          request,
          latestDocument,
          queueItems,
        });

        return {
          request,
          latestDocument,
          linkedDocumentCount: linkedDocuments.length,
          queueCount: queueItems.length,
          ...checklistSummary,
        };
      })
      .sort((left, right) => {
        const rank: Record<RequestChecklistState, number> = {
          attention: 0,
          missing: 1,
          queued: 2,
          uploading: 3,
          review: 4,
          approved: 5,
        };
        return rank[left.state] - rank[right.state];
      });
  }, [bulkUploadItems, caseFile?.requests, requestDocumentsById]);
  const requestChecklistSummary = useMemo(
    () => ({
      total: requestChecklistItems.length,
      approved: requestChecklistItems.filter((item) => item.state === "approved")
        .length,
      inFlight: requestChecklistItems.filter((item) =>
        ["review", "uploading", "queued"].includes(item.state),
      ).length,
      actionNeeded: requestChecklistItems.filter((item) =>
        ["attention", "missing"].includes(item.state),
      ).length,
    }),
    [requestChecklistItems],
  );
  const bulkUploadSummary = useMemo(
    () => ({
      total: bulkUploadItems.length,
      ready: bulkUploadItems.filter((item) => item.status === "ready").length,
      uploading: bulkUploadItems.filter((item) => item.status === "uploading")
        .length,
      uploaded: bulkUploadItems.filter((item) => item.status === "uploaded")
        .length,
      failed: bulkUploadItems.filter((item) => item.status === "failed").length,
    }),
    [bulkUploadItems],
  );
  const paginatedActivity = useMemo(() => {
    const startIndex = (activityPage - 1) * activityTimelinePageSize;
    return (caseFile?.activity || []).slice(
      startIndex,
      startIndex + activityTimelinePageSize,
    );
  }, [activityPage, caseFile?.activity]);
  const activityTotalPages = Math.max(
    1,
    Math.ceil((caseFile?.activity.length || 0) / activityTimelinePageSize),
  );

  useEffect(() => {
    setActivityPage(1);
  }, [caseFile?.case_id]);

  useEffect(() => {
    if (activityPage > activityTotalPages) {
      setActivityPage(activityTotalPages);
    }
  }, [activityPage, activityTotalPages]);

  const handleOpenDocument = async (documentId: string) => {
    const result = await openDocumentAccessUrl(documentId);
    if (result.error) {
      toast.error(result.error);
    }
  };

  const handleOpenArtifact = (url?: string) => {
    if (!url) {
      toast.error("The file is not ready to download yet.");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCreateRequest = async () => {
    if (!caseFile) {
      return;
    }
    if (!requestForm.title.trim()) {
      toast.error("Add a short title for the document request.");
      return;
    }

    setCreatingRequest(true);
    const context = buildCaseFileMutationContext(caseFile);
    const result = await createCaseFileDocumentRequest(caseFile.case_id, {
      ...context,
      title: requestForm.title.trim(),
      description: requestForm.description.trim(),
      visibility: requestForm.visibility,
      link_family: requestForm.link_family,
      requirement_codes: requestForm.requirement_codes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      due_at: requestForm.due_at
        ? new Date(requestForm.due_at).toISOString()
        : undefined,
    });
    setCreatingRequest(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Document request created.");
    publishWorkspaceSync({
      source: "mutation",
      tags: [
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.APPLICATIONS,
      ],
      reason: "Case file request created",
      ids: {
        caseId: caseFile.case_id,
        applicationId: caseFile.application_id,
        contractId: caseFile.contract_id,
        leadId: caseFile.lead_id,
        propertyId: caseFile.property_id,
      },
    });
    setRequestForm({
      title: "",
      description: "",
      requirement_codes: "",
      visibility: "shared_with_user",
      link_family: "client_reusable",
      due_at: "",
    });
    setTab("documents");
    await loadCaseFile(true);
  };

  const handleLinkReusableDocument = async (
    document: UserDocument,
    request?: CaseFileRequest | null,
  ) => {
    if (!caseFile) {
      return;
    }

    const descriptor = inferCaseFileUploadDescriptor(request);
    const context = buildCaseFileMutationContext(caseFile, request);
    const actionKey = `link:${document.id}:${request?.id || "case"}`;
    setBusyKey(actionKey);

    const result = await linkDocumentToCaseFile(caseFile.case_id, {
      ...context,
      document_id: document.id,
      request_id: request?.id,
      requirement_codes: request?.requirement_codes || [],
      link_family: request?.link_family || descriptor.linkFamily,
      visibility: request?.visibility || descriptor.visibility,
      reusable: true,
    });

    setBusyKey(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      role === "manager"
        ? "Verified file linked to the case."
        : "Verified file attached to this case.",
    );
    publishWorkspaceSync({
      source: "mutation",
      tags: [
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
      ],
      reason: "Case file document linked",
      ids: {
        caseId: caseFile.case_id,
        applicationId: caseFile.application_id,
        contractId: caseFile.contract_id,
        leadId: caseFile.lead_id,
        propertyId: caseFile.property_id,
      },
    });
    await loadCaseFile(true);
  };

  const handleUploadForRequest = async (
    request: CaseFileRequest,
    file: File,
  ) => {
    if (!caseFile) {
      return;
    }

    const descriptor = inferCaseFileUploadDescriptor(request);
    const actionKey = `upload:${request.id}`;
    setBusyKey(actionKey);

    const uploadResult = await uploadDocument(descriptor.uploadType, file, {
      ...buildCaseFileUploadContext(caseFile, request),
      requestId: request.id,
      linkFamily: request.link_family || descriptor.linkFamily,
      visibility: request.visibility || descriptor.visibility,
      requirementCodes: request.requirement_codes || [],
      documentType: descriptor.documentType,
      documentCategory: descriptor.documentCategory,
      reusable: false,
    });

    setBusyKey(null);
    if (!uploadResult.success || uploadResult.error) {
      toast.error(uploadResult.error || "Unable to upload the file right now.");
      return;
    }

    toast.success(
      role === "manager"
        ? "File uploaded on behalf of the client."
        : "File uploaded into the shared case file.",
    );
    publishWorkspaceSync({
      source: "mutation",
      tags: [
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
      ],
      reason: "Case file document uploaded",
      ids: {
        caseId: caseFile.case_id,
        applicationId: caseFile.application_id,
        contractId: caseFile.contract_id,
        leadId: caseFile.lead_id,
        propertyId: caseFile.property_id,
      },
    });
    await loadCaseFile(true);
  };

  const handleQueueBulkFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }

    const nextItems = Array.from(fileList).map((file, index) => {
      const requestMatch = matchCaseFileRequestForFileName(file.name, openRequests);
      const matchedRequest = requestMatch.request;
      const descriptor = inferCaseFileUploadDescriptor(matchedRequest);

      return {
        id: `${Date.now()}-${index}-${file.name}`,
        file,
        fileName: file.name,
        requestId: matchedRequest?.id || "",
        presetKey: descriptor.uploadType,
        linkFamily: matchedRequest?.link_family || descriptor.linkFamily,
        visibility: matchedRequest?.visibility || descriptor.visibility,
        note: buildBulkUploadNote(matchedRequest, {
          ambiguous: requestMatch.ambiguous,
        }),
        status: "ready" as BulkUploadStatus,
        error: null,
      };
    });

    setBulkUploadItems((previous) => [...previous, ...nextItems]);
    setTab("documents");
  };

  const handleBulkItemRequestChange = (itemId: string, requestId: string) => {
    const request =
      openRequests.find((candidate) => candidate.id === requestId) || null;
    const descriptor = inferCaseFileUploadDescriptor(request);

    setBulkUploadItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              requestId,
              presetKey: descriptor.uploadType,
              linkFamily: request?.link_family || descriptor.linkFamily,
              visibility: request?.visibility || descriptor.visibility,
              note: request
                ? buildBulkUploadNote(request)
                : "This file is currently set as a general case upload. Attach it to a request if you want it to satisfy a checklist item.",
              error: null,
              status: item.status === "uploaded" ? item.status : "ready",
            }
          : item,
      ),
    );
  };

  const handleBulkItemPresetChange = (itemId: string, presetKey: string) => {
    setBulkUploadItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              presetKey,
              note: item.requestId
                ? item.note
                : "This file will upload as a general case document unless you attach it to a specific request.",
              error: null,
              status: item.status === "uploaded" ? item.status : "ready",
            }
          : item,
      ),
    );
  };

  const handleBulkItemVisibilityChange = (
    itemId: string,
    visibility: string,
  ) => {
    setBulkUploadItems((previous) =>
      previous.map((item) =>
        item.id === itemId
          ? {
              ...item,
              visibility,
            }
          : item,
      ),
    );
  };

  const handleRemoveBulkItem = (itemId: string) => {
    setBulkUploadItems((previous) =>
      previous.filter((item) => item.id !== itemId),
    );
  };

  const handleUploadAllDocuments = async () => {
    if (!caseFile) {
      return;
    }

    const queuedItems = bulkUploadItems.filter(
      (item) => item.status === "ready" || item.status === "failed",
    );
    if (queuedItems.length === 0) {
      toast.info("Choose at least one file before starting the upload.");
      return;
    }

    setBulkUploading(true);
    let uploadedCount = 0;
    let failedCount = 0;

    for (const item of queuedItems) {
      const request =
        openRequests.find((candidate) => candidate.id === item.requestId) || null;
      const descriptor = buildDescriptorFromPreset(item.presetKey, request);

      setBulkUploadItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "uploading",
                error: null,
              }
            : entry,
        ),
      );

      const result = await uploadDocument(descriptor.uploadType, item.file, {
        ...buildCaseFileUploadContext(caseFile, request),
        requestId: request?.id,
        linkFamily: item.linkFamily || request?.link_family || descriptor.linkFamily,
        visibility: item.visibility || request?.visibility || descriptor.visibility,
        requirementCodes: request?.requirement_codes || [],
        documentType: descriptor.documentType,
        documentCategory: descriptor.documentCategory,
        reusable: false,
      });

      if (!result.success || result.error) {
        failedCount += 1;
        setBulkUploadItems((previous) =>
          previous.map((entry) =>
            entry.id === item.id
              ? {
                  ...entry,
                  status: "failed",
                  error:
                    result.error || "Unable to upload this file right now.",
                }
              : entry,
          ),
        );
        continue;
      }

      uploadedCount += 1;
      setBulkUploadItems((previous) =>
        previous.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "uploaded",
                error: null,
                note: request?.title
                  ? `Uploaded into ${request.title}.`
                  : "Uploaded into the shared case file.",
              }
            : entry,
        ),
      );

      publishWorkspaceSync({
        source: "mutation",
        tags: [
          WORKSPACE_SYNC_TAGS.CASE_FILE,
          WORKSPACE_SYNC_TAGS.FAST_TRACK,
          WORKSPACE_SYNC_TAGS.VERIFICATIONS,
          WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
        reason: "Case file bulk document uploaded",
        ids: {
          caseId: caseFile.case_id,
          applicationId: caseFile.application_id,
          contractId: caseFile.contract_id,
          leadId: caseFile.lead_id,
          propertyId: caseFile.property_id,
        },
      });
      await loadCaseFile(true);
    }

    setBulkUploading(false);

    if (uploadedCount > 0 && failedCount === 0) {
      toast.success(
        uploadedCount === 1
          ? "1 file uploaded into the shared case file."
          : `${uploadedCount} files uploaded into the shared case file.`,
      );
      return;
    }

    if (uploadedCount > 0 && failedCount > 0) {
      toast.warning(
        `${uploadedCount} file${uploadedCount === 1 ? "" : "s"} uploaded and ${failedCount} failed. Review the queue below and retry only the failed files.`,
      );
      return;
    }

    toast.error("None of the selected files could be uploaded.");
  };

  const handleReviewDocument = async (
    document: CaseFileDocument,
    status: ReviewDocumentStatus,
    rejectReason?: string,
  ) => {
    if (!caseFile) {
      return;
    }

    const actionKey = `review:${document.id}:${status}`;
    setBusyKey(actionKey);
    const reviewReason = (rejectReason ?? reviewReasonByLinkId[document.id] ?? "").trim();
    const result = await reviewCaseFileDocumentLink(
      caseFile.case_id,
      document.id,
      {
        status,
        reject_reason:
          status === "reupload_required"
            ? reviewReason || "Please upload a clearer or more recent copy."
            : undefined,
      },
    );
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(
      status === "approved"
        ? "Document approved."
        : status === "reupload_required"
          ? "Re-upload requested."
          : "Document moved to under review.",
    );
    publishWorkspaceSync({
      source: "mutation",
      tags: [
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
      ],
      reason: "Case file document reviewed",
      ids: {
        caseId: caseFile.case_id,
        applicationId: caseFile.application_id,
        contractId: caseFile.contract_id,
        leadId: caseFile.lead_id,
        propertyId: caseFile.property_id,
      },
    });
    setReviewDialog(null);
    await loadCaseFile(true);
  };

  const openReviewDialog = (
    document: CaseFileDocument,
    status: ReviewDocumentStatus,
  ) => {
    setReviewDialog({ document, status });
  };

  const handleUnlinkDocument = async (document: CaseFileDocument) => {
    if (!caseFile) {
      return;
    }

    const actionKey = `unlink:${document.id}`;
    setBusyKey(actionKey);
    const result = await unlinkCaseFileDocument(caseFile.case_id, document.id);
    setBusyKey(null);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Document removed from this case file.");
    publishWorkspaceSync({
      source: "mutation",
      tags: [
        WORKSPACE_SYNC_TAGS.CASE_FILE,
        WORKSPACE_SYNC_TAGS.FAST_TRACK,
        WORKSPACE_SYNC_TAGS.VERIFICATIONS,
      ],
      reason: "Case file document unlinked",
      ids: {
        caseId: caseFile.case_id,
        applicationId: caseFile.application_id,
        contractId: caseFile.contract_id,
        leadId: caseFile.lead_id,
        propertyId: caseFile.property_id,
      },
    });
    await loadCaseFile(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-3xl border border-gray-100 bg-white p-8 dark:border-zinc-800 dark:bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error || !caseFile) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
        <p className="text-base font-semibold">Shared case file unavailable</p>
        <p className="mt-2 text-sm">
          {error || "The requested case file could not be loaded."}
        </p>
      </div>
    );
  }

  const workflow = caseFile.workflow || null;
  const stackedHeroClass = managerAppearance
    ? "relative overflow-hidden rounded-[32px] border border-[#30231a] bg-[#0b0b0b] p-6 shadow-[0_28px_90px_-60px_rgba(249,115,22,0.4)]"
    : "relative overflow-hidden rounded-[32px] border border-orange-100/80 bg-gradient-to-br from-white via-orange-50/80 to-amber-50/70 p-6 shadow-[0_24px_70px_-50px_rgba(249,115,22,0.45)] dark:border-zinc-800 dark:bg-black";
  const stackedHeroButtonClass = managerAppearance
    ? "inline-flex items-center justify-center gap-2 rounded-2xl border border-[#4a3424] bg-[#151515] px-4 py-3 text-sm font-semibold text-[#f6eee8] transition-colors hover:border-orange-400/60 hover:bg-[#1a1a1a]"
    : "inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white/80 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-white dark:border-zinc-700 dark:bg-black/40 dark:text-gray-200 dark:hover:bg-zinc-900";
  const stackedHeroMetricCardClass = managerAppearance
    ? "rounded-[22px] border border-[#3a3028] bg-[#151515]/95 p-4 shadow-[0_18px_45px_-35px_rgba(0,0,0,0.95)]"
    : "rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-black/40";
  const stackedHeroMutedTextClass = managerAppearance
    ? "text-[#aea59b]"
    : "text-gray-500 dark:text-gray-400";
  const stackedInactiveTabClass = managerAppearance
    ? "border border-[#38322d] bg-[#121212] text-[#ddd4ca] hover:border-orange-400/50 hover:bg-[#191919] hover:text-white"
    : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900";
  const stackedHeroMetricsGridClass = compactManagerEmbeddedLayout
    ? "mt-5 grid gap-3 lg:grid-cols-3"
    : "mt-5 grid gap-3 sm:grid-cols-3";
  const overviewGridClass = compactManagerEmbeddedLayout
    ? "grid items-start gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]"
    : "grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1.3fr)_340px]";
  const workspaceLinksGridClass = compactManagerEmbeddedLayout
    ? "mt-4 grid gap-3 sm:grid-cols-2"
    : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1";
  const documentsPanelClass = managerAppearance
    ? "rounded-3xl border border-[#262626] bg-[#050505] p-6 shadow-[0_24px_80px_-56px_rgba(0,0,0,0.92)]"
    : "rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black";
  const documentsGridClass = managerAppearance
    ? compactManagerEmbeddedLayout
      ? "mt-6 grid items-start gap-5 2xl:grid-cols-[minmax(0,1.55fr)_320px]"
      : "mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_320px]"
    : "mt-6 grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]";
  const checklistPanelClass = managerAppearance
    ? "relative self-start overflow-hidden rounded-[28px] border border-[#35261a] bg-[#101010] p-5 shadow-[0_26px_90px_-64px_rgba(249,115,22,0.55)]"
    : "self-start rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50/70 via-white to-white p-5 dark:border-orange-900/20 dark:bg-zinc-900/40";
  const checklistBadgeClass = managerAppearance
    ? "inline-flex max-w-full shrink-0 items-center rounded-2xl border border-orange-500/25 bg-orange-500/10 px-4 py-3 text-sm font-semibold leading-5 text-orange-200 shadow-[0_16px_40px_-30px_rgba(249,115,22,0.8)]"
    : "inline-flex items-center rounded-full border border-orange-200 bg-white px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm dark:border-orange-900/30 dark:bg-black/40 dark:text-orange-300";
  const checklistEmptyClass = managerAppearance
    ? "mt-5 rounded-2xl border border-dashed border-[#4a3f35] bg-[#171717]/90 px-4 py-5 text-sm leading-6 text-[#b7aea5]"
    : "mt-5 rounded-2xl border border-dashed border-gray-200 bg-white/80 px-4 py-5 text-sm text-gray-500 dark:border-zinc-700 dark:bg-black/20 dark:text-gray-400";
  const checklistHeaderClass = compactManagerEmbeddedLayout
    ? "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"
    : "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between";
  const checklistItemsGridClass = compactManagerEmbeddedLayout
    ? "mt-5 grid gap-3 xl:grid-cols-2"
    : "mt-5 grid gap-3 md:grid-cols-2";
  const progressPanelClass = managerAppearance
    ? "self-start rounded-[28px] border border-[#252525] bg-[#0c0c0c] p-5 shadow-[0_18px_60px_-44px_rgba(0,0,0,0.92)]"
    : "self-start rounded-[28px] border border-gray-100 bg-gray-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/40";
  const progressStatCardClass = managerAppearance
    ? "rounded-2xl border border-[#252525] bg-[#111111] p-4"
    : "rounded-2xl border border-white/80 bg-white/90 p-4 dark:border-zinc-700 dark:bg-black/30";
  const progressStatsGridClass = compactManagerEmbeddedLayout
    ? "mt-4 grid gap-3 sm:grid-cols-3"
    : "mt-4 grid gap-3";
  const progressGuideClass = managerAppearance
    ? "mt-4 rounded-2xl border border-[#3a2d22] bg-[#13110f] p-4"
    : "mt-4 rounded-2xl border border-orange-100 bg-white/90 p-4 dark:border-orange-900/20 dark:bg-black/30";
  const queueSummaryClass = managerAppearance
    ? "rounded-[26px] border border-[#252525] bg-[#0d0d0d] p-5 shadow-[0_16px_50px_-36px_rgba(0,0,0,0.95)]"
    : "rounded-[26px] border border-gray-100 bg-gray-50/80 p-5 dark:border-zinc-800 dark:bg-zinc-900/30";
  const queueSummaryMetricClass = managerAppearance
    ? "rounded-2xl border border-[#2c2c2c] bg-[#141414] px-4 py-3 text-sm font-semibold text-[#e7ddd3]"
    : "rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-zinc-700 dark:bg-black/30 dark:text-gray-200";
  const queueItemClass = managerAppearance
    ? "rounded-[26px] border border-[#252525] bg-[#0a0a0a] p-5 shadow-[0_18px_54px_-40px_rgba(0,0,0,0.95)]"
    : "rounded-[26px] border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black/30";
  const queueMetaCardClass = managerAppearance
    ? "rounded-2xl border border-[#242424] bg-[#121212] px-4 py-3"
    : "rounded-2xl border border-gray-100 bg-gray-50/80 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/50";
  const reviewDialogBusyKey = reviewDialog
    ? `review:${reviewDialog.document.id}:${reviewDialog.status}`
    : null;
  const reviewDialogTitle =
    reviewDialog?.status === "approved"
      ? "Approve document"
      : reviewDialog?.status === "reupload_required"
        ? "Request re-upload"
        : "Mark under review";
  const reviewDialogDescription =
    reviewDialog?.status === "approved"
      ? "Confirm that this document is good to go and move it out of the manager review queue."
      : reviewDialog?.status === "reupload_required"
        ? "Ask the client to upload a clearer or more recent copy. The feedback you enter here will be sent back with the request."
        : "Move this document into under review so it stays visible in the case timeline without being approved yet.";
  const reviewDialogConfirmLabel =
    reviewDialog?.status === "approved"
      ? "Approve"
      : reviewDialog?.status === "reupload_required"
        ? "Request re-upload"
        : "Mark under review";
  const reviewDialogConfirmClassName =
    reviewDialog?.status === "approved"
      ? "bg-emerald-600 text-white hover:bg-emerald-700"
      : reviewDialog?.status === "reupload_required"
        ? "border border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-950/20"
        : "border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-950/20";
  const checklistBadgeCopy =
    requestChecklistItems.length === 0
      ? "No open requests yet"
      : requestChecklistSummary.actionNeeded > 0
        ? `${requestChecklistSummary.actionNeeded} item${requestChecklistSummary.actionNeeded === 1 ? "" : "s"} waiting on upload`
        : requestChecklistSummary.inFlight > 0
          ? `${requestChecklistSummary.inFlight} item${requestChecklistSummary.inFlight === 1 ? "" : "s"} in review`
          : "Everything is uploaded or approved";

  return (
    <div className={embedded ? "space-y-6" : "space-y-8"}>
      {embedded && stackedLayout ? (
        <section className={stackedHeroClass}>
          <div
            className={
              managerAppearance
                ? "pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-orange-500/18 via-amber-400/8 to-transparent"
                : "pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-orange-200/40 blur-3xl dark:hidden"
            }
          />
          <div
            className={
              managerAppearance
                ? "pointer-events-none absolute -right-10 top-4 h-36 w-36 rounded-full bg-orange-500/12 blur-3xl"
                : "pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-blue-100/50 blur-3xl dark:hidden"
            }
          />
          {managerAppearance ? (
            <div className="pointer-events-none absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-amber-400/10 blur-3xl" />
          ) : null}
          <div className="relative">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                {role === "user" ? "Your 24-hour journey" : "Shared live workspace"}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {caseFile.property_title || (role === "user" ? "Your records" : "Live case")}
              </h2>
              <p className={`mt-2 text-sm ${stackedHeroMutedTextClass}`}>
                {role === "user"
                  ? `${formatLabel(caseFile.listing_type)} journey`
                  : `Case ${caseFile.case_id} - ${formatLabel(caseFile.listing_type)} journey`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCaseFile()}
              className={stackedHeroButtonClass}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className={stackedHeroMetricsGridClass}>
            <div className={stackedHeroMetricCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                {role === "user" ? "Where you are now" : "Live stage"}
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {formatLabel(normalizedWorkflowStage)}
              </p>
            </div>
            <div className={stackedHeroMetricCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                {role === "user" ? "Open document requests" : "Open requests"}
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {summary.openRequestCount}
              </p>
            </div>
            <div className={stackedHeroMetricCardClass}>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Waiting on
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                {waitingState.waitingOn}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            {tabOrder.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === item.key
                    ? "bg-orange-500 text-white"
                    : stackedInactiveTabClass
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          </div>
        </section>
      ) : null}

      {!embedded ? (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                {role === "user" ? "Your records" : "Shared case file"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {caseFile.property_title || (role === "user" ? "Your records" : "Live case")}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {role === "user"
                  ? `${formatLabel(caseFile.listing_type)} journey records`
                  : <>Case {caseFile.case_id} - {formatLabel(caseFile.listing_type)}{" "}journey</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadCaseFile()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                {role === "user" ? "Where you are now" : "Live stage"}
              </p>
              <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                {formatLabel(normalizedWorkflowStage)}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {normalizedWorkflowSummary}
              </p>
            </div>
            <ActorWaitingCard caseFile={caseFile} />
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                {role === "user" ? "Open document requests" : "Open requests"}
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.openRequestCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {summary.pendingReviewCount} document
                {summary.pendingReviewCount === 1 ? "" : "s"} waiting for review
                and {summary.reuploadCount} needing an update.
              </p>
            </div>
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Approved documents
              </p>
              <p className="mt-3 text-3xl font-semibold text-gray-900 dark:text-white">
                {summary.approvedCount}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {role === "user"
                  ? "Your documents and record history stay attached here through the whole journey."
                  : <>Client-facing files and journey artifacts stay attached to this case through the whole flow.</>}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {tabOrder.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === item.key
                    ? "bg-orange-500 text-white"
                    : "border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showSection("overview") ? (
        <section
          ref={(node) => {
            sectionRefs.current.overview = node;
          }}
          className="space-y-6"
        >
          <div className={overviewGridClass}>
            <div className="space-y-6">
              {(workflow?.blockers || []).length > 0 ? (
                <div className="rounded-3xl border border-orange-200 bg-orange-50 p-6 dark:border-orange-900/30 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Active blockers</h2>
                  </div>
                  <div className="mt-4 space-y-3">
                    {(workflow?.blockers || []).map((blocker) => (
                      <div
                        key={blocker.code}
                        className="rounded-2xl border border-orange-200 bg-white p-4 dark:border-orange-900/30 dark:bg-black"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {blocker.title}
                        </p>
                        {blocker.description ? (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {blocker.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">
                      No active blockers
                    </h2>
                  </div>
                  <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-200">
                    {caseFileSupportCopy.noBlockersDescription}
                  </p>
                </div>
              )}

              {primaryWorkspaceLink ? (
                <div
                  className="rounded-3xl border border-orange-200 bg-[linear-gradient(135deg,rgba(255,247,237,1)_0%,rgba(255,255,255,1)_55%)] p-6 shadow-sm dark:border-orange-900/30 dark:bg-[linear-gradient(135deg,rgba(124,45,18,0.24)_0%,rgba(9,9,11,1)_60%)]"
                  data-case-file-live-workflow
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                    {role === "user" ? "Continue your journey" : "Live workflow"}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                    {caseFileSupportCopy.supportTitle}
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                    {caseFileSupportCopy.supportDescription}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => navigate(primaryWorkspaceLink.path)}
                      data-case-file-live-workflow-primary
                      className="inline-flex items-center gap-2 rounded-2xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                    >
                      {primaryWorkspaceLink.label}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    {secondaryWorkspaceLinks.map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => navigate(item.path)}
                        data-case-file-live-workflow-secondary={item.label}
                        className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:bg-black dark:text-gray-200 dark:hover:bg-zinc-900"
                      >
                        {item.label}
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {(workflow?.deadlines || []).length > 0 ? (
                <div className="rounded-3xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-900/30 dark:bg-blue-950/20">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Clock3 className="h-5 w-5" />
                    <h2 className="text-lg font-semibold">Deadlines</h2>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {(workflow?.deadlines || []).map((deadline) => (
                      <div
                        key={deadline.code}
                        className="rounded-2xl border border-blue-200 bg-white p-4 dark:border-blue-900/30 dark:bg-black"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {deadline.label}
                        </p>
                        <p className="mt-2 text-sm text-blue-700 dark:text-blue-200">
                          {formatDate(deadline.due_at)}
                        </p>
                        {deadline.description ? (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {deadline.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {caseFile.property_compliance_readiness ? (
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
                  <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                    <Shield className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold">
                      Property readiness
                    </h2>
                  </div>
                  <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                    {formatLabel(caseFile.property_compliance_readiness.status)}
                  </p>
                  {caseFile.property_compliance_readiness.status_reason ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {caseFile.property_compliance_readiness.status_reason}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <FolderOpen className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">{caseFileSupportCopy.quickLinksTitle}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {caseFileSupportCopy.quickLinksDescription}
              </p>
              <div className={workspaceLinksGridClass} data-case-file-quick-links>
                {workspaceLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    data-case-file-quick-link={item.label}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <div>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.label}
                      </span>
                      {"description" in item && item.description ? (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {showSection("documents") ? (
        <section
          ref={(node) => {
            sectionRefs.current.documents = node;
          }}
          className="space-y-6"
        >
          <div className={documentsPanelClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                  <Upload className="h-5 w-5 text-orange-500" />
                  <h2 className="text-lg font-semibold">Upload all documents</h2>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {role === "user"
                    ? "Choose your files once, confirm where each one belongs, and upload them here without bouncing between pages."
                    : "Choose your files once, confirm where each one belongs, and upload them into the same live case without bouncing between pages."}
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    handleQueueBulkFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <Upload className="h-4 w-4" />
                Choose files
              </label>
            </div>

            <div className={documentsGridClass}>
              <div className={checklistPanelClass}>
                {managerAppearance ? (
                  <>
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-orange-500/16 via-amber-400/6 to-transparent" />
                    <div className="pointer-events-none absolute -right-10 top-8 h-28 w-28 rounded-full bg-orange-500/10 blur-3xl" />
                  </>
                ) : null}
                <div className="relative">
                <div className={checklistHeaderClass}>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                      Upload checklist
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                      {role === "user" ? "What you still need to upload" : "What this case still needs"}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                      Each request below shows whether the document is still missing, already uploaded, under review, or approved with a clear tick.
                    </p>
                  </div>
                  <div className={checklistBadgeClass}>
                    {checklistBadgeCopy}
                  </div>
                </div>

                {requestChecklistItems.length > 0 ? (
                  <div className={checklistItemsGridClass}>
                    {requestChecklistItems.map((item) => {
                      const cardTone =
                        item.state === "approved"
                          ? "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/30 dark:bg-emerald-950/10"
                          : item.state === "review" || item.state === "uploading"
                            ? "border-blue-200 bg-blue-50/70 dark:border-blue-900/30 dark:bg-blue-950/10"
                            : item.state === "attention"
                              ? "border-red-200 bg-red-50/70 dark:border-red-900/30 dark:bg-red-950/10"
                              : "border-orange-200 bg-orange-50/70 dark:border-orange-900/30 dark:bg-orange-950/10";

                      return (
                        <div
                          key={item.request.id}
                          className={`rounded-[26px] border p-4 ${cardTone}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${item.tone}`}
                              >
                                {item.state === "approved" ? (
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                ) : item.state === "uploading" ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : item.state === "review" ? (
                                  <Clock3 className="h-3.5 w-3.5" />
                                ) : item.state === "attention" ? (
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5" />
                                )}
                                {item.statusLabel}
                              </div>
                              <p className="mt-3 text-base font-semibold text-gray-900 dark:text-white">
                                {item.request.title}
                              </p>
                              <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                                {item.helper}
                              </p>
                            </div>
                            {item.state === "approved" ? (
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300">
                                <CheckCircle2 className="h-5 w-5" />
                              </div>
                            ) : null}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.request.requirement_codes.map((code) => (
                              <span
                                key={code}
                                className="rounded-full border border-white/80 bg-white/80 px-3 py-1 text-[11px] font-semibold text-gray-600 dark:border-zinc-700 dark:bg-black/30 dark:text-gray-300"
                              >
                                {formatLabel(code)}
                              </span>
                            ))}
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-zinc-700 dark:bg-black/30">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                                Due
                              </p>
                              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                {formatDate(item.request.due_at)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-white/80 bg-white/80 px-3 py-3 dark:border-zinc-700 dark:bg-black/30">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                                File status
                              </p>
                              <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                                {item.linkedDocumentCount > 0
                                  ? `${item.linkedDocumentCount} linked`
                                  : item.queueCount > 0
                                    ? `${item.queueCount} selected`
                                    : "No file linked yet"}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={checklistEmptyClass}>
                    {role === "user"
                      ? "No document requests are open yet. As soon as the team asks for something, this checklist will show exactly what to upload and whether it has been approved."
                      : "No case-file requests are open yet. As soon as a manager or workflow asks for documents, this checklist will show exactly what to upload and whether it has been approved."}
                  </div>
                )}
                </div>
              </div>

              <div className={progressPanelClass}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                  Progress at a glance
                </p>
                <div className={progressStatsGridClass}>
                  <div className={progressStatCardClass}>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Approved
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                      {requestChecklistSummary.approved}
                    </p>
                  </div>
                  <div className={progressStatCardClass}>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      In motion
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                      {requestChecklistSummary.inFlight}
                    </p>
                  </div>
                  <div className={progressStatCardClass}>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Still waiting
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                      {requestChecklistSummary.actionNeeded}
                    </p>
                  </div>
                </div>

                <div className={progressGuideClass}>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    How to use this uploader
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                    <p>1. Choose one or more PDFs or images.</p>
                    <p>2. Check that each file is attached to the right request.</p>
                    <p>3. Upload everything together and watch the checklist switch to review or approved.</p>
                  </div>
                </div>
              </div>
            </div>

            {bulkUploadItems.length > 0 ? (
              <div className="mt-5 space-y-3">
                <div className={queueSummaryClass}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                        Selected files
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                        Review each file before upload
                      </h3>
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        The queue below shows where each file will go, what document type it will use, and whether it has already uploaded successfully.
                      </p>
                    </div>
                    <div className={queueSummaryMetricClass}>
                      {bulkUploadSummary.uploaded} of {bulkUploadSummary.total} uploaded
                    </div>
                  </div>

                  <div className={`mt-4 overflow-hidden rounded-full shadow-inner ${managerAppearance ? "bg-[#171717]" : "bg-white dark:bg-zinc-800"}`}>
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                      style={{
                        width: `${
                          bulkUploadSummary.total > 0
                            ? Math.round(
                                (bulkUploadSummary.uploaded /
                                  bulkUploadSummary.total) *
                                  100,
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300">
                      {bulkUploadSummary.ready} ready
                    </span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300">
                      {bulkUploadSummary.uploading} uploading
                    </span>
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300">
                      {bulkUploadSummary.uploaded} uploaded
                    </span>
                    <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                      {bulkUploadSummary.failed} need retry
                    </span>
                  </div>
                </div>

                {bulkUploadItems.map((item) => {
                  const selectedRequest =
                    caseFile.requests.find((request) => request.id === item.requestId) ||
                    null;
                  const selectedPreset =
                    uploadPresetOptions.find((option) => option.key === item.presetKey) ||
                    null;
                  const itemStatusTone =
                    item.status === "uploaded"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-300"
                      : item.status === "failed"
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300"
                        : item.status === "uploading"
                          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-300"
                          : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/30 dark:bg-orange-950/20 dark:text-orange-300";

                  return (
                    <div
                      key={item.id}
                      className={queueItemClass}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
                              {item.fileName}
                            </p>
                            <span
                              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${itemStatusTone}`}
                            >
                              {item.status === "uploading" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : item.status === "uploaded" ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              ) : item.status === "failed" ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              {item.status === "uploaded"
                                ? "Uploaded"
                                : item.status === "failed"
                                  ? "Needs retry"
                                  : item.status === "uploading"
                                    ? "Uploading"
                                    : "Ready"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {item.note}
                          </p>
                          {item.error ? (
                            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                              {item.error}
                            </div>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBulkItem(item.id)}
                          disabled={bulkUploading || item.status === "uploading"}
                          className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                        >
                          <XCircle className="h-4 w-4" />
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 grid gap-3 xl:grid-cols-3">
                        <div className={queueMetaCardClass}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                            Request
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedRequest?.title || "General case upload"}
                          </p>
                        </div>
                        <div className={queueMetaCardClass}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                            Document type
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedPreset?.label || formatLabel(item.presetKey)}
                          </p>
                        </div>
                        <div className={queueMetaCardClass}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                            Visibility
                          </p>
                          <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
                            {formatLabel(item.visibility)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 xl:grid-cols-3">
                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Attach to request
                          </span>
                          <select
                            value={item.requestId}
                            disabled={item.status === "uploaded" || item.status === "uploading"}
                            onChange={(event) =>
                              handleBulkItemRequestChange(item.id, event.target.value)
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-black dark:text-white"
                          >
                            <option value="">General case upload</option>
                            {openRequests.map((request) => (
                              <option key={request.id} value={request.id}>
                                {request.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Document type
                          </span>
                          <select
                            value={item.presetKey}
                            disabled={item.status === "uploaded" || item.status === "uploading"}
                            onChange={(event) =>
                              handleBulkItemPresetChange(item.id, event.target.value)
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-black dark:text-white"
                          >
                            {uploadPresetOptions.map((option) => (
                              <option key={option.key} value={option.key}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="space-y-2 text-sm">
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            Visibility
                          </span>
                          <select
                            value={item.visibility}
                            disabled={item.status === "uploaded" || item.status === "uploading"}
                            onChange={(event) =>
                              handleBulkItemVisibilityChange(item.id, event.target.value)
                            }
                            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-gray-900 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-black dark:text-white"
                          >
                            <option value="shared_with_user">Shared with user</option>
                            <option value="manager_only">Manager only</option>
                            <option value="admin_only">Admin only</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  );
                })}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => void handleUploadAllDocuments()}
                    disabled={bulkUploading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload all documents
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkUploadItems([])}
                    disabled={bulkUploading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                  >
                    Clear queue
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5 text-sm text-gray-500 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-gray-400">
                {requestChecklistSummary.actionNeeded > 0
                  ? "No files selected yet. Choose files for the checklist items marked Needs upload or Replace file."
                  : "No files selected yet. Add PDFs or images whenever the manager asks for new or replacement documents."}
              </div>
            )}
          </div>

          {role === "manager" ? (
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <Plus className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Request a document</h2>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Create a checklist item here once and keep the review, approval,
                and audit trail attached to the same case.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Title
                  </span>
                  <input
                    type="text"
                    value={requestForm.title}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    placeholder="Proof of funds / MIP"
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Requirement codes
                  </span>
                  <input
                    type="text"
                    value={requestForm.requirement_codes}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        requirement_codes: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    placeholder="proof_of_funds,mortgage_in_principle"
                  />
                </label>
                <label className="space-y-2 text-sm md:col-span-2">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </span>
                  <textarea
                    rows={3}
                    value={requestForm.description}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                    placeholder="Explain exactly what the client should upload and why it is needed."
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Visibility
                  </span>
                  <select
                    value={requestForm.visibility}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        visibility: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="shared_with_user">Shared with user</option>
                    <option value="manager_only">Manager only</option>
                    <option value="admin_only">Admin only</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Document family
                  </span>
                  <select
                    value={requestForm.link_family}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        link_family: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  >
                    <option value="client_reusable">Client reusable</option>
                    <option value="case_transactional">
                      Case transactional
                    </option>
                    <option value="property_compliance">
                      Property compliance
                    </option>
                    <option value="manager_org">Manager organisation</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    Due date
                  </span>
                  <DateField
                    value={requestForm.due_at}
                    onChange={(nextValue) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        due_at: nextValue,
                      }))
                    }
                    className="w-full"
                    buttonClassName="bg-gray-50 dark:bg-zinc-900"
                    ariaLabel="Case file request due date"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void handleCreateRequest()}
                disabled={creatingRequest}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingRequest ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Add request
              </button>
            </div>
          ) : null}

          {openRequests.length > 0 ? (
            <div className="space-y-4">
              {openRequests.map((request) => {
                const suggestedReusableDocuments =
                  filterReusableDocumentsForRequest(
                    caseFile.available_reusable_documents,
                    request,
                  );
                return (
                  <div
                    key={request.id}
                    className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div
                          className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(request.status)}`}
                        >
                          {formatLabel(request.status)}
                        </div>
                        <h2 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                          {request.title}
                        </h2>
                        {request.description ? (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {request.description}
                          </p>
                        ) : null}
                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.requirement_codes.map((code) => (
                            <span
                              key={code}
                              className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-zinc-700 dark:text-gray-300"
                            >
                              {formatLabel(code)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <p>Due: {formatDate(request.due_at)}</p>
                        <p className="mt-1">
                          Visibility: {formatLabel(request.visibility)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {role === "manager"
                            ? "Suggested reusable files"
                            : "Your verified files that can be reused here"}
                        </p>
                        <div className="mt-3 space-y-3">
                          {suggestedReusableDocuments.length > 0 ? (
                            suggestedReusableDocuments.map((document) => {
                              const actionKey = `link:${document.id}:${request.id}`;
                              return (
                                <div
                                  key={document.id}
                                  className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-black"
                                >
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                      {document.file_name}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                      {formatLabel(document.document_category)}{" "}
                                      - {formatLabel(document.status)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleLinkReusableDocument(
                                        document,
                                        request,
                                      )
                                    }
                                    disabled={busyKey === actionKey}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                                  >
                                    {busyKey === actionKey ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Paperclip className="h-4 w-4" />
                                    )}
                                    {role === "manager"
                                      ? "Link file"
                                      : "Use this file"}
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              No verified reusable file matches this request
                              yet.
                            </p>
                          )}
                        </div>
                      </div>

                      {(role === "user" || role === "manager") &&
                      canUploadAgainstRequest(request) ? (
                        <label className="flex cursor-pointer flex-col justify-between rounded-2xl border border-dashed border-orange-300 bg-orange-50 p-4 transition hover:border-orange-400 hover:bg-orange-100/60 dark:border-orange-900/40 dark:bg-orange-950/20 dark:hover:bg-orange-950/30">
                          <input
                            type="file"
                            accept="image/*,.pdf"
                            className="hidden"
                            onChange={async (event) => {
                              const file = event.target.files?.[0];
                              event.currentTarget.value = "";
                              if (!file) {
                                return;
                              }
                              await handleUploadForRequest(request, file);
                            }}
                          />
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {role === "manager"
                                ? "Upload on behalf of client"
                                : "Upload a fresh file"}
                            </p>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                              {role === "manager"
                                ? "Add the file for the client here. It will stay in the same shared case-file workflow and still wait for review."
                                : "This upload will be linked to this case only and reviewed in the same workflow."}
                            </p>
                          </div>
                          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-300">
                            {busyKey === `upload:${request.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {role === "manager"
                              ? "Upload for client"
                              : "Upload for this request"}
                          </div>
                        </label>
                      ) : (
                        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            Request status
                          </p>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {role === "manager"
                              ? "This request is already satisfied or in review. Use the document controls below to approve it, request a replacement, or remove the link."
                              : "The manager will review the linked or uploaded file directly from this shared case file."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FileCheck2 className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Linked case documents</h2>
            </div>
            <div className="mt-4 space-y-4">
              {caseFile.documents.length > 0 ? (
                caseFile.documents.map((document) => {
                  return (
                    <div
                      key={document.id}
                      className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-semibold text-gray-900 dark:text-white">
                              {document.document.file_name}
                            </p>
                            <span
                              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(document.status)}`}
                            >
                              {formatLabel(document.status)}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {formatLabel(document.document.document_category)} -{" "}
                            {formatLabel(document.visibility)} - Linked{" "}
                            {formatDateTime(document.document.created_at)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            {getDocumentAttributionLabel(document)}
                          </p>
                          {document.requirement_codes.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {document.requirement_codes.map((code) => (
                                <span
                                  key={code}
                                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:border-zinc-700 dark:text-gray-300"
                                >
                                  {formatLabel(code)}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {document.latest_review?.reject_reason ? (
                            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                              {document.latest_review.reject_reason}
                            </div>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleOpenDocument(document.document_id)
                            }
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </button>
                          {document.can_download ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleOpenDocument(document.document_id)
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {role === "manager" ? (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openReviewDialog(document, "approved")}
                            disabled={busyKey === `review:${document.id}:approved`}
                            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {busyKey === `review:${document.id}:approved` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => openReviewDialog(document, "reupload_required")}
                            disabled={busyKey === `review:${document.id}:reupload_required`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-950/20"
                          >
                            {busyKey === `review:${document.id}:reupload_required` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4" />
                            )}
                            Request re-upload
                          </button>
                          <button
                            type="button"
                            onClick={() => openReviewDialog(document, "under_review")}
                            disabled={busyKey === `review:${document.id}:under_review`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                          >
                            {busyKey === `review:${document.id}:under_review` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Clock3 className="h-4 w-4" />
                            )}
                            Mark under review
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleUnlinkDocument(document)
                            }
                            disabled={busyKey === `unlink:${document.id}`}
                            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                          >
                            {busyKey === `unlink:${document.id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Paperclip className="h-4 w-4" />
                            )}
                            Remove link
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No documents are linked to this case yet.
                </p>
              )}
            </div>
          </div>

          <Modal
            isOpen={Boolean(reviewDialog)}
            onClose={() => setReviewDialog(null)}
            title={reviewDialogTitle}
            size="lg"
            closeOnBackdrop={busyKey !== reviewDialogBusyKey}
            footer={
              reviewDialog ? (
                <div className="flex flex-wrap items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewDialog(null)}
                    className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!reviewDialog) {
                        return;
                      }

                      void handleReviewDocument(
                        reviewDialog.document,
                        reviewDialog.status,
                        reviewDialog.status === "reupload_required"
                          ? reviewReasonByLinkId[reviewDialog.document.id]
                          : undefined,
                      );
                    }}
                    disabled={busyKey === reviewDialogBusyKey}
                    className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${reviewDialogConfirmClassName}`}
                  >
                    {busyKey === reviewDialogBusyKey ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : reviewDialog.status === "approved" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : reviewDialog.status === "reupload_required" ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <Clock3 className="h-4 w-4" />
                    )}
                    {reviewDialogConfirmLabel}
                  </button>
                </div>
              ) : null
            }
          >
            {reviewDialog ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
                    Document
                  </p>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {reviewDialog.document.document.file_name}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatLabel(reviewDialog.document.document.document_category)} -{" "}
                    {formatLabel(reviewDialog.document.visibility)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Linked {formatDateTime(reviewDialog.document.document.created_at)}
                  </p>
                </div>
                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                  {reviewDialogDescription}
                </p>
                {reviewDialog.status === "reupload_required" ? (
                  <label className="block space-y-2 text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Manager feedback
                    </span>
                    <textarea
                      rows={4}
                      value={reviewReasonByLinkId[reviewDialog.document.id] || ""}
                      onChange={(event) =>
                        setReviewReasonByLinkId((previous) => ({
                          ...previous,
                          [reviewDialog.document.id]: event.target.value,
                        }))
                      }
                      className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                      placeholder="Add guidance if the client needs to re-upload."
                      autoFocus
                    />
                  </label>
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                    No feedback note is needed for this action.
                  </div>
                )}
                {reviewDialog.status === "reupload_required" ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    If left blank, a standard re-upload request will be used.
                  </p>
                ) : null}
              </div>
            ) : null}
          </Modal>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <FileText className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Journey files</h2>
            </div>
            <div className="mt-4 space-y-3">
              {caseFile.artifacts.length > 0 ? (
                caseFile.artifacts.map((artifact) => (
                  <div
                    key={artifact.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {artifact.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatLabel(artifact.artifact_type)} -{" "}
                        {formatLabel(artifact.status)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenArtifact(artifact.url)}
                      disabled={!artifact.can_download}
                      className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-gray-200 dark:hover:bg-zinc-900"
                    >
                      <Download className="h-4 w-4" />
                      Download
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Contracts, invoices, receipts, and progression files will
                  appear here when they are generated.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showSection("tasks") ? (
        <section
          ref={(node) => {
            sectionRefs.current.tasks = node;
          }}
          className="grid gap-6 xl:grid-cols-2"
        >
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Clock3 className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Open tasks</h2>
            </div>
            <div className="mt-4 space-y-3">
              {openRequests.length > 0 ? (
                openRequests.map((request) => (
                  <div
                    key={request.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {request.title}
                    </p>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Status: {formatLabel(request.status)} - Due{" "}
                      {formatDate(request.due_at)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No document tasks are currently open.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
            <div className="flex items-center gap-2 text-gray-900 dark:text-white">
              <ArrowRight className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Workflow notes</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(workflow?.next_actions || []).length > 0 ? (
                (workflow?.next_actions || []).map((action) => (
                  <div
                    key={action.code}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                  >
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {action.label}
                    </p>
                    {action.description ? (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {action.description}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No extra support notes are published for this case yet.
                  {caseFileSupportCopy.helperFooter}
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {showSection("activity") ? (
        <section
          ref={(node) => {
            sectionRefs.current.activity = node;
          }}
          className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                <h2 className="text-lg font-semibold">Activity timeline</h2>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Review the latest case-file actions without scrolling through the full history at once.
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm font-semibold text-gray-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-gray-200">
              {caseFile.activity.length} event{caseFile.activity.length === 1 ? "" : "s"}
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {paginatedActivity.length > 0 ? (
              paginatedActivity.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {event.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDateTime(event.created_at)}
                    </span>
                  </div>
                  {event.description ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      {event.description}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                    {formatLabel(event.type)}
                    {event.actor_role
                      ? ` - ${formatLabel(event.actor_role)}`
                      : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No case-file activity has been recorded yet.
              </p>
            )}
          </div>
          <PaginationBar
            currentPage={activityPage}
            totalPages={activityTotalPages}
            onPageChange={setActivityPage}
            totalItems={caseFile.activity.length}
            pageSize={activityTimelinePageSize}
            currentItemCount={paginatedActivity.length}
            itemLabel="events"
            className="mt-6"
          />
        </section>
      ) : null}
    </div>
  );
};

export default CaseFileWorkspace;

