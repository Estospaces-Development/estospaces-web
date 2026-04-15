"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Download,
  Eye,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Calendar,
  ChevronRight,
  Search,
  PenTool,
  Home,
  X,
} from "lucide-react";
import {
  canUserSignContract,
  normalizeContractStatus,
} from "@/lib/contractStatus";
import { getUserContracts, signContract } from "@/services/contractsService";
import { type Contract } from "@/types/booking";
import { useToast } from "@/contexts/ToastContext";
import {
  buildWorkspacePath,
  resolveContractWorkspaceContext,
} from "@/lib/workspaceLinks";
import {
  getApplications,
  type Application,
} from "@/services/applicationsService";
import {
  getFastTrackCases,
  type FastTrackCase,
} from "@/services/fastTrackService";
import FastTrackCompanionPanel from "@/components/fast-track/FastTrackCompanionPanel";
import {
  getSaleProgressions,
  type SaleProgression,
} from "@/services/salesService";
import {
  usePublishWorkspaceSync,
  useWorkflowWorkspaceRefresh,
} from "@/contexts/WorkspaceSyncContext";
import { WORKSPACE_SYNC_TAGS } from "@/lib/workspaceSync";
import {
  DELETED_FAST_TRACK_CASE_MESSAGE,
  resolveExactFastTrackCase,
  sanitizeWorkspaceCaseId,
  stripCaseSearchParam,
} from "@/lib/fastTrackCaseContext";
import { buildUserPropertyPortfolio } from "@/lib/userPropertyPortfolio";
import { syncFastTrackCompanionAction } from "@/lib/fastTrackCompanion";

