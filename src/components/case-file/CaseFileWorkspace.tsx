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
  inferCaseFileUploadDescriptor,
  summarizeCaseFileDocuments,
} from "@/lib/caseFileDocuments";
import { getCaseFileWaitingCopy } from "@/lib/caseFileWorkflow";
import { buildWorkspacePath } from "@/lib/workspaceLinks";

type CaseFileRole = "manager" | "user";
type CaseFileTab = "overview" | "documents" | "tasks" | "activity";

interface CaseFileWorkspaceProps {
  role: CaseFileRole;
  caseId?: string | null;
  embedded?: boolean;
  initialTab?: CaseFileTab;
}

const tabOrder: Array<{ key: CaseFileTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "documents", label: "Documents" },
  { key: "tasks", label: "Tasks" },
  { key: "activity", label: "Activity" },
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

const canUploadAgainstRequest = (request?: CaseFileRequest | null) =>
  !["approved", "waived"].includes(String(request?.status || "").trim());

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
      label: "Open fast-track workspace",
      path: buildWorkspacePath(`${base}/fast-track`, shared),
    },
    {
      label:
        role === "manager"
          ? "Open applications workspace"
          : "Open applications",
      path: buildWorkspacePath(`${base}/applications`, shared),
    },
    {
      label:
        role === "manager" ? "Open appointments workspace" : "Open viewings",
      path: buildWorkspacePath(
        `${base}/${role === "manager" ? "appointments" : "viewings"}`,
        shared,
      ),
    },
    ...(role === "manager"
      ? [
          {
            label: "Open billing workspace",
            path: buildWorkspacePath("/manager/billing", shared),
          },
        ]
      : [
          {
            label: "Open payments workspace",
            path: buildWorkspacePath("/user/dashboard/payments", shared),
          },
        ]),
    ...(caseFile.contract_id
      ? [
          {
            label:
              role === "manager"
                ? "Open contracts workspace"
                : "Open contracts",
            path: buildWorkspacePath(`${base}/contracts`, shared),
          },
        ]
      : []),
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