export default function ContractsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const publishWorkspaceSync = usePublishWorkspaceSync();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [fastTrackCases, setFastTrackCases] = useState<FastTrackCase[]>([]);
  const [saleProgressions, setSaleProgressions] = useState<SaleProgression[]>(
    [],
  );
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [signingId, setSigningId] = useState<string | null>(null);
  const [viewContract, setViewContract] = useState<Contract | null>(null);
  const [hasAppliedRouteFocus, setHasAppliedRouteFocus] = useState(false);
  const removedCaseNoticeRef = React.useRef<string | null>(null);
  const hasLoadedInitialDataRef = React.useRef(false);
  const inFlightRequestRef = React.useRef<Promise<void> | null>(null);
  const hasWorkspaceFocusRequest = Boolean(
    searchParams.get("contract") ||
    searchParams.get("application") ||
    searchParams.get("case") ||
    searchParams.get("lead") ||
    searchParams.get("property"),
  );

  const fetchData = useCallback(
    async ({ background = false }: { background?: boolean } = {}) => {
      if (inFlightRequestRef.current) {
        return inFlightRequestRef.current;
      }

      const isFirstLoad = !hasLoadedInitialDataRef.current && !background;

      if (isFirstLoad) {
        setIsInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const request = (async () => {
        try {
          const [
            contractsResult,
            applicationsResult,
            fastTrackResult,
            saleProgressionsResult,
          ] = await Promise.all([
            getUserContracts({ suppressErrorToast: true }),
            getApplications({ suppressErrorToast: true }),
            getFastTrackCases({ suppressErrorToast: true }),
            getSaleProgressions({ suppressErrorToast: true }),
          ]);
          if (contractsResult.error) throw new Error(contractsResult.error);
          setContracts(
            Array.isArray(contractsResult.data) ? contractsResult.data : [],
          );
          setApplications(applicationsResult.data || []);
          setFastTrackCases(fastTrackResult.data || []);
          setSaleProgressions(saleProgressionsResult.data || []);
          hasLoadedInitialDataRef.current = true;
        } catch (error: any) {
          toast.error("Failed to load contracts");
        } finally {
          if (isFirstLoad) {
            setIsInitialLoading(false);
          }
          setIsRefreshing(false);
          inFlightRequestRef.current = null;
        }
      })();

      inFlightRequestRef.current = request;
      return request;
    },
    [toast],
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useWorkflowWorkspaceRefresh({
    tags: [
      WORKSPACE_SYNC_TAGS.CONTRACTS,
      WORKSPACE_SYNC_TAGS.APPLICATIONS,
      WORKSPACE_SYNC_TAGS.FAST_TRACK,
      WORKSPACE_SYNC_TAGS.PAYMENTS,
    ],
    refresh: () => fetchData({ background: true }),
  });

  useEffect(() => {
    setHasAppliedRouteFocus(false);
  }, [searchParams]);

  const rawCaseId = searchParams.get("case");
  const { caseId: sanitizedCaseId, removedCaseId } = React.useMemo(
    () =>
      sanitizeWorkspaceCaseId(
        rawCaseId,
        fastTrackCases.map((caseItem) => caseItem.caseId),
      ),
    [fastTrackCases, rawCaseId],
  );

  useEffect(() => {
    if (isInitialLoading || !removedCaseId) {
      return;
    }

    if (removedCaseNoticeRef.current !== removedCaseId) {
      removedCaseNoticeRef.current = removedCaseId;
      toast.info(DELETED_FAST_TRACK_CASE_MESSAGE);
    }

    setSearchParams((previous) => stripCaseSearchParam(previous));
  }, [isInitialLoading, removedCaseId, setSearchParams, toast]);

  const handleSign = async (id: string) => {
    setSigningId(id);
    const { data, error } = await signContract(id, "user");
    if (error) {
      toast.error(error);
    } else if (data) {
      const linkedFastTrackCase =
        fastTrackCases.find(
          (caseItem) =>
            caseItem.caseId === data.fast_track_case_id ||
            caseItem.id === data.fast_track_case_id ||
            caseItem.contractId === data.id,
        ) || null;
      if (linkedFastTrackCase) {
        const syncResult = await syncFastTrackCompanionAction({
          fastTrackCase: linkedFastTrackCase,
          request: { action: "confirm_agreement", payload: {} },
          publishWorkspaceSync,
          reason: "User confirmed agreement from contracts workspace",
        });
        if (syncResult.error || !syncResult.data) {
          setSigningId(null);
          toast.error(syncResult.error || "Contract signed, but the fast-track case did not refresh.");
          return;
        }
        setFastTrackCases((previous) =>
          previous.map((caseItem) =>
            caseItem.caseId === syncResult.data?.caseId ? syncResult.data : caseItem,
          ),
        );
      }
      toast.success("Contract signed successfully!");
      setContracts((prev) => prev.map((c) => (c.id === id ? data : c)));
      publishWorkspaceSync({
        source: "mutation",
        tags: [
          WORKSPACE_SYNC_TAGS.CONTRACTS,
          WORKSPACE_SYNC_TAGS.APPLICATIONS,
          WORKSPACE_SYNC_TAGS.FAST_TRACK,
          WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
        reason: "User signed contract",
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

  const getStatusStyles = (status: string) => {
    switch (normalizeContractStatus(status)) {
      case "active":
        return "bg-green-50 text-green-600 border-green-100";
      case "pending_user_signature":
        return "bg-orange-50 text-orange-600 border-orange-200";
      case "draft":
      case "pending_manager_signature":
        return "bg-yellow-50 text-yellow-600 border-yellow-100";
      case "terminated":
        return "bg-red-50 text-red-600 border-red-100";
      default:
        return "bg-gray-50 text-gray-600 border-gray-100";
    }
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending_user_signature: "Awaiting Your Signature",
      pending_manager_signature: "Awaiting Manager Signature",
      draft: "Draft",
      active: "Active",
      terminated: "Terminated",
    };
    const normalizedStatus = normalizeContractStatus(status);
    return (
      map[normalizedStatus] ||
      normalizedStatus
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const { application: focusedApplication, contract: focusedContract } =
    resolveContractWorkspaceContext(contracts, applications, {
      contractId: searchParams.get("contract"),
      applicationId: searchParams.get("application"),
      caseId: sanitizedCaseId,
      leadId: searchParams.get("lead"),
      propertyId: searchParams.get("property"),
    });
  const focusedFastTrackCase = resolveExactFastTrackCase(
    fastTrackCases,
    sanitizedCaseId,
    focusedApplication?.fast_track_case_id,
  );
  const focusedJourneyType =
    focusedFastTrackCase?.journeyType ||
    (focusedApplication?.listing_type === "sale" ? "buy" : "rent");
  const applicationsWorkspacePath = buildWorkspacePath("/user/applications", {
    applicationId: searchParams.get("application") || focusedApplication?.id,
    caseId: sanitizedCaseId || focusedFastTrackCase?.caseId,
    leadId:
      searchParams.get("lead") ||
      focusedApplication?.lead_id ||
      focusedFastTrackCase?.leadId,
    propertyId:
      searchParams.get("property") ||
      focusedApplication?.property_id ||
      focusedFastTrackCase?.propertyId,
  });
  const fastTrackWorkspacePath = focusedFastTrackCase
    ? `/user/dashboard/fast-track?case=${focusedFastTrackCase.caseId}`
    : "/user/dashboard/fast-track";
  const handleFastTrackCaseUpdated = React.useCallback((nextCase: FastTrackCase) => {
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

  const portfolioItems = React.useMemo(
    () =>
      buildUserPropertyPortfolio({
        contracts,
        applications,
        saleProgressions,
      }),
    [applications, contracts, saleProgressions],
  );

  const filteredPortfolio = React.useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
      return portfolioItems;
    }

    return portfolioItems.filter(
      (item) =>
        item.propertyTitle.toLowerCase().includes(needle) ||
        item.propertyAddress.toLowerCase().includes(needle) ||
        item.ownershipLabel.toLowerCase().includes(needle) ||
        item.statusLabel.toLowerCase().includes(needle),
    );
  }, [portfolioItems, searchQuery]);

  const portfolioSummary = React.useMemo(
    () => ({
      total: portfolioItems.length,
      bought: portfolioItems.filter((item) => item.ownershipLabel === "Bought")
        .length,
      rented: portfolioItems.filter(
        (item) =>
          item.ownershipLabel === "Rented" && item.portfolioStatus === "Active",
      ).length,
    }),
    [portfolioItems],
  );

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
      </div>
    );
  }

  const filtered = contracts
    .filter(
      (c) =>
        (c.contract_type?.toLowerCase() || "").includes(
          searchQuery.toLowerCase(),
        ) || (c.title?.toLowerCase() || "").includes(searchQuery.toLowerCase()),
    )
    .sort((left, right) => {
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

  const uploadDocumentsPath = buildWorkspacePath("/user/dashboard/fast-track", {
    applicationId:
      searchParams.get("application") || focusedContract?.application_id,
    caseId: searchParams.get("case") || focusedContract?.fast_track_case_id,
    leadId: searchParams.get("lead") || focusedContract?.lead_id,
    propertyId: searchParams.get("property") || focusedContract?.property_id,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <button
            onClick={() => navigate("/user/dashboard")}
            className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
          >
            <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
              <ArrowLeft size={18} />
            </div>
            <span className="font-bold text-sm">Dashboard</span>
          </button>

          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
            My Properties
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            See the homes you rent or own, then manage the linked contracts
            without leaving this workspace.
          </p>
          {isRefreshing && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
              <Loader2 size={12} className="animate-spin" />
              Refreshing workspace
            </div>
          )}
          <div className="relative mt-6 max-w-md">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={16}
            />
            <input
              type="text"
              placeholder="Search homes or contracts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 shadow-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Main Contracts List */}
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    My Properties
                  </h2>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Bought homes and rented homes stay together here, so you do
                    not need to jump between separate workspaces.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                      Homes
                    </p>
                    <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                      {portfolioSummary.total}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                      Bought
                    </p>
                    <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                      {portfolioSummary.bought}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 dark:bg-gray-900/50 px-4 py-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400">
                      Rented
                    </p>
                    <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                      {portfolioSummary.rented}
                    </p>
                  </div>
                </div>
              </div>

              {filteredPortfolio.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredPortfolio.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate(item.targetPath)}
                      className="group text-left rounded-[2rem] border border-gray-100 bg-gray-50 p-5 transition-all hover:border-orange-200 hover:shadow-lg dark:border-gray-700 dark:bg-gray-900/50"
                    >
                      <div className="flex gap-4">
                        <div className="h-24 w-24 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                          {item.propertyImage ? (
                            <img
                              src={item.propertyImage}
                              alt={item.propertyTitle}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <Home size={24} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-700 dark:bg-orange-950/30 dark:text-orange-300">
                                  {item.ownershipLabel}
                                </span>
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                  {item.portfolioStatus}
                                </span>
                              </div>
                              <h3 className="mt-3 text-lg font-black text-gray-900 dark:text-white line-clamp-1">
                                {item.propertyTitle}
                              </h3>
                              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                                {item.propertyAddress}
                              </p>
                            </div>
                            <ChevronRight
                              className="text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-orange-500"
                              size={18}
                            />
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl bg-white px-4 py-3 dark:bg-gray-800">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                Value
                              </p>
                              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                                {item.priceLabel}
                              </p>
                            </div>
                            <div className="rounded-2xl bg-white px-4 py-3 dark:bg-gray-800">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                {item.timelineLabel}
                              </p>
                              <p className="mt-2 text-sm font-bold text-gray-900 dark:text-white">
                                {item.timelineDate
                                  ? new Date(
                                      item.timelineDate,
                                    ).toLocaleDateString("en-GB")
                                  : "TBC"}
                              </p>
                            </div>
                          </div>

                          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                            {item.statusSummary}
                          </p>

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
                              {item.statusLabel}
                            </span>
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-300">
                              {item.actionLabel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[2rem] border border-dashed border-gray-200 p-8 text-center dark:border-gray-700">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 text-gray-300 dark:bg-gray-900 dark:text-gray-500">
                    <Home size={28} />
                  </div>
                  <p className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                    No homes visible yet
                  </p>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery
                      ? `No homes matched "${searchQuery}".`
                      : "Bought homes appear here after completion, and rented homes appear here as the tenancy moves into contract or activation."}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  My Contracts
                </h2>
              </div>

              {filtered.length > 0 ? (
                <div className="space-y-4">
                  {hasWorkspaceFocusRequest && !focusedContract && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                      <p className="font-semibold">
                        {focusedJourneyType === "buy"
                          ? "This linked fast-track case is a purchase journey, so a tenancy contract will not appear here."
                          : focusedApplication &&
                              ["approved", "ready_for_contract"].includes(
                                String(focusedApplication.status || "").trim(),
                              )
                            ? "The linked rental application is approved, but the manager has not drafted the tenancy agreement yet."
                            : focusedApplication
                              ? `The linked rental application is currently ${String(focusedApplication.status || "").replace(/_/g, " ")}.`
                              : "This contracts workspace is linked correctly, but the tenancy agreement is not ready yet."}
                      </p>
                      <p className="mt-2">
                        {focusedJourneyType === "buy"
                          ? "Continue from the purchase journey workspace instead of waiting for a rent contract."
                          : focusedApplication &&
                              ["approved", "ready_for_contract"].includes(
                                String(focusedApplication.status || "").trim(),
                              )
                            ? "The contract will appear here automatically as soon as the manager drafts it."
                            : focusedApplication
                              ? "Keep the linked application moving first. The tenancy contract appears only after approval."
                              : focusedFastTrackCase?.nextAction ||
                                focusedFastTrackCase?.statusReason ||
                                "Continue from fast-track or the linked application and this workspace will populate automatically once the contract exists."}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => navigate(applicationsWorkspacePath)}
                          className="rounded-xl border border-orange-300 px-4 py-2.5 font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:text-orange-200 dark:hover:bg-orange-950/30"
                        >
                          {focusedJourneyType === "buy"
                            ? "Open purchase journey"
                            : "Open applications workspace"}
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(fastTrackWorkspacePath)}
                          className="rounded-xl border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition-colors hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:bg-black"
                        >
                          Open fast-track workspace
                        </button>
                      </div>
                    </div>
                  )}
                  {focusedContract && (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                      Your linked live contract is pinned first so you can
                      review or sign it without searching the whole list.
                    </div>
                  )}
                  {focusedFastTrackCase && (
                    <FastTrackCompanionPanel
                      role="user"
                      fastTrackCase={focusedFastTrackCase}
                      context={{
                        caseId: sanitizedCaseId || focusedFastTrackCase.caseId,
                        applicationId: searchParams.get("application") || focusedApplication?.id,
                        contractId: searchParams.get("contract") || focusedContract?.id,
                        leadId:
                          searchParams.get("lead") ||
                          focusedApplication?.lead_id ||
                          focusedFastTrackCase.leadId,
                        propertyId:
                          searchParams.get("property") ||
                          focusedApplication?.property_id ||
                          focusedFastTrackCase.propertyId,
                      }}
                      title="Linked agreement and handover controls"
                      onCaseUpdated={handleFastTrackCaseUpdated}
                      onRefresh={() => fetchData({ background: true })}
                    />
                  )}
                  {filtered.map((contract) => {
                    const needsSignature = canUserSignContract(
                      contract.status,
                      contract.user_signed_at,
                    );
                    return (
                      <div
                        key={contract.id}
                        className={`p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border transition-all group ${
                          contract.id === focusedContract?.id
                            ? "border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-orange-900/20 shadow-sm ring-2 ring-orange-200/80 dark:ring-orange-900/40"
                            : needsSignature
                              ? "border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-orange-900/20 shadow-sm"
                              : "border-transparent hover:border-orange-500/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-orange-500">
                              <FileText size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-900 dark:text-white">
                                {(contract.contract_type || "Contract")
                                  .charAt(0)
                                  .toUpperCase() +
                                  (contract.contract_type || "Contract").slice(
                                    1,
                                  )}{" "}
                                Agreement
                              </h4>
                              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 flex items-center gap-2">
                                <Calendar size={12} />
                                Starts:{" "}
                                {contract.start_date
                                  ? new Date(
                                      contract.start_date,
                                    ).toLocaleDateString()
                                  : "TBD"}
                              </p>
                            </div>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyles(contract.status || "")}`}
                          >
                            {getStatusLabel(contract.status || "")}
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="mt-4 flex items-center gap-6 text-xs">
                          <span
                            className={`flex items-center gap-1 ${contract.user_signed_at ? "text-green-600" : "text-gray-400"}`}
                          >
                            {contract.user_signed_at ? (
                              <CheckCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            You{" "}
                            {contract.user_signed_at ? "signed" : "not signed"}
                          </span>
                          <span
                            className={`flex items-center gap-1 ${contract.manager_signed_at ? "text-green-600" : "text-gray-400"}`}
                          >
                            {contract.manager_signed_at ? (
                              <CheckCircle size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            Manager{" "}
                            {contract.manager_signed_at
                              ? "signed"
                              : "not signed"}
                          </span>
                          {contract.monthly_rent && (
                            <span className="text-gray-500 ml-auto font-semibold">
                              £{contract.monthly_rent.toLocaleString()}/mo
                            </span>
                          )}
                        </div>

                        <div className="mt-6 flex items-center gap-3">
                          {needsSignature && (
                            <button
                              onClick={() => handleSign(contract.id)}
                              disabled={signingId === contract.id}
                              className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                              {signingId === contract.id ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />{" "}
                                  Signing...
                                </>
                              ) : (
                                <>
                                  <PenTool size={14} /> Sign Contract
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => setViewContract(contract)}
                            className={`${needsSignature ? "" : "flex-1"} py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                          >
                            <Eye size={14} /> View Document
                          </button>
                          <button className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 hover:text-orange-500 transition-colors">
                            <Download size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText size={32} className="text-gray-200" />
                  </div>
                  {hasWorkspaceFocusRequest && !focusedContract && (
                    <p className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-5 py-4 text-sm text-orange-700 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300">
                      You are in the correct contracts workspace for this
                      fast-track case, but no live tenancy contract has been
                      created yet.
                    </p>
                  )}
                  <p className="text-gray-500 font-medium italic">
                    {searchQuery
                      ? `No contracts found matching "${searchQuery}"`
                      : "No tenancy contracts yet. Rental contracts are created after approval, while purchase journeys continue in the sale progression workspace."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-gray-900 dark:bg-white rounded-[2.5rem] p-8 shadow-2xl text-white dark:text-gray-900 overflow-hidden relative group">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <AlertCircle size={80} />
              </div>
              <h3 className="text-xl font-black mb-6 tracking-tight relative z-10">
                Documents
              </h3>
              <p className="text-sm text-white/70 dark:text-gray-500 mb-6 relative z-10">
                Upload your verification documents to progress your application.
              </p>
              <button
                onClick={() => navigate(uploadDocumentsPath)}
                className="w-full mt-2 py-4 bg-orange-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all relative z-10"
              >
                Upload Documents
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 shadow-xl border dark:border-gray-700">
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 tracking-tight">
                Support
              </h3>
              <p className="text-sm text-gray-500 font-medium mb-6 leading-relaxed">
                Questions about your legal documents? Our specialists are here
                to help.
              </p>
              <button
                onClick={() => navigate("/user/dashboard/help")}
                className="w-full py-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              >
                Contact Support
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewContract && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setViewContract(null)}
        >
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl dark:bg-gray-800"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                  Linked contract
                </p>
                <h2 className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
                  {(viewContract.contract_type || "Contract").replace(
                    /\b\w/g,
                    (character) => character.toUpperCase(),
                  )}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Contract ID {viewContract.id}
                </p>
              </div>
              <button
                onClick={() => setViewContract(null)}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-900"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Status
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {getStatusLabel(viewContract.status || "")}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Monthly rent
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {viewContract.monthly_rent
                    ? `£${viewContract.monthly_rent.toLocaleString()}/mo`
                    : "TBC"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Start date
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {viewContract.start_date
                    ? new Date(viewContract.start_date).toLocaleDateString(
                        "en-GB",
                      )
                    : "TBC"}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
                  Deposit
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                  {viewContract.deposit_amount
                    ? `£${viewContract.deposit_amount.toLocaleString()}`
                    : "TBC"}
                </p>
              </div>
            </div>

            {viewContract.content ? (
              <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5 text-sm leading-6 text-gray-700 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
                {viewContract.content}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-gray-200 p-5 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Full contract text is not embedded in this record yet. This
                panel keeps the user on the exact linked contract while the
                signing workflow continues.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