const CaseFileWorkspace: React.FC<CaseFileWorkspaceProps> = ({
  role,
  caseId,
  embedded = false,
  initialTab = "overview",
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const resolvedCaseId = caseId || searchParams.get("case") || "";
  const [activeTab, setActiveTab] = useState<CaseFileTab>(
    embedded
      ? initialTab
      : (searchParams.get("tab") as CaseFileTab) || initialTab,
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
  const deletedCaseRedirectRef = useRef<string | null>(null);
  const publishWorkspaceSync = usePublishWorkspaceSync();

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
      return;
    }

    const requestedTab = searchParams.get("tab") as CaseFileTab | null;
    if (requestedTab && tabOrder.some((item) => item.key === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [embedded, searchParams]);

  const setTab = (tab: CaseFileTab) => {
    setActiveTab(tab);
    if (embedded) {
      return;
    }

    setSearchParams((previous) => {
      const next = new URLSearchParams(previous);
      if (resolvedCaseId) {
        next.set("case", resolvedCaseId);
      }
      next.set("tab", tab);
      return next;
    });
  };

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

  const handleReviewDocument = async (
    document: CaseFileDocument,
    status: "approved" | "reupload_required" | "under_review",
  ) => {
    if (!caseFile) {
      return;
    }

    const actionKey = `review:${document.id}:${status}`;
    setBusyKey(actionKey);
    const result = await reviewCaseFileDocumentLink(
      caseFile.case_id,
      document.id,
      {
        status,
        reject_reason:
          status === "reupload_required"
            ? (reviewReasonByLinkId[document.id] || "").trim() ||
              "Please upload a clearer or more recent copy."
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
    await loadCaseFile(true);
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
  const openRequests = caseFile.requests.filter(
    (item) =>
      !["approved", "waived"].includes(String(item.status || "").trim()),
  );

  return (
    <div className={embedded ? "space-y-6" : "space-y-8"}>
      {!embedded ? (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-500">
                Shared case file
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-gray-900 dark:text-white">
                {caseFile.property_title || "Live case"}
              </h1>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Case {caseFile.case_id} · {formatLabel(caseFile.listing_type)}{" "}
                journey
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
                Live stage
              </p>
              <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                {formatLabel(workflow?.live_stage)}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                {workflow?.journey_status_reason ||
                  "The journey state is synced from the backend workflow."}
              </p>
            </div>
            <ActorWaitingCard caseFile={caseFile} />
            <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                Open requests
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
                Client-facing files and journey artifacts stay attached to this
                case through the whole flow.
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

      {activeTab === "overview" ? (
        <section className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                    The document lane is clear right now. Use the quick links to
                    continue the live workflow.
                  </p>
                </div>
              )}

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
                <h2 className="text-lg font-semibold">Connected workspaces</h2>
              </div>
              <div className="mt-4 space-y-3">
                {workspaceLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className="flex w-full items-center justify-between rounded-2xl border border-gray-200 px-4 py-4 text-left transition-colors hover:bg-gray-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {item.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "documents" ? (
        <section className="space-y-6">
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
                  <input
                    type="date"
                    value={requestForm.due_at}
                    onChange={(event) =>
                      setRequestForm((previous) => ({
                        ...previous,
                        due_at: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
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
                                      · {formatLabel(document.status)}
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
                  const reviewReason = reviewReasonByLinkId[document.id] || "";
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
                            {formatLabel(document.document.document_category)} ·{" "}
                            {formatLabel(document.visibility)} · Linked{" "}
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
                        <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-black">
                          <label className="block space-y-2 text-sm">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              Manager feedback
                            </span>
                            <textarea
                              rows={2}
                              value={reviewReason}
                              onChange={(event) =>
                                setReviewReasonByLinkId((previous) => ({
                                  ...previous,
                                  [document.id]: event.target.value,
                                }))
                              }
                              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                              placeholder="Add guidance if the client needs to re-upload."
                            />
                          </label>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleReviewDocument(document, "approved")
                              }
                              disabled={
                                busyKey === `review:${document.id}:approved`
                              }
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
                              onClick={() =>
                                void handleReviewDocument(
                                  document,
                                  "reupload_required",
                                )
                              }
                              disabled={
                                busyKey ===
                                `review:${document.id}:reupload_required`
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-900/30 dark:text-red-300 dark:hover:bg-red-950/20"
                            >
                              {busyKey ===
                              `review:${document.id}:reupload_required` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <XCircle className="h-4 w-4" />
                              )}
                              Request re-upload
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                void handleReviewDocument(
                                  document,
                                  "under_review",
                                )
                              }
                              disabled={
                                busyKey === `review:${document.id}:under_review`
                              }
                              className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-950/20"
                            >
                              {busyKey ===
                              `review:${document.id}:under_review` ? (
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
                        {formatLabel(artifact.artifact_type)} ·{" "}
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

      {activeTab === "tasks" ? (
        <section className="grid gap-6 xl:grid-cols-2">
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
                      Status: {formatLabel(request.status)} · Due{" "}
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
              <h2 className="text-lg font-semibold">Next actions</h2>
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
                  The backend has not published additional next-action hints for
                  this case yet. Use the connected workspace links from the
                  overview.
                </p>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "activity" ? (
        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
          <div className="flex items-center gap-2 text-gray-900 dark:text-white">
            <CalendarClock className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold">Activity timeline</h2>
          </div>
          <div className="mt-6 space-y-4">
            {caseFile.activity.length > 0 ? (
              caseFile.activity.map((event) => (
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
                      ? ` · ${formatLabel(event.actor_role)}`
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
        </section>
      ) : null}
    </div>
  );
};

export default CaseFileWorkspace;
