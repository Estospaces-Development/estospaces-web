import ActionSpinner from '@/components/ui/ActionSpinner';
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  MessageSquare,
  XCircle,
  CheckCircle,
  Clock,
  Phone,
  Mail,
  Building2,
  User,
  FileCheck,
  FileText,
  AlertCircle,
  ChevronRight,
  Home,
  Briefcase,
  History,
  Shield,
  Key,
  Upload,
  LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useApplications,
  APPLICATION_STATUS,
  Application,
  ApplicationStatus,
} from "../../../contexts/ApplicationsContext";
import StatusTracker from "./StatusTracker";
import FastTrackCompanionPanel from "@/components/fast-track/FastTrackCompanionPanel";
import CreateContractModal from "@/components/manager/contracts/CreateContractModal";
import { PROPERTY_PLACEHOLDER_IMAGE } from "@/lib/placeholders";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { messagesService } from "@/services/messagesService";
import Avatar from "@/components/ui/Avatar";
import {
  attachLinkedFastTrackCase,
  findLinkedFastTrackCase,
} from "@/lib/fastTrackCompanion";
import {
  getFastTrackCases,
  type FastTrackCase,
} from "@/services/fastTrackService";
import { formatLaunchCurrencyForCountry } from "@/lib/launchLocale";
import {
  getAMLReview,
  getBuyerQualification,
  getReferencingCheck,
  getRightToRentCheck,
  updateApplicationStatus as updateApplicationWorkflowStatus,
  updateAMLReview,
  updateBuyerQualification,
  updateReferencingCheck,
  updateRightToRentCheck,
  type AMLReview,
  type BuyerQualification,
  type ReferencingCheck,
  type RightToRentCheck,
} from "@/services/applicationsService";
import {
  getCaseFile,
  type CaseFile as SharedCaseFile,
} from "@/services/caseFilesService";
import {
  getPropertyComplianceEvidence,
  upsertPropertyComplianceEvidence,
  type PropertyComplianceReadiness,
} from "@/services/propertyService";
import { createOffer, getSaleProgressions } from "@/services/salesService";
import {
  getNextSaleJourneyActions,
  getSaleJourneySummary,
  getSaleJourneyStageLabel,
  isSaleProgressionRecord,
  resolveSaleJourneyDisplayStage,
  saleProgressionStageForStatus,
} from "@/lib/saleJourney";
import {
  buildLatestPropertyComplianceEvidenceMap,
  createPropertyComplianceDrafts,
  dedupeJourneyBlockers,
  findRequirementBlocker,
  getOfferReadinessBlockers,
  getOfferReadinessRequirements,
  getPropertyComplianceStatusLabel,
  isPropertyOfferReady,
  isPropertyContractReady,
  normalizePropertyComplianceCode,
  type PropertyComplianceEvidenceDraft,
} from "@/lib/propertyCompliance";
import { summarizeCaseFileDocuments } from "@/lib/caseFileDocuments";
import {
  getManagerRentNextAction,
  type ManagerRentNextActionPanel,
} from "@/lib/managerRentWorkflow";
import { buildWorkspacePath } from "@/lib/workspaceLinks";
import CaseFileWorkspace from "@/components/case-file/CaseFileWorkspace";
import {
  resolveManagerApplicationOverviewFocus,
  resolveManagerApplicationTab,
  shouldShowManagerDecisionControls,
  shouldShowManagerManagedPurchaseWorkspace,
  type ManagerApplicationTab,
} from "@/lib/managerApplicationWorkspace";
import type { WorkspaceSection } from "@/lib/liveCaseWorkspace";
import {
  getManagerCreateContractGuard,
  getManagerOfferGuard,
} from "@/lib/managerWorkflowGuards";

interface ApplicationDetailProps {
  applicationId: string;
  application?: Application;
  onClose: () => void;
  onUpdateStatus?: (
    id: string,
    status: ApplicationStatus,
    reviewNotes?: string,
  ) => Promise<void> | void;
  requestedSection?: WorkspaceSection;
}

const MAX_MANAGER_APPLICATION_REVIEW_NOTE_LENGTH = 1000;
const MAX_MANAGER_APPLICATION_EVIDENCE_TYPE_LENGTH = 40;

const normalizeManagerApplicationReviewNote = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const validateManagerWorkflowNote = (reviewNotes: string) => {
  const normalizedNotes = normalizeManagerApplicationReviewNote(reviewNotes);
  if (normalizedNotes.length > MAX_MANAGER_APPLICATION_REVIEW_NOTE_LENGTH) {
    return { reviewNotes: normalizedNotes, error: "Review note must be 1000 characters or fewer." };
  }
  return { reviewNotes: normalizedNotes, error: "" };
};

const validateRightToRentUpdate = (
  status: "in_progress" | "completed" | "not_required",
  evidenceType: string,
  reviewNotes: string,
) => {
  const evidence = normalizeManagerApplicationReviewNote(evidenceType);
  const noteValidation = validateManagerWorkflowNote(reviewNotes);
  if (noteValidation.error) {
    return { evidenceType: evidence, reviewNotes: noteValidation.reviewNotes, error: noteValidation.error };
  }
  if (evidence.length > MAX_MANAGER_APPLICATION_EVIDENCE_TYPE_LENGTH) {
    return { evidenceType: evidence, reviewNotes: noteValidation.reviewNotes, error: "Evidence type must be 40 characters or fewer." };
  }
  if (status === "completed" && !evidence) {
    return { evidenceType: evidence, reviewNotes: noteValidation.reviewNotes, error: "Enter the evidence type used for the check." };
  }
  if (status === "not_required" && !noteValidation.reviewNotes) {
    return { evidenceType: evidence, reviewNotes: noteValidation.reviewNotes, error: "Add a note explaining why this check is not required." };
  }
  return { evidenceType: evidence, reviewNotes: noteValidation.reviewNotes, error: "" };
};

const validateManagerApplicationStatusUpdate = (
  status: ApplicationStatus,
  reviewNotes: string,
) => {
  const normalizedNotes = normalizeManagerApplicationReviewNote(reviewNotes);
  if (status === APPLICATION_STATUS.REJECTED && !normalizedNotes) {
    return { reviewNotes: normalizedNotes, error: "Enter a rejection reason." };
  }
  if (normalizedNotes.length > MAX_MANAGER_APPLICATION_REVIEW_NOTE_LENGTH) {
    return { reviewNotes: normalizedNotes, error: "Review note must be 1000 characters or fewer." };
  }
  return { reviewNotes: normalizedNotes, error: "" };
};

const managerRentPanelLabels: Record<
  ManagerRentNextActionPanel,
  string
> = {
  documents: "Shared documents",
  referencing: "Referencing",
  compliance: "Right-to-rent",
  approval: "Approval",
  property_readiness: "Property readiness",
  appointments: "Appointments",
};

const ApplicationDetail: React.FC<ApplicationDetailProps> = ({
  applicationId,
  application: initialApplication,
  onClose,
  onUpdateStatus,
  requestedSection,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const { allApplications, fetchApplications } = useApplications();
  const application =
    allApplications?.find((app) => app.id === applicationId) ||
    initialApplication;
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [managerDecisionAction, setManagerDecisionAction] = useState<
    "approved" | "rejected" | "under_review" | "documents_requested" | null
  >(null);
  const [managerDecisionNote, setManagerDecisionNote] = useState("");
  const [managerDecisionNoteError, setManagerDecisionNoteError] = useState("");
  const [manualStatusDraft, setManualStatusDraft] = useState<ApplicationStatus>(
    APPLICATION_STATUS.UNDER_REVIEW as ApplicationStatus,
  );
  const [isUpdatingManualStatus, setIsUpdatingManualStatus] = useState(false);
  const [activeTab, setActiveTab] = useState(() =>
    resolveManagerApplicationTab(requestedSection),
  );
  const [openingConversation, setOpeningConversation] = useState(false);
  const [buyerQualification, setBuyerQualification] =
    useState<BuyerQualification | null>(null);
  const [amlReview, setAmlReview] = useState<AMLReview | null>(null);
  const [purchaseWorkflowError, setPurchaseWorkflowError] = useState<
    string | null
  >(null);
  const [isLoadingPurchaseWorkflow, setIsLoadingPurchaseWorkflow] =
    useState(false);
  const [purchaseWorkflowAction, setPurchaseWorkflowAction] = useState<
    string | null
  >(null);
  const [buyerQualificationDraft, setBuyerQualificationDraft] = useState({
    mortgageInPrincipleVerified: false,
    proofOfFundsVerified: false,
    reviewNotes: "",
  });
  const [buyerQualificationError, setBuyerQualificationError] = useState("");
  const [amlReviewDraft, setAmlReviewDraft] = useState({
    identityStatus: "pending",
    sourceOfFundsStatus: "pending",
    reviewNotes: "",
  });
  const [amlReviewError, setAmlReviewError] = useState("");
  const [resolvedFastTrackCase, setResolvedFastTrackCase] =
    useState<FastTrackCase | null>(application?.fastTrackCase || null);
  const [offerDraft, setOfferDraft] = useState({
    amount: String(application?.propertyPrice || ""),
    notes: "",
  });
  const [propertyComplianceReadiness, setPropertyComplianceReadiness] =
    useState<PropertyComplianceReadiness | null>(null);
  const [propertyComplianceDrafts, setPropertyComplianceDrafts] = useState<
    Record<string, PropertyComplianceEvidenceDraft>
  >({});
  const [pendingOfferFocus, setPendingOfferFocus] = useState(false);
  const [rentCaseFile, setRentCaseFile] = useState<SharedCaseFile | null>(null);
  const [referencingCheck, setReferencingCheck] =
    useState<ReferencingCheck | null>(null);
  const [referencingDraft, setReferencingDraft] = useState({
    reviewNotes: "",
  });
  const [referencingError, setReferencingError] = useState("");
  const [rightToRentCheck, setRightToRentCheck] =
    useState<RightToRentCheck | null>(null);
  const [rightToRentDraft, setRightToRentDraft] = useState({
    evidenceType: "",
    reviewNotes: "",
    timeLimited: false,
  });
  const [rightToRentError, setRightToRentError] = useState("");
  const [rentWorkflowError, setRentWorkflowError] = useState<string | null>(
    null,
  );
  const [isLoadingRentWorkflow, setIsLoadingRentWorkflow] = useState(false);
  const [rentWorkflowAction, setRentWorkflowAction] = useState<string | null>(
    null,
  );
  const agentInfoSectionRef = useRef<HTMLDivElement | null>(null);
  const purchaseWorkspaceSectionRef = useRef<HTMLDivElement | null>(null);
  const liveJourneySectionRef = useRef<HTMLDivElement | null>(null);
  const rentWorkspaceSectionRef = useRef<HTMLDivElement | null>(null);
  const rentDocumentsSectionRef = useRef<HTMLDivElement | null>(null);
  const rentReferencingSectionRef = useRef<HTMLDivElement | null>(null);
  const rentComplianceSectionRef = useRef<HTMLDivElement | null>(null);
  const rentPropertyReadinessSectionRef = useRef<HTMLDivElement | null>(null);
  const rentActionSectionRef = useRef<HTMLDivElement | null>(null);
  const buyerQualificationSectionRef = useRef<HTMLDivElement | null>(null);
  const amlSectionRef = useRef<HTMLDivElement | null>(null);
  const sellerReadinessSectionRef = useRef<HTMLDivElement | null>(null);
  const offerSectionRef = useRef<HTMLDivElement | null>(null);
  const offerAmountInputRef = useRef<HTMLInputElement | null>(null);

  const isSaleProgression = isSaleProgressionRecord(application);
  const purchaseDisplayStage = resolveSaleJourneyDisplayStage(application);
  const isPurchaseApplication = application?.listingType !== "rent";
  const isRentApplication = application?.listingType === "rent";
  const supportsManagedPurchaseWorkflow = Boolean(
    application && shouldShowManagerManagedPurchaseWorkspace(application),
  );
  const liveSaleJourneyStage = saleProgressionStageForStatus(
    application?.status || "",
  );
  const showsLiveSaleJourney = Boolean(
    application &&
    isPurchaseApplication &&
    !supportsManagedPurchaseWorkflow &&
    (isSaleProgression || liveSaleJourneyStage),
  );

  useEffect(() => {
    setOfferDraft({
      amount: String(application?.propertyPrice || ""),
      notes: "",
    });
  }, [application?.id, application?.propertyPrice]);

  useEffect(() => {
    setManagerDecisionNote("");
    setManagerDecisionNoteError("");
    setManualStatusDraft((application?.status || APPLICATION_STATUS.UNDER_REVIEW) as ApplicationStatus);
  }, [application?.id, application?.status]);

  useEffect(() => {
    if (!application) {
      setResolvedFastTrackCase(null);
      return;
    }

    if (application.fastTrackCase) {
      setResolvedFastTrackCase(application.fastTrackCase);
      return;
    }

    let cancelled = false;

    const loadFastTrackCase = async () => {
      const result = await getFastTrackCases({ suppressErrorToast: true });
      if (cancelled) {
        return;
      }

      const linkedFastTrackCase =
        findLinkedFastTrackCase(result.data || [], {
          applicationId:
            application.source === "sale_progression" ? undefined : application.id,
          caseId: application.fastTrackCaseId,
          fastTrackCaseId: application.fastTrackCaseId,
          leadId: application.leadId,
          propertyId: application.propertyId,
        }) || null;

      setResolvedFastTrackCase(linkedFastTrackCase);
    };

    void loadFastTrackCase();

    return () => {
      cancelled = true;
    };
  }, [application]);

  const linkedApplication = application
    ? attachLinkedFastTrackCase(
        {
          ...application,
          fastTrackCase: application.fastTrackCase || resolvedFastTrackCase || undefined,
        },
        resolvedFastTrackCase ? [resolvedFastTrackCase] : [],
      )
    : null;

  const managerWorkflowRequestOptions = useMemo(
    () => ({ suppressErrorToast: true }) as const,
    [],
  );

  const resetManagedPurchaseWorkflowState = () => {
    setBuyerQualification(null);
    setAmlReview(null);
    setPropertyComplianceReadiness(null);
    setPropertyComplianceDrafts({});
    setBuyerQualificationError("");
    setAmlReviewError("");
  };

  const resetManagedRentWorkflowState = () => {
    setRentCaseFile(null);
    setReferencingCheck(null);
    setRightToRentCheck(null);
    setReferencingDraft({ reviewNotes: "" });
    setRightToRentDraft({
      evidenceType: "",
      reviewNotes: "",
      timeLimited: false,
    });
    setReferencingError("");
    setRightToRentError("");
  };

  const scrollToWorkflowSection = (
    section: "buyer" | "aml" | "seller" | "offer",
  ) => {
    const target = (() => {
      switch (section) {
        case "buyer":
          return buyerQualificationSectionRef.current;
        case "aml":
          return amlSectionRef.current;
        case "seller":
          return sellerReadinessSectionRef.current;
        case "offer":
          return offerSectionRef.current;
        default:
          return null;
      }
    })();

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (section === "offer") {
      window.setTimeout(() => {
        offerAmountInputRef.current?.focus();
      }, 180);
    }
  };

  const scrollToRentPanel = (panel: ManagerRentNextActionPanel) => {
    switch (panel) {
      case "documents":
        setActiveTab("documents");
        return;
      case "referencing":
        rentReferencingSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "compliance":
        rentComplianceSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "property_readiness":
        rentPropertyReadinessSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "approval":
        rentActionSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "appointments":
        handleOpenRentWorkspace("/manager/appointments");
        return;
      default:
        return;
    }
  };

  const overviewFocus = resolveManagerApplicationOverviewFocus(requestedSection);
  const overviewTab = resolveManagerApplicationTab(requestedSection);

  useEffect(() => {
    setActiveTab(overviewTab);
  }, [applicationId, overviewTab]);

  useEffect(() => {
    if (activeTab !== "overview" || !overviewFocus) {
      return;
    }

    const target =
      overviewFocus === "messages"
        ? agentInfoSectionRef.current
        : isPurchaseApplication
          ? purchaseWorkspaceSectionRef.current ||
            liveJourneySectionRef.current
          : rentWorkspaceSectionRef.current;

    if (!target) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, isPurchaseApplication, overviewFocus]);

  const loadManagedPurchaseWorkflow = useCallback(async (
    targetApplication: Application,
  ) => {
    const compliancePromise = targetApplication.propertyId
      ? getPropertyComplianceEvidence(
          targetApplication.propertyId,
          managerWorkflowRequestOptions,
        )
      : Promise.resolve({
          data: { evidence: [], readiness: null },
          error: null,
        });

    const [qualificationResult, amlResult, complianceResult] =
      await Promise.all([
        getBuyerQualification(targetApplication.id, managerWorkflowRequestOptions),
        getAMLReview(targetApplication.id, managerWorkflowRequestOptions),
        compliancePromise,
      ]);

    if (qualificationResult.error) {
      throw new Error(qualificationResult.error);
    }
    if (amlResult.error) {
      throw new Error(amlResult.error);
    }
    if (complianceResult.error) {
      throw new Error(complianceResult.error);
    }

    const readiness = complianceResult.data?.readiness || null;
    const drafts = createPropertyComplianceDrafts(
      getOfferReadinessRequirements(readiness),
      buildLatestPropertyComplianceEvidenceMap(
        complianceResult.data?.evidence || [],
      ),
    );

    setBuyerQualification(qualificationResult.data);
    setAmlReview(amlResult.data);
    setPropertyComplianceReadiness(readiness);
    setPropertyComplianceDrafts(drafts);
    setBuyerQualificationDraft({
      mortgageInPrincipleVerified:
        qualificationResult.data?.mortgage_in_principle_verified || false,
      proofOfFundsVerified:
        qualificationResult.data?.proof_of_funds_verified || false,
      reviewNotes: qualificationResult.data?.review_notes || "",
    });
    setBuyerQualificationError("");
    setAmlReviewDraft({
      identityStatus: amlResult.data?.identity_status || "pending",
      sourceOfFundsStatus: amlResult.data?.source_of_funds_status || "pending",
      reviewNotes: amlResult.data?.review_notes || "",
    });
    setAmlReviewError("");
    setPurchaseWorkflowError(null);
  }, [managerWorkflowRequestOptions]);

  const loadRentWorkflow = useCallback(async (targetApplication: Application) => {
    const caseFilePromise = targetApplication.fastTrackCaseId
      ? getCaseFile(targetApplication.fastTrackCaseId, managerWorkflowRequestOptions)
      : Promise.resolve({ data: null, error: null });

    const [caseFileResult, referencingResult, rightToRentResult] =
      await Promise.all([
        caseFilePromise,
        getReferencingCheck(targetApplication.id, managerWorkflowRequestOptions),
        getRightToRentCheck(targetApplication.id, managerWorkflowRequestOptions),
      ]);

    if (caseFileResult.error) {
      throw new Error(caseFileResult.error);
    }
    if (referencingResult.error) {
      throw new Error(referencingResult.error);
    }
    if (rightToRentResult.error) {
      throw new Error(rightToRentResult.error);
    }

    setRentCaseFile(caseFileResult.data);
    setReferencingCheck(referencingResult.data);
    setRightToRentCheck(rightToRentResult.data);
    setReferencingDraft({
      reviewNotes: referencingResult.data?.review_notes || "",
    });
    setRightToRentDraft({
      evidenceType: rightToRentResult.data?.evidence_type || "",
      reviewNotes: rightToRentResult.data?.review_notes || "",
      timeLimited: Boolean(rightToRentResult.data?.time_limited),
    });
    setReferencingError("");
    setRightToRentError("");
    setRentWorkflowError(null);
  }, [managerWorkflowRequestOptions]);

  useEffect(() => {
    if (!application || !supportsManagedPurchaseWorkflow) {
      resetManagedPurchaseWorkflowState();
      setPurchaseWorkflowError(null);
      setPendingOfferFocus(false);
      return;
    }

    let cancelled = false;

    const loadPurchaseWorkflow = async () => {
      setIsLoadingPurchaseWorkflow(true);
      setPurchaseWorkflowError(null);
      resetManagedPurchaseWorkflowState();
      try {
        await loadManagedPurchaseWorkflow(application);
        if (!cancelled) {
          setIsLoadingPurchaseWorkflow(false);
        }
      } catch (error: any) {
        if (!cancelled) {
          resetManagedPurchaseWorkflowState();
          setPurchaseWorkflowError(
            error?.message ||
              "Unable to load the live purchase workflow right now.",
          );
          setIsLoadingPurchaseWorkflow(false);
        }
      }
    };

    void loadPurchaseWorkflow();

    return () => {
      cancelled = true;
    };
  }, [application, loadManagedPurchaseWorkflow, supportsManagedPurchaseWorkflow]);

  useEffect(() => {
    if (!application || !isRentApplication) {
      resetManagedRentWorkflowState();
      setRentWorkflowError(null);
      return;
    }

    let cancelled = false;

    const loadCurrentRentWorkflow = async () => {
      setIsLoadingRentWorkflow(true);
      setRentWorkflowError(null);
      resetManagedRentWorkflowState();
      try {
        await loadRentWorkflow(application);
        if (!cancelled) {
          setIsLoadingRentWorkflow(false);
        }
      } catch (error: any) {
        if (!cancelled) {
          resetManagedRentWorkflowState();
          setRentWorkflowError(
            error?.message ||
              "Unable to load the live rent workflow right now.",
          );
          setIsLoadingRentWorkflow(false);
        }
      }
    };

    void loadCurrentRentWorkflow();

    return () => {
      cancelled = true;
    };
  }, [application, isRentApplication, loadRentWorkflow]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatPrice = (price?: number) => {
    if (price === undefined) return "Price on request";
    return formatLaunchCurrencyForCountry(price, {
      countryCode: application?.propertyCountry,
      countryName: application?.propertyCountry,
      currencyCode: application?.propertyCurrency,
    });
  };

  const handleManagerDecision = async (
    nextStatus: "approved" | "rejected" | "under_review" | "documents_requested",
  ) => {
    if (!onUpdateStatus || managerDecisionAction) {
      return;
    }

    const { reviewNotes, error } = validateManagerApplicationStatusUpdate(
      nextStatus as ApplicationStatus,
      managerDecisionNote,
    );
    setManagerDecisionNoteError(error);
    if (error) {
      return;
    }

    setManagerDecisionAction(nextStatus);
    try {
      await Promise.resolve(
        onUpdateStatus(applicationId, nextStatus as ApplicationStatus, reviewNotes || undefined),
      );
      setManagerDecisionNote("");
    } finally {
      setManagerDecisionAction(null);
    }
  };

  const handleManualStatusUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!onUpdateStatus || isUpdatingManualStatus) {
      return;
    }

    const { reviewNotes, error } = validateManagerApplicationStatusUpdate(
      manualStatusDraft,
      managerDecisionNote,
    );
    setManagerDecisionNoteError(error);
    if (error) {
      return;
    }

    setIsUpdatingManualStatus(true);
    try {
      await Promise.resolve(
        onUpdateStatus(applicationId, manualStatusDraft, reviewNotes || undefined),
      );
      setManagerDecisionNote("");
    } finally {
      setIsUpdatingManualStatus(false);
    }
  };

  const handleComplete = async () => {
    if (onUpdateStatus) {
      await Promise.resolve(
        onUpdateStatus(
          applicationId,
          APPLICATION_STATUS.COMPLETED as ApplicationStatus,
        ),
      );
      setShowCompleteConfirm(false);
    }
  };

  const handleSaleProgressionUpdate = async (nextStatus: string) => {
    if (!onUpdateStatus) {
      return;
    }

    await Promise.resolve(
      onUpdateStatus(applicationId, nextStatus as ApplicationStatus, managerDecisionNote || undefined),
    );
  };

  const buyerQualificationReady =
    buyerQualificationDraft.mortgageInPrincipleVerified ||
    buyerQualificationDraft.proofOfFundsVerified;
  const amlReviewReady =
    amlReviewDraft.identityStatus === "completed" &&
    amlReviewDraft.sourceOfFundsStatus === "completed";
  const qualificationComplete = buyerQualification?.status === "completed";
  const amlComplete = amlReview?.status === "completed";
  const purchaseOfferReady = qualificationComplete && amlComplete;
  const offerReadinessRequirements = getOfferReadinessRequirements(
    propertyComplianceReadiness,
  );
  const offerReadinessBlockers = getOfferReadinessBlockers(
    propertyComplianceReadiness,
  );
  const propertyOfferReady = isPropertyOfferReady(propertyComplianceReadiness);
  const offerAmountValue = Number(offerDraft.amount);
  const recordOfferGuard = getManagerOfferGuard({
    hasManagerLink: Boolean(application?.managerId),
    hasPropertyLink: Boolean(application?.propertyId),
    workflowError: purchaseWorkflowError,
    isRefreshing: isLoadingPurchaseWorkflow,
    qualificationComplete,
    amlComplete,
    propertyOfferReady,
    propertyReadinessReason: propertyComplianceReadiness?.status_reason,
    propertyReadinessBlockers: offerReadinessBlockers,
    hasValidAmount: Number.isFinite(offerAmountValue) && offerAmountValue > 0,
  });
  const offerLaneReady = recordOfferGuard.canRun;

  useEffect(() => {
    if (!pendingOfferFocus || !offerLaneReady) {
      return;
    }

    scrollToWorkflowSection("offer");
    setPendingOfferFocus(false);
  }, [offerLaneReady, pendingOfferFocus]);

  if (!application) {
    return (
      <div className="min-h-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-outfit">
        <div className="text-center p-8">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Application Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            This application may have been removed or doesn't exist.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    );
  }

  const displayApplication = linkedApplication || application;

  const showManagerDecisionControls =
    shouldShowManagerDecisionControls(application);
  const saleNextActions = getNextSaleJourneyActions(application.status);
  const purchaseStageLabel = purchaseDisplayStage
    ? getSaleJourneyStageLabel(purchaseDisplayStage)
    : "Purchase journey";
  const purchaseJourneySummary = getSaleJourneySummary(
    purchaseDisplayStage || application.status,
    application.journeySummary || application.journeyStatusReason,
  );

  const purchaseWorkspaceState = isLoadingPurchaseWorkflow
    ? {
        tone: "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300",
        badge: "Refreshing workflow",
        title: "Refreshing the live purchase workflow.",
        description:
          "Waiting for the latest buyer qualification, AML, and seller-readiness records before the offer lane is evaluated again.",
        actionLabel: "Open offer lane",
        targetSection: "offer" as const,
      }
    : recordOfferGuard.status === "ready"
    ? {
        tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300",
        badge: "Offer lane unlocked",
        title: "Everything is ready. Record the first buyer offer now.",
        description:
          "Buyer qualification, AML, and seller readiness are all complete. Stay on this case and record the first offer to open the live sale progression.",
        actionLabel: "Jump to record first offer",
        targetSection: "offer" as const,
      }
    : recordOfferGuard.status === "unavailable"
      ? {
          tone: "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300",
          badge: "Workflow unavailable",
          title: recordOfferGuard.title,
          description: recordOfferGuard.description,
          actionLabel: recordOfferGuard.actionLabel || "Open seller readiness",
          targetSection: (recordOfferGuard.target || "seller") as
            | "offer"
            | "seller",
        }
      : {
          tone:
            recordOfferGuard.target === "aml"
              ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
              : recordOfferGuard.target === "offer"
                ? "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"
                : "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300",
          badge:
            recordOfferGuard.target === "buyer"
              ? "Buyer qualification needed"
              : recordOfferGuard.target === "aml"
                ? "AML review needed"
                : recordOfferGuard.target === "offer"
                  ? "Offer details needed"
                  : "Seller readiness needed",
          title: recordOfferGuard.title,
          description: recordOfferGuard.description,
          actionLabel:
            recordOfferGuard.actionLabel ||
            (recordOfferGuard.target === "buyer"
              ? "Open buyer qualification"
              : recordOfferGuard.target === "aml"
                ? "Open AML review"
                : recordOfferGuard.target === "offer"
                  ? "Open offer details"
                  : "Open seller readiness"),
          targetSection: (recordOfferGuard.target || "seller") as
            | "aml"
            | "buyer"
            | "offer"
            | "seller",
        };
  const displayStatusLabel =
    isPurchaseApplication && purchaseDisplayStage
      ? purchaseStageLabel
      : application.status
          ?.replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
  const displayStatusTone = (() => {
    if (
      isPurchaseApplication &&
      purchaseDisplayStage === "buyer_qualification"
    ) {
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    }
    if (isPurchaseApplication && purchaseDisplayStage === "offer") {
      return "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400";
    }
    if (application.status === APPLICATION_STATUS.APPROVED) {
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
    if (application.status === APPLICATION_STATUS.REJECTED) {
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    }
    if (application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED) {
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    }
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  })();
  const rentCaseFileSummary = rentCaseFile
    ? summarizeCaseFileDocuments(rentCaseFile.documents, rentCaseFile.requests)
    : null;
  const rentPropertyComplianceReadiness =
    rentCaseFile?.property_compliance_readiness || null;
  const rentPropertyReadinessBlockers = dedupeJourneyBlockers(
    rentPropertyComplianceReadiness?.blockers,
  );
  const visibleApplicationBlockers = dedupeJourneyBlockers(
    application?.blockers,
  );
  const rentContractReady = isPropertyContractReady(
    rentPropertyComplianceReadiness,
  );
  const createContractGuard = getManagerCreateContractGuard({
    hasContract: Boolean(rentCaseFile?.contract_id),
    applicationApproved: application?.status === APPLICATION_STATUS.APPROVED,
    hasPropertyLink: Boolean(application?.propertyId),
    workflowError: rentWorkflowError,
    isRefreshing: isLoadingRentWorkflow,
    rentContractReady,
    propertyReadinessReason: rentPropertyComplianceReadiness?.status_reason,
    propertyReadinessBlockers: rentPropertyReadinessBlockers,
  });
  const managerRentNextAction =
    isLoadingRentWorkflow && application?.fastTrackCaseId
      ? null
      : getManagerRentNextAction({
          listingType: application?.listingType,
          applicationStatus: application?.status,
          propertyContractReady: rentContractReady,
          caseFileSummary: rentCaseFileSummary,
          referencingStatus: referencingCheck?.status,
          rightToRentStatus: rightToRentCheck?.status,
        });
  const rentApprovalReady =
    referencingCheck?.status === "completed" &&
    (rightToRentCheck?.status === "completed" ||
      rightToRentCheck?.status === "not_required");

  const renderGuidedProgressRail = (
    steps: Array<{
      key: string;
      label: string;
      description: string;
      complete: boolean;
      active: boolean;
      onClick?: () => void;
    }>,
  ) => (
    <div
      className={`mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${
        steps.length > 4 ? "2xl:grid-cols-5" : ""
      }`}
    >
      {steps.map((step, index) => {
        const statusClass = step.complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-300"
          : step.active
            ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
            : "border-gray-200 bg-white text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400";
        const badgeClass = step.complete
          ? "bg-emerald-500 text-white"
          : step.active
            ? "bg-orange-500 text-white"
            : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300";
        const statusLabel = step.complete
          ? "Done"
          : step.active
            ? "Now"
            : "Upcoming";
        const cardClassName = `rounded-2xl border px-4 py-4 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
          step.onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""
        } ${statusClass}`;

        return step.onClick ? (
          <button
            key={step.key}
            type="button"
            onClick={step.onClick}
            className={cardClassName}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClass}`}
              >
                {step.complete ? <CheckCircle size={14} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {step.label}
                  </span>
                  <span className="rounded-full border border-current/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          </button>
        ) : (
          <div key={step.key} className={cardClassName}>
            <div className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${badgeClass}`}
              >
                {step.complete ? <CheckCircle size={14} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {step.label}
                  </span>
                  <span className="rounded-full border border-current/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    {statusLabel}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                  {step.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const purchaseGuidedSteps = [
    {
      key: "buyer",
      label: "Buyer qualification",
      description:
        "Check proof of funds or a mortgage in principle before anything else moves.",
      complete: qualificationComplete,
      active: purchaseWorkspaceState.targetSection === "buyer",
      onClick: () => scrollToWorkflowSection("buyer"),
    },
    {
      key: "aml",
      label: "AML review",
      description:
        "Finish identity and source-of-funds review so the offer lane can open.",
      complete: amlComplete,
      active: purchaseWorkspaceState.targetSection === "aml",
      onClick: () => scrollToWorkflowSection("aml"),
    },
    {
      key: "seller",
      label: "Seller readiness",
      description:
        "Clear the property compliance pack before the first offer is recorded.",
      complete: propertyOfferReady,
      active: purchaseWorkspaceState.targetSection === "seller",
      onClick: () => scrollToWorkflowSection("seller"),
    },
    {
      key: "offer",
      label: "Record first offer",
      description:
        "Record the buyer's first offer and open the live sale progression.",
      complete: Boolean(showsLiveSaleJourney),
      active: purchaseWorkspaceState.targetSection === "offer",
      onClick: () => scrollToWorkflowSection("offer"),
    },
  ];

  const rentDocumentsComplete = Boolean(
    rentCaseFileSummary &&
      rentCaseFileSummary.totalRequestCount > 0 &&
      rentCaseFileSummary.openRequestCount === 0 &&
      rentCaseFileSummary.pendingReviewCount === 0 &&
      rentCaseFileSummary.reuploadCount === 0,
  );
  const rentGuidedSteps = [
    {
      key: "documents",
      label: "Documents",
      description:
        "Open the shared case file and keep client uploads in sync here.",
      complete: rentDocumentsComplete,
      active: managerRentNextAction?.panel === "documents",
      onClick: () => setActiveTab("documents"),
    },
    {
      key: "referencing",
      label: "Referencing",
      description:
        "Run referencing after the viewing and mark it complete on this page.",
      complete: referencingCheck?.status === "completed",
      active: managerRentNextAction?.panel === "referencing",
      onClick: () => scrollToRentPanel("referencing"),
    },
    {
      key: "compliance",
      label: "Right-to-rent",
      description:
        "Complete the right-to-rent or equivalent jurisdiction check here.",
      complete:
        rightToRentCheck?.status === "completed" ||
        rightToRentCheck?.status === "not_required",
      active: managerRentNextAction?.panel === "compliance",
      onClick: () => scrollToRentPanel("compliance"),
    },
    {
      key: "approval",
      label: "Approval",
      description:
        "Approve once referencing and right-to-rent are both clear.",
      complete: application.status === APPLICATION_STATUS.APPROVED,
      active: managerRentNextAction?.panel === "approval",
      onClick: () => scrollToRentPanel("approval"),
    },
    {
      key: "contract",
      label: "Contract",
      description:
        "Create or open the contract after the property pack is ready.",
      complete: Boolean(rentCaseFile?.contract_id),
      active:
        managerRentNextAction?.id === "open_create_contract" ||
        Boolean(rentCaseFile?.contract_id),
      onClick: () => handleRentContractAction(),
    },
  ];

  const refreshManagedPurchaseWorkflow = async () => {
    if (!application || !supportsManagedPurchaseWorkflow) {
      return;
    }

    setIsLoadingPurchaseWorkflow(true);
    setPurchaseWorkflowError(null);
    resetManagedPurchaseWorkflowState();
    try {
      await Promise.all([
        loadManagedPurchaseWorkflow(application),
        fetchApplications(),
      ]);
    } catch (error: any) {
      resetManagedPurchaseWorkflowState();
      setPurchaseWorkflowError(
        error?.message || "Unable to refresh the live purchase workflow right now.",
      );
      throw error;
    } finally {
      setIsLoadingPurchaseWorkflow(false);
    }
  };

  const refreshRentWorkflow = async () => {
    if (!application || !isRentApplication) {
      return;
    }

    setIsLoadingRentWorkflow(true);
    setRentWorkflowError(null);
    resetManagedRentWorkflowState();
    try {
      await Promise.all([loadRentWorkflow(application), fetchApplications()]);
    } catch (error: any) {
      resetManagedRentWorkflowState();
      setRentWorkflowError(
        error?.message || "Unable to refresh the live rent workflow right now.",
      );
      throw error;
    } finally {
      setIsLoadingRentWorkflow(false);
    }
  };

  const handleReferencingStatusUpdate = async (
    status: "in_progress" | "completed",
  ) => {
    if (!application) {
      return;
    }

    const { reviewNotes, error } = validateManagerWorkflowNote(
      referencingDraft.reviewNotes,
    );
    setReferencingError(error);
    if (error) {
      return;
    }

    setRentWorkflowAction(`referencing:${status}`);
    try {
      const result = await updateReferencingCheck(application.id, {
        status,
        review_notes:
          reviewNotes ||
          (status === "completed"
            ? "Referencing completed from the manager application workflow."
            : "Referencing started from the manager application workflow."),
      }, managerWorkflowRequestOptions);
      if (result.error) {
        throw new Error(result.error);
      }

      await refreshRentWorkflow();
      scrollToRentPanel(
        status === "completed" ? "compliance" : "referencing",
      );
      toast.success(
        status === "completed"
          ? "Referencing marked complete."
          : "Referencing started.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Unable to update referencing right now.");
    } finally {
      setRentWorkflowAction(null);
    }
  };

  const handleRightToRentStatusUpdate = async (
    status: "in_progress" | "completed" | "not_required",
  ) => {
    if (!application) {
      return;
    }

    const { evidenceType, reviewNotes, error } = validateRightToRentUpdate(
      status,
      rightToRentDraft.evidenceType,
      rightToRentDraft.reviewNotes,
    );
    setRightToRentError(error);
    if (error) {
      return;
    }

    setRentWorkflowAction(`right_to_rent:${status}`);
    try {
      const result = await updateRightToRentCheck(application.id, {
        status,
        evidence_type: status === "not_required" ? "" : evidenceType,
        time_limited: status === "not_required" ? false : rightToRentDraft.timeLimited,
        review_notes:
          reviewNotes ||
          (status === "completed"
            ? "Right-to-rent check completed from the manager application workflow."
            : status === "not_required"
              ? "Jurisdiction-specific right-to-rent check marked as not required."
              : "Right-to-rent check started from the manager application workflow."),
        checked_at:
          status === "completed" ? new Date().toISOString() : undefined,
      }, managerWorkflowRequestOptions);
      if (result.error) {
        throw new Error(result.error);
      }

      await refreshRentWorkflow();
      scrollToRentPanel(
        status === "completed" || status === "not_required"
          ? "approval"
          : "compliance",
      );
      toast.success(
        status === "completed"
          ? "Compliance check marked complete."
          : status === "not_required"
            ? "Compliance check marked as not required."
            : "Compliance review started.",
      );
    } catch (error: any) {
      toast.error(
        error?.message || "Unable to update the compliance check right now.",
      );
    } finally {
      setRentWorkflowAction(null);
    }
  };

  const handleApproveRentApplication = async () => {
    if (!application) {
      return;
    }

    setRentWorkflowAction("approve");
    try {
      if (onUpdateStatus) {
        await Promise.resolve(
          onUpdateStatus(application.id, APPLICATION_STATUS.APPROVED as ApplicationStatus),
        );
      } else {
        const result = await updateApplicationWorkflowStatus(
          application.id,
          "approved",
          "Approved from the manager application workflow.",
          managerWorkflowRequestOptions,
        );
        if (result.error) {
          throw new Error(result.error);
        }
      }

      await refreshRentWorkflow();
      scrollToRentPanel(rentContractReady ? "approval" : "property_readiness");
      toast.success("Application approved and moved into the contract stage.");
    } catch (error: any) {
      toast.error(
        error?.message || "Unable to approve the application right now.",
      );
    } finally {
      setRentWorkflowAction(null);
    }
  };

  const handleOpenRentWorkspace = (path: string) => {
    if (!application) {
      return;
    }

    navigate(
      buildWorkspacePath(path, {
        applicationId: application.id,
        caseId: application.fastTrackCaseId,
        leadId: application.leadId,
        propertyId: application.propertyId,
        contractId: rentCaseFile?.contract_id,
      }),
    );
  };

  const handleRentContractAction = () => {
    if (rentCaseFile?.contract_id) {
      handleOpenRentWorkspace("/manager/contracts");
      return;
    }

    if (!createContractGuard.canRun) {
      if (createContractGuard.target === "property_readiness") {
        scrollToRentPanel("property_readiness");
      } else if (createContractGuard.target === "approval") {
        scrollToRentPanel("approval");
      }

      if (createContractGuard.status === "unavailable") {
        toast.error(createContractGuard.description);
      } else {
        toast.warning(createContractGuard.description);
      }
      return;
    }

    setShowContractModal(true);
  };

  const handleManagerRentNextAction = async () => {
    if (!managerRentNextAction) {
      return;
    }

    switch (managerRentNextAction.panel) {
      case "documents":
        setActiveTab("documents");
        return;
      case "appointments":
        handleOpenRentWorkspace("/manager/appointments");
        return;
      case "referencing":
        await handleReferencingStatusUpdate(
          referencingCheck?.status === "in_progress"
            ? "completed"
            : "in_progress",
        );
        return;
      case "compliance":
        await handleRightToRentStatusUpdate(
          rightToRentCheck?.status === "in_progress"
            ? "completed"
            : "in_progress",
        );
        return;
      case "property_readiness":
        handleRentContractAction();
        return;
      case "approval":
        if (managerRentNextAction.id === "open_create_contract") {
          handleRentContractAction();
          return;
        }

        await handleApproveRentApplication();
        return;
      default:
        return;
    }
  };

  const handleBuyerQualificationUpdate = async () => {
    if (!application) {
      return;
    }

    const { reviewNotes, error } = validateManagerWorkflowNote(
      buyerQualificationDraft.reviewNotes,
    );
    setBuyerQualificationError(error);
    if (error) {
      return;
    }

    setPurchaseWorkflowAction("buyer_qualification");
    try {
      const result = await updateBuyerQualification(application.id, {
        status: buyerQualificationReady ? "completed" : "pending",
        review_notes: reviewNotes,
        verified_at: buyerQualificationReady
          ? new Date().toISOString()
          : undefined,
        mortgage_in_principle_verified:
          buyerQualificationDraft.mortgageInPrincipleVerified,
        proof_of_funds_verified: buyerQualificationDraft.proofOfFundsVerified,
      }, managerWorkflowRequestOptions);
      if (result.error) {
        throw new Error(result.error);
      }

      setPendingOfferFocus(buyerQualificationReady);
      await refreshManagedPurchaseWorkflow();
      scrollToWorkflowSection(buyerQualificationReady ? "aml" : "buyer");
      toast.success(
        buyerQualificationReady
          ? "Buyer qualification completed."
          : "Buyer qualification saved as pending.",
      );
    } catch (error: any) {
      toast.error(
        error?.message || "Unable to update buyer qualification right now.",
      );
    } finally {
      setPurchaseWorkflowAction(null);
    }
  };

  const handleAMLReviewUpdate = async () => {
    if (!application) {
      return;
    }

    const { reviewNotes, error } = validateManagerWorkflowNote(
      amlReviewDraft.reviewNotes,
    );
    setAmlReviewError(error);
    if (error) {
      return;
    }

    setPurchaseWorkflowAction("aml_review");
    try {
      const result = await updateAMLReview(application.id, {
        status: amlReviewReady ? "completed" : "pending",
        review_notes: reviewNotes,
        verified_at: amlReviewReady ? new Date().toISOString() : undefined,
        identity_status: amlReviewDraft.identityStatus,
        source_of_funds_status: amlReviewDraft.sourceOfFundsStatus,
      }, managerWorkflowRequestOptions);
      if (result.error) {
        throw new Error(result.error);
      }

      setPendingOfferFocus(amlReviewReady);
      await refreshManagedPurchaseWorkflow();
      scrollToWorkflowSection(amlReviewReady ? "seller" : "aml");
      toast.success(
        amlReviewReady
          ? "AML review completed."
          : "AML review saved as pending.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Unable to update AML review right now.");
    } finally {
      setPurchaseWorkflowAction(null);
    }
  };

  const handleCreateOffer = async () => {
    if (!recordOfferGuard.canRun) {
      if (recordOfferGuard.target === "buyer") {
        scrollToWorkflowSection("buyer");
      } else if (recordOfferGuard.target === "aml") {
        scrollToWorkflowSection("aml");
      } else if (recordOfferGuard.target === "seller") {
        scrollToWorkflowSection("seller");
      } else if (recordOfferGuard.target === "offer") {
        scrollToWorkflowSection("offer");
      }

      toast.error(recordOfferGuard.description);
      return;
    }

    setPurchaseWorkflowAction("create_offer");
    try {
      const offerNoteValidation = validateManagerWorkflowNote(offerDraft.notes);
      if (offerNoteValidation.error) {
        toast.error(offerNoteValidation.error);
        return;
      }

      const propertyId = application.propertyId!;
      const managerId = application.managerId!;
      const offerResult = await createOffer({
        application_id: application.id,
        property_id: propertyId,
        manager_id: managerId,
        lead_id: application.leadId,
        fast_track_case_id: application.fastTrackCaseId,
        amount: offerAmountValue,
        notes: offerNoteValidation.reviewNotes,
      }, { suppressErrorToast: true });
      if (offerResult.error || !offerResult.data) {
        throw new Error(
          offerResult.error || "Unable to create the offer record.",
        );
      }

      const refreshResults = await Promise.allSettled([
        getSaleProgressions({ suppressErrorToast: true }),
        fetchApplications(),
      ]);
      const refreshHadError = refreshResults.some(
        (result) => result.status === "rejected",
      );

      navigate(
        buildWorkspacePath("/manager/applications", {
          caseId: application.fastTrackCaseId,
          leadId: application.leadId,
          propertyId: application.propertyId,
        }),
      );
      toast.success(
        refreshHadError
          ? "Buyer offer recorded. The applications workspace is refreshing in the background."
          : "Buyer offer recorded and the live sale progression is now open.",
      );
    } catch (error: any) {
      if (String(error?.message || "").includes("seller property pack")) {
        try {
          await refreshManagedPurchaseWorkflow();
        } catch {
          // Keep the original offer error visible if the refresh also fails.
        }
      }
      toast.error(
        error?.message || "Unable to record the buyer offer right now.",
      );
    } finally {
      setPurchaseWorkflowAction(null);
    }
  };

  const handlePropertyComplianceDraftChange = (
    requirementCode: string,
    updates: Partial<PropertyComplianceEvidenceDraft>,
  ) => {
    setPropertyComplianceDrafts((previous) => ({
      ...previous,
      [requirementCode]: {
        status: previous[requirementCode]?.status || "pending",
        referenceNumber: previous[requirementCode]?.referenceNumber || "",
        reviewNotes: previous[requirementCode]?.reviewNotes || "",
        ...updates,
      },
    }));
  };

  const handlePropertyReadinessUpdate = async (
    requirementCode: string,
    requirementLabel: string,
  ) => {
    if (!application?.propertyId) {
      toast.error(
        "This purchase application is missing the property link needed for seller readiness.",
      );
      return;
    }

    const draft = propertyComplianceDrafts[requirementCode];
    if (!draft) {
      toast.error("The seller-readiness record is not ready to update yet.");
      return;
    }
    const noteValidation = validateManagerWorkflowNote(draft.reviewNotes);
    if (noteValidation.error) {
      toast.error(noteValidation.error);
      return;
    }
    const referenceNumber = normalizeManagerApplicationReviewNote(
      draft.referenceNumber,
    );

    setPurchaseWorkflowAction(`property_compliance:${requirementCode}`);
    try {
      const normalizedRequirementCode =
        normalizePropertyComplianceCode(requirementCode);
      const result = await upsertPropertyComplianceEvidence(
        application.propertyId,
        normalizedRequirementCode,
        {
          status: draft.status,
          jurisdiction: propertyComplianceReadiness?.jurisdiction_profile,
          reference_number: referenceNumber || undefined,
          review_notes: noteValidation.reviewNotes || undefined,
        },
        managerWorkflowRequestOptions,
      );
      if (result.error) {
        throw new Error(result.error);
      }

      setPendingOfferFocus(
        draft.status === "completed" || draft.status === "waived",
      );
      await refreshManagedPurchaseWorkflow();
      if (!(draft.status === "completed" || draft.status === "waived")) {
        scrollToWorkflowSection("seller");
      }
      toast.success(`${requirementLabel} saved.`);
    } catch (error: any) {
      toast.error(
        error?.message ||
          `Unable to update ${requirementLabel.toLowerCase()} right now.`,
      );
    } finally {
      setPurchaseWorkflowAction(null);
    }
  };

  const handleOpenConversation = async () => {
    if (openingConversation) {
      return;
    }
    if (application.conversationId && !application.fastTrackCaseId) {
      navigate(`/manager/messages?conversation=${application.conversationId}`);
      return;
    }
    if (!application.userId || !user) {
      toast.error("The client conversation is not ready yet.");
      return;
    }

    setOpeningConversation(true);
    try {
      const conversation = await messagesService.upsertDirectConversation(
        application.userId,
        {
          propertyId: application.propertyId,
          propertyTitle: application.propertyTitle,
          propertyAddress: application.propertyAddress,
          propertyImage: application.propertyImage,
          fastTrackCaseId: application.fastTrackCaseId,
          listingType:
            application.listingType === "buy"
              ? "sale"
              : application.listingType,
          propertyPrice: application.propertyPrice,
          senderName: user.user_metadata?.full_name || user.name || user.email,
          senderEmail: user.email,
          senderPhone: user.phone || user.user_metadata?.phone || "",
        },
      );
      navigate(`/manager/messages?conversation=${conversation.id}`);
    } catch (error: any) {
      toast.error(
        error?.message || "Unable to open the client conversation right now.",
      );
    } finally {
      setOpeningConversation(false);
    }
  };

  interface ActivityItem {
    id: number;
    type: string;
    title: string;
    description: string;
    date: string;
    icon: LucideIcon;
    color: "blue" | "orange" | "green" | "red" | "yellow" | "gray";
  }

  const getActivityHistory = (): ActivityItem[] => {
    const history: ActivityItem[] = [
      {
        id: 1,
        type: "submitted",
        title: "Application Submitted",
        description: "Your application was successfully submitted",
        date: application.submittedDate || application.createdAt,
        icon: FileText,
        color: "blue",
      },
    ];

    const submittedTime = new Date(
      application.submittedDate || application.createdAt,
    ).getTime();

    if (
      application.status !== APPLICATION_STATUS.PENDING &&
      application.status !== APPLICATION_STATUS.SUBMITTED
    ) {
      history.push({
        id: 2,
        type: "review",
        title: "Under Review",
        description: "Agent started reviewing your application",
        date: new Date(submittedTime + 24 * 60 * 60 * 1000).toISOString(),
        icon: Clock,
        color: "orange",
      });
    }

    if (application.status === APPLICATION_STATUS.DOCUMENTS_REQUESTED) {
      history.push({
        id: 3,
        type: "documents",
        title: "Documents Requested",
        description: "Additional documents are required",
        date: new Date(submittedTime + 2 * 24 * 60 * 60 * 1000).toISOString(),
        icon: AlertCircle,
        color: "yellow",
      });
    }

    if (application.status === APPLICATION_STATUS.APPROVED) {
      history.push({
        id: 4,
        type: "approved",
        title: "Application Approved",
        description: "Congratulations! Your application has been approved",
        date: application.lastUpdated || new Date().toISOString(),
        icon: CheckCircle,
        color: "green",
      });
    }

    if (application.status === APPLICATION_STATUS.REJECTED) {
      history.push({
        id: 4,
        type: "rejected",
        title: "Application Not Approved",
        description: "Unfortunately, your application was not approved",
        date: application.lastUpdated || new Date().toISOString(),
        icon: XCircle,
        color: "red",
      });
    }

    if (application.status === APPLICATION_STATUS.COMPLETED) {
      history.push({
        id: 5,
        type: "completed",
        title:
          application.listingType === "rent"
            ? "Keys Collected"
            : "Handover Complete",
        description:
          application.listingType === "rent"
            ? "You have collected the keys and moved in"
            : "Key handover completed successfully",
        date: application.lastUpdated || new Date().toISOString(),
        icon: Key,
        color: "green",
      });
    }

    if (application.status === APPLICATION_STATUS.WITHDRAWN) {
      history.push({
        id: 4,
        type: "withdrawn",
        title: "Application Withdrawn",
        description: "You withdrew this application",
        date: application.lastUpdated || new Date().toISOString(),
        icon: XCircle,
        color: "gray",
      });
    }

    return history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  };

  const activityHistory = getActivityHistory();

  const tabs: Array<{ id: ManagerApplicationTab; label: string; icon: LucideIcon }> = [
    { id: "overview", label: "Overview", icon: Home },
    { id: "documents", label: "Documents", icon: FileText },
    { id: "history", label: "Activity", icon: History },
  ];

  return (
    <div className="min-h-full bg-gray-50 dark:bg-gray-900 font-outfit">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="font-medium">Back to Applications</span>
            </button>

            <div className="flex flex-wrap items-center justify-end gap-3">
              {showManagerDecisionControls && (
                <>
                  <div className="w-full min-w-[16rem] sm:w-64">
                    <label className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                      Review note
                      <textarea
                        value={managerDecisionNote}
                        onChange={(event) => {
                          setManagerDecisionNote(event.target.value);
                          if (managerDecisionNoteError) {
                            setManagerDecisionNoteError("");
                          }
                        }}
                        rows={2}
                        maxLength={MAX_MANAGER_APPLICATION_REVIEW_NOTE_LENGTH + 1}
                        aria-invalid={Boolean(managerDecisionNoteError)}
                        aria-describedby={managerDecisionNoteError ? "manager-application-review-note-error" : undefined}
                        className="mt-1 block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-900 outline-none transition focus:border-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    </label>
                    {managerDecisionNoteError && (
                      <p id="manager-application-review-note-error" className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                        {managerDecisionNoteError}
                      </p>
                    )}
                  </div>
                  <form
                    onSubmit={handleManualStatusUpdate}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
                      Manual status update
                      <select
                        value={manualStatusDraft}
                        onChange={(event) => setManualStatusDraft(event.target.value as ApplicationStatus)}
                        className="ml-0 mt-1 block rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm normal-case tracking-normal text-gray-900 outline-none transition focus:border-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white sm:ml-2 sm:mt-0 sm:inline-block"
                      >
                        <option value={APPLICATION_STATUS.SUBMITTED}>Submitted</option>
                        <option value={APPLICATION_STATUS.UNDER_REVIEW}>Under review</option>
                        <option value={APPLICATION_STATUS.DOCUMENTS_REQUESTED}>Documents requested</option>
                        <option value={APPLICATION_STATUS.APPROVED}>Approved</option>
                        <option value={APPLICATION_STATUS.REJECTED}>Rejected</option>
                        <option value={APPLICATION_STATUS.COMPLETED}>Completed</option>
                      </select>
                    </label>
                    <button
                      type="submit"
                      disabled={isUpdatingManualStatus || managerDecisionAction !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      {isUpdatingManualStatus && <ActionSpinner size={16} className="" />}
                      Save status
                    </button>
                  </form>
                  <button
                    type="button"
                    aria-label="Mark application under review"
                    onClick={() => void handleManagerDecision("under_review")}
                    disabled={managerDecisionAction !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-orange-300 dark:border-orange-700 rounded-lg text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {managerDecisionAction === "under_review" ? (
                      <ActionSpinner size={16} className="" />
                    ) : (
                      <Clock size={16} />
                    )}
                    Under review
                  </button>
                  <button
                    type="button"
                    aria-label="Request documents for application"
                    onClick={() =>
                      void handleManagerDecision("documents_requested")
                    }
                    disabled={managerDecisionAction !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-amber-300 dark:border-amber-700 rounded-lg text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {managerDecisionAction === "documents_requested" ? (
                      <ActionSpinner size={16} className="" />
                    ) : (
                      <FileCheck size={16} />
                    )}
                    Request documents
                  </button>
                  <button
                    type="button"
                    aria-label="Reject application"
                    onClick={() => void handleManagerDecision("rejected")}
                    disabled={managerDecisionAction !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {managerDecisionAction === "rejected" ? (
                      <ActionSpinner size={16} className="" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Reject application
                  </button>
                  <button
                    type="button"
                    aria-label="Approve application"
                    onClick={() => void handleManagerDecision("approved")}
                    disabled={managerDecisionAction !== null}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {managerDecisionAction === "approved" ? (
                      <ActionSpinner size={16} className="" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    Approve application
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
        {/* Property Header Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row">
            {/* Property Image */}
            <div className="lg:w-80 h-48 lg:h-auto flex-shrink-0">
              <img
                src={application.propertyImage}
                alt={application.propertyTitle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    PROPERTY_PLACEHOLDER_IMAGE;
                }}
              />
            </div>

            {/* Property Info */}
            <div className="flex-1 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        application.listingType === "rent"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      }`}
                    >
                      {application.listingType === "rent"
                        ? "Rental"
                        : "Purchase"}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      Ref: {application.referenceId}
                    </span>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {application.propertyTitle || "Untitled Property"}
                  </h1>

                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-4">
                    <MapPin size={16} />
                    <span>
                      {application.propertyAddress || "Address not specified"}
                    </span>
                  </div>

                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {formatPrice(application.propertyPrice)}
                    {application.listingType === "rent" && (
                      <span className="text-base font-normal text-gray-500 ml-1">
                        /month
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/manager/dashboard/properties/${application.propertyId}`,
                    )
                  }
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                >
                  <span>View Property</span>
                  <ExternalLink size={16} />
                </button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Submitted
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(
                      application.submittedDate || application.createdAt,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Last Updated
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatDate(
                      application.lastUpdated || application.createdAt,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Property Type
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {application.propertyType || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Application Type
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {application.listingType === "rent" ? "Rental" : "Purchase"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="mb-6">
          <StatusTracker
            status={application.status}
            listingType={application.listingType}
            liveStage={application.liveStage}
            source={application.source}
            linkedViewingStatus={displayApplication.fastTrackCase?.viewing?.status}
          />
        </div>
        {displayApplication.fastTrackCase && (
          <div className="mb-6">
            <FastTrackCompanionPanel
              role="manager"
              fastTrackCase={displayApplication.fastTrackCase}
              context={{
                applicationId: displayApplication.id,
                caseId: displayApplication.fastTrackCase.caseId,
                leadId: displayApplication.leadId,
                propertyId: displayApplication.propertyId,
                contractId: rentCaseFile?.contract_id,
              }}
              title="Linked fast-track controls"
              onRefresh={fetchApplications}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
          <div className="border-b border-gray-100 dark:border-gray-700">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === tab.id
                        ? "border-orange-500 text-orange-600 dark:text-orange-400"
                        : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Agent Information */}
                <div
                  ref={agentInfoSectionRef}
                  className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <User size={20} className="text-orange-500" />
                    Agent Information
                  </h3>
                  <div className="flex items-start gap-4">
                    <Avatar
                      userId={application.managerId}
                      name={application.agentName}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {application.agentName}
                      </h4>
                      {application.agentAgency && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Building2 size={14} />
                          {application.agentAgency}
                        </p>
                      )}
                      {application.agentEmail && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Mail size={14} />
                          {application.agentEmail}
                        </p>
                      )}
                      {application.agentPhone && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Phone size={14} />
                          {application.agentPhone}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => void handleOpenConversation()}
                    disabled={openingConversation}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-all shadow-sm"
                  >
                    <MessageSquare size={18} />
                    <span>
                      {openingConversation
                        ? "Opening thread..."
                        : "Message Agent"}
                    </span>
                  </button>
                </div>

                {/* Application Summary */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Briefcase size={20} className="text-orange-500" />
                    Application Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">
                        Application ID
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white font-mono text-sm">
                        {application.referenceId}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">
                        Type
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white capitalize">
                        {application.listingType === "rent"
                          ? "Rental Application"
                          : "Purchase Application"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">
                        Property Value
                      </span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatPrice(application.propertyPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-gray-500 dark:text-gray-400">
                        Status
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${displayStatusTone}`}
                      >
                        {displayStatusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {showsLiveSaleJourney && (
                  <div
                    ref={liveJourneySectionRef}
                    className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
                          Live sale journey
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                          {application.journeyLabel ||
                            getSaleJourneyStageLabel(application)}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                          {getSaleJourneySummary(
                            application.status,
                            application.journeySummary,
                          )}
                        </p>
                      </div>
                      <div className="min-w-[220px] rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                        {saleNextActions.length > 0
                          ? "Advance the purchase stage from here so both dashboards stay aligned live."
                          : "This purchase journey is already at its final recorded stage."}
                      </div>
                    </div>

                    {saleNextActions.length > 0 && (
                      <div className="mt-6 grid gap-3 md:grid-cols-2">
                        {saleNextActions.map((action) => (
                          <button
                            key={action.status}
                            onClick={() =>
                              void handleSaleProgressionUpdate(action.status)
                            }
                            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-left transition-colors hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-700 dark:hover:bg-gray-800"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-gray-900 dark:text-white">
                                {action.label}
                              </span>
                              <ChevronRight
                                size={18}
                                className="text-orange-500"
                              />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                              {action.description}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {supportsManagedPurchaseWorkflow && !isSaleProgression && (
                  <div
                    ref={purchaseWorkspaceSectionRef}
                    className="lg:col-span-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
                          Guided purchase workspace
                        </p>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                          Next step
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                          {purchaseJourneySummary}
                        </p>
                      </div>
                      <div className="min-w-[220px] rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                        {offerLaneReady
                          ? "Qualification, AML, and seller readiness are cleared. Record the first buyer offer to open the live sale progression."
                          : purchaseOfferReady
                            ? "Buyer qualification and AML are clear. Finish the seller readiness pack here to open the offer lane."
                          : "Clear buyer qualification, AML, and seller readiness from here so the offer lane can open without leaving this case."}
                      </div>
                    </div>

                    {renderGuidedProgressRail(purchaseGuidedSteps)}

                    {visibleApplicationBlockers.length > 0 && (
                        <div className="mt-6 grid gap-3 md:grid-cols-2">
                          {visibleApplicationBlockers.map((blocker) => (
                            <div
                              key={blocker.code}
                              className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-4 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                            >
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {blocker.title}
                              </p>
                              <p className="mt-2 leading-6">
                                {blocker.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                    <div
                      className={`mt-6 rounded-2xl border px-5 py-5 ${purchaseWorkspaceState.tone}`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="max-w-3xl">
                          <p className="text-xs font-semibold uppercase tracking-[0.24em]">
                            {purchaseWorkspaceState.badge}
                          </p>
                          <h4 className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">
                            {purchaseWorkspaceState.title}
                          </h4>
                          <p className="mt-2 text-sm leading-6">
                            {purchaseWorkspaceState.description}
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            scrollToWorkflowSection(
                              purchaseWorkspaceState.targetSection,
                            )
                          }
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-900 dark:text-white dark:hover:bg-gray-800"
                        >
                          {purchaseWorkspaceState.actionLabel}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
                      <section
                        ref={buyerQualificationSectionRef}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Buyer qualification
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Proof of funds or MIP must be checked before the
                              offer moves forward.
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              buyerQualification?.status === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}
                          >
                            {(buyerQualification?.status || "pending").replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={
                                buyerQualificationDraft.mortgageInPrincipleVerified
                              }
                              onChange={(event) =>
                                setBuyerQualificationDraft((previous) => ({
                                  ...previous,
                                  mortgageInPrincipleVerified:
                                    event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                            />
                            Mortgage in Principle verified
                          </label>
                          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={
                                buyerQualificationDraft.proofOfFundsVerified
                              }
                              onChange={(event) =>
                                setBuyerQualificationDraft((previous) => ({
                                  ...previous,
                                  proofOfFundsVerified: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                            />
                            Proof of funds verified
                          </label>
                          <textarea
                            value={buyerQualificationDraft.reviewNotes}
                            onChange={(event) => {
                              setBuyerQualificationError("");
                              setBuyerQualificationDraft((previous) => ({
                                ...previous,
                                reviewNotes: event.target.value,
                              }));
                            }}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            placeholder="Add notes about the affordability evidence or follow-up needed."
                          />
                          {buyerQualificationError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {buyerQualificationError}
                            </p>
                          ) : null}
                          <button
                            onClick={() =>
                              void handleBuyerQualificationUpdate()
                            }
                            disabled={purchaseWorkflowAction !== null}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {purchaseWorkflowAction ===
                            "buyer_qualification" ? (
                              <ActionSpinner size={16} className="" />
                            ) : null}
                            {buyerQualificationReady
                              ? "Complete buyer qualification"
                              : "Save as pending"}
                          </button>
                        </div>
                      </section>

                      <section
                        ref={amlSectionRef}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              AML review
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Identity and source-of-funds checks must both be
                              complete before the offer is recorded.
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              amlReview?.status === "completed"
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}
                          >
                            {(amlReview?.status || "pending").replace(
                              /_/g,
                              " ",
                            )}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                              Identity status
                            </span>
                            <select
                              value={amlReviewDraft.identityStatus}
                              onChange={(event) => {
                                setAmlReviewError("");
                                setAmlReviewDraft((previous) => ({
                                  ...previous,
                                  identityStatus: event.target.value,
                                }));
                              }}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                              Source of funds
                            </span>
                            <select
                              value={amlReviewDraft.sourceOfFundsStatus}
                              onChange={(event) => {
                                setAmlReviewError("");
                                setAmlReviewDraft((previous) => ({
                                  ...previous,
                                  sourceOfFundsStatus: event.target.value,
                                }));
                              }}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            >
                              <option value="pending">Pending</option>
                              <option value="completed">Completed</option>
                            </select>
                          </label>
                          <textarea
                            value={amlReviewDraft.reviewNotes}
                            onChange={(event) => {
                              setAmlReviewError("");
                              setAmlReviewDraft((previous) => ({
                                ...previous,
                                reviewNotes: event.target.value,
                              }));
                            }}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            placeholder="Add AML or source-of-funds notes for the live audit trail."
                          />
                          {amlReviewError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {amlReviewError}
                            </p>
                          ) : null}
                          <button
                            onClick={() => void handleAMLReviewUpdate()}
                            disabled={purchaseWorkflowAction !== null}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {purchaseWorkflowAction === "aml_review" ? (
                              <ActionSpinner size={16} className="" />
                            ) : null}
                            {amlReviewReady
                              ? "Complete AML review"
                              : "Save AML status"}
                          </button>
                        </div>
                      </section>

                      <section
                        ref={sellerReadinessSectionRef}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Seller readiness pack
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Seller instruction, material information, and any
                              Scottish Home Report requirement must be ready
                              before the first offer is recorded.
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              propertyOfferReady
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            }`}
                          >
                            {propertyOfferReady
                              ? "Offer ready"
                              : "Action needed"}
                          </span>
                        </div>

                        <div className="mt-4 space-y-4">
                          {propertyComplianceReadiness?.status_reason && (
                            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                              {propertyComplianceReadiness.status_reason}
                            </div>
                          )}

                          {offerReadinessRequirements.length > 0 ? (
                            offerReadinessRequirements.map((requirement) => {
                              const draft = propertyComplianceDrafts[
                                requirement.code
                              ] || {
                                status: "pending",
                                referenceNumber: "",
                                reviewNotes: "",
                              };
                              const requirementBlocker = findRequirementBlocker(
                                offerReadinessBlockers,
                                requirement.code,
                              );
                              const actionKey = `property_compliance:${requirement.code}`;
                              const draftStatusLabel =
                                getPropertyComplianceStatusLabel(draft.status);
                              const requirementStatusTone =
                                draft.status === "completed" ||
                                draft.status === "waived"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";

                              return (
                                <div
                                  key={requirement.code}
                                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {requirement.label}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                        {requirementBlocker?.description ||
                                          requirement.description ||
                                          "Record the seller-side readiness evidence for this offer stage."}
                                      </p>
                                    </div>
                                    <span
                                      className={`rounded-full px-3 py-1 text-xs font-semibold ${requirementStatusTone}`}
                                    >
                                      {draftStatusLabel}
                                    </span>
                                  </div>

                                  <div className="mt-4 space-y-3">
                                    <label className="block text-sm">
                                      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                                        Status
                                      </span>
                                      <select
                                        value={draft.status}
                                        onChange={(event) =>
                                          handlePropertyComplianceDraftChange(
                                            requirement.code,
                                            {
                                              status: event.target.value,
                                            },
                                          )
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                      >
                                        <option value="pending">Pending</option>
                                        <option value="completed">
                                          Completed
                                        </option>
                                        <option value="waived">Waived</option>
                                      </select>
                                    </label>
                                    <label className="block text-sm">
                                      <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                                        Reference or note
                                      </span>
                                      <input
                                        type="text"
                                        value={draft.referenceNumber}
                                        onChange={(event) =>
                                          handlePropertyComplianceDraftChange(
                                            requirement.code,
                                            {
                                              referenceNumber:
                                                event.target.value,
                                            },
                                          )
                                        }
                                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                        placeholder="Add a pack ref, file note, or authority record id."
                                      />
                                    </label>
                                    <textarea
                                      value={draft.reviewNotes}
                                      onChange={(event) =>
                                        handlePropertyComplianceDraftChange(
                                          requirement.code,
                                          {
                                            reviewNotes: event.target.value,
                                          },
                                        )
                                      }
                                      rows={3}
                                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                                      placeholder="Add context about the seller pack, material information, or next follow-up."
                                    />
                                    <button
                                      onClick={() =>
                                        void handlePropertyReadinessUpdate(
                                          requirement.code,
                                          requirement.label,
                                        )
                                      }
                                      disabled={purchaseWorkflowAction !== null}
                                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {purchaseWorkflowAction === actionKey ? (
                                        <ActionSpinner
                                          size={16}
                                          className=""
                                        />
                                      ) : null}
                                      Save {requirement.label}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                              The property does not currently expose any
                              seller-side offer-readiness requirements for this
                              purchase lane.
                            </div>
                          )}
                        </div>
                      </section>

                      <section
                        ref={offerSectionRef}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-gray-700 dark:bg-gray-800"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                              Record first offer
                            </p>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                              Once qualification and AML are complete, the live
                              sale progression starts here.
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              offerLaneReady
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                : "bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {offerLaneReady ? "Ready" : "Waiting"}
                          </span>
                        </div>
                        <div className="mt-4 space-y-3">
                          {!propertyOfferReady && (
                            <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300">
                              Finish the seller readiness pack before the first
                              offer is recorded, otherwise the backend will keep
                              the offer lane blocked.
                            </div>
                          )}
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                              Offer amount
                            </span>
                            <input
                              ref={offerAmountInputRef}
                              type="number"
                              min="1"
                              step="1000"
                              value={offerDraft.amount}
                              onChange={(event) =>
                                setOfferDraft((previous) => ({
                                  ...previous,
                                  amount: event.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                              placeholder="450000"
                            />
                          </label>
                          <textarea
                            value={offerDraft.notes}
                            onChange={(event) =>
                              setOfferDraft((previous) => ({
                                ...previous,
                                notes: event.target.value,
                              }))
                            }
                            rows={4}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            placeholder="Record the buyer's offer terms, timing, or negotiation notes."
                          />
                          <button
                            onClick={() => void handleCreateOffer()}
                            disabled={
                              !offerLaneReady ||
                              purchaseWorkflowAction !== null ||
                              isLoadingPurchaseWorkflow
                            }
                            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {purchaseWorkflowAction === "create_offer" ? (
                              <ActionSpinner size={16} className="" />
                            ) : null}
                            Record buyer offer
                          </button>
                        </div>
                      </section>
                    </div>

                    {(purchaseWorkflowError || isLoadingPurchaseWorkflow) && (
                      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {isLoadingPurchaseWorkflow
                          ? "Loading the live qualification, AML, and seller-readiness records for this purchase."
                          : purchaseWorkflowError}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Steps & Approved Message */}
                {isRentApplication && (
                  <div
                    ref={rentWorkspaceSectionRef}
                    className="lg:col-span-2 rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-white p-6 dark:border-orange-800/50 dark:from-orange-900/10 dark:to-gray-900"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="max-w-3xl">
                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">
                          Guided rent workspace
                        </p>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Next step
                        </h3>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Keep the rent journey moving from one place. The next
                          action below is driven by the shared case file and the
                          live booking workflow.
                        </p>
                      </div>
                      {managerRentNextAction ? (
                        <button
                          type="button"
                          onClick={() => void handleManagerRentNextAction()}
                          disabled={rentWorkflowAction !== null}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {rentWorkflowAction ? (
                            <ActionSpinner size={16} className="" />
                          ) : (
                            <ChevronRight size={16} />
                          )}
                          {managerRentNextAction.label}
                        </button>
                      ) : null}
                    </div>

                    {managerRentNextAction ? (
                      <div className="mt-5 rounded-xl border border-orange-200 bg-white/80 p-5 dark:border-orange-800/50 dark:bg-gray-950/40">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-600 dark:text-orange-300">
                          {managerRentPanelLabels[managerRentNextAction.panel]}
                        </p>
                        <p className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">
                          {managerRentNextAction.title}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
                          {managerRentNextAction.description}
                        </p>
                      </div>
                    ) : null}

                    {renderGuidedProgressRail(rentGuidedSteps)}

                    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div
                        ref={rentDocumentsSectionRef}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          Shared case file
                        </p>
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {rentCaseFileSummary
                            ? `${rentCaseFileSummary.openRequestCount} open, ${rentCaseFileSummary.pendingReviewCount} waiting for review`
                            : "Live summary pending"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Upload for the client, review submitted files, and
                          keep the document lane in sync without leaving this
                          application.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("documents")}
                          className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-600 dark:text-orange-300"
                        >
                          <Upload size={16} />
                          Open shared case file
                        </button>
                      </div>

                      <div
                        ref={rentReferencingSectionRef}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          Referencing
                        </p>
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {referencingCheck?.status?.replace(/_/g, " ") ||
                            "Pending"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Start referencing after the viewing is complete, then
                          mark it complete here when the checks are cleared.
                        </p>
                        <textarea
                          value={referencingDraft.reviewNotes}
                          onChange={(event) => {
                            setReferencingError("");
                            setReferencingDraft({
                              reviewNotes: event.target.value,
                            });
                          }}
                          rows={3}
                          className="mt-4 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                          placeholder="Add referencing notes for the application audit trail."
                        />
                        {referencingError ? (
                          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                            {referencingError}
                          </p>
                        ) : null}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleReferencingStatusUpdate("in_progress")
                            }
                            disabled={
                              rentWorkflowAction !== null ||
                              referencingCheck?.status === "in_progress"
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                          >
                            Start
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleReferencingStatusUpdate("completed")
                            }
                            disabled={
                              rentWorkflowAction !== null ||
                              referencingCheck?.status === "completed"
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Mark complete
                          </button>
                        </div>
                      </div>

                      <div
                        ref={rentComplianceSectionRef}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          Right-to-rent
                        </p>
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {rightToRentCheck?.status?.replace(/_/g, " ") ||
                            "Pending"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          Complete the right-to-rent or equivalent jurisdiction
                          check here before approving the tenancy application.
                        </p>
                        <div className="mt-4 space-y-3">
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-gray-700 dark:text-gray-300">
                              Evidence type
                            </span>
                            <input
                              type="text"
                              value={rightToRentDraft.evidenceType}
                              onChange={(event) => {
                                setRightToRentError("");
                                setRightToRentDraft((previous) => ({
                                  ...previous,
                                  evidenceType: event.target.value,
                                }));
                              }}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                              placeholder="Passport, share code, visa, or local equivalent"
                            />
                          </label>
                          <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={rightToRentDraft.timeLimited}
                              onChange={(event) =>
                                setRightToRentDraft((previous) => ({
                                  ...previous,
                                  timeLimited: event.target.checked,
                                }))
                              }
                              className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                            />
                            Time-limited evidence
                          </label>
                          <textarea
                            value={rightToRentDraft.reviewNotes}
                            onChange={(event) => {
                              setRightToRentError("");
                              setRightToRentDraft((previous) => ({
                                ...previous,
                                reviewNotes: event.target.value,
                              }));
                            }}
                            rows={3}
                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                            placeholder="Add compliance notes or a reason if this check is not required."
                          />
                          {rightToRentError ? (
                            <p className="text-sm text-red-600 dark:text-red-400">
                              {rightToRentError}
                            </p>
                          ) : null}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleRightToRentStatusUpdate("in_progress")
                            }
                            disabled={
                              rentWorkflowAction !== null ||
                              rightToRentCheck?.status === "in_progress"
                            }
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                          >
                            Start right-to-rent
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void handleRightToRentStatusUpdate("completed")
                            }
                            disabled={
                              rentWorkflowAction !== null ||
                              rightToRentCheck?.status === "completed"
                            }
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Mark right-to-rent complete
                          </button>
                          {rightToRentCheck?.jurisdiction &&
                          rightToRentCheck.jurisdiction !== "england" ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleRightToRentStatusUpdate(
                                  "not_required",
                                )
                              }
                              disabled={
                                rentWorkflowAction !== null ||
                                rightToRentCheck?.status === "not_required"
                              }
                              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                            >
                              Not required
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div
                        ref={rentPropertyReadinessSectionRef}
                        className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/40"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                          Property readiness
                        </p>
                        <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {rentContractReady
                            ? "Contract ready"
                            : rentPropertyComplianceReadiness?.status?.replace(
                                /_/g,
                                " ",
                              ) ||
                              "Pending"}
                        </p>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {rentPropertyComplianceReadiness?.status_reason ||
                            "Review the live readiness pack here before creating the tenancy contract."}
                        </p>
                        {rentPropertyReadinessBlockers.length > 0 ? (
                          <div className="mt-4 space-y-2">
                            {rentPropertyReadinessBlockers
                              .slice(0, 3)
                              .map((blocker) => (
                                <div
                                  key={blocker.code}
                                  className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-300"
                                >
                                  <p className="font-semibold text-gray-900 dark:text-white">
                                    {blocker.title}
                                  </p>
                                  {"description" in blocker &&
                                  blocker.description ? (
                                    <p className="mt-1 leading-5">
                                      {blocker.description}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                          </div>
                        ) : (
                          <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                            The readiness pack will appear here as soon as the
                            property compliance records are available.
                          </div>
                        )}
                      </div>
                    </div>

                    <div
                      ref={rentActionSectionRef}
                      className="mt-5 flex flex-wrap gap-3"
                    >
                      <button
                        type="button"
                        onClick={() => void handleApproveRentApplication()}
                        disabled={
                          rentWorkflowAction !== null ||
                          !rentApprovalReady ||
                          application.status === APPLICATION_STATUS.APPROVED
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <CheckCircle size={16} />
                        Approve application
                      </button>
                      <button
                        type="button"
                        onClick={handleRentContractAction}
                        disabled={
                          rentWorkflowAction !== null
                          || (!rentCaseFile?.contract_id
                            && createContractGuard.status === "unavailable")
                        }
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
                      >
                        <FileText size={16} />
                        {rentCaseFile?.contract_id
                          ? "Open contract details"
                          : isLoadingRentWorkflow
                            ? "Refreshing workflow"
                          : createContractGuard.canRun
                            ? "Create contract"
                            : createContractGuard.target === "property_readiness"
                              ? "Review property readiness"
                              : "Review contract blockers"}
                      </button>
                    </div>

                    {!isLoadingRentWorkflow &&
                    !rentCaseFile?.contract_id &&
                    createContractGuard.status !== "ready" &&
                    (application.status === APPLICATION_STATUS.APPROVED ||
                      managerRentNextAction?.id ===
                        "review_property_readiness" ||
                      managerRentNextAction?.id === "open_create_contract") ? (
                      <div className={`mt-5 rounded-xl border px-4 py-3 text-sm ${
                        createContractGuard.status === "unavailable"
                          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300"
                          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                      }`}>
                        <p className="font-semibold">{createContractGuard.title}</p>
                        <p className="mt-1">{createContractGuard.description}</p>
                      </div>
                    ) : null}

                    {(rentWorkflowError || isLoadingRentWorkflow) && (
                      <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300">
                        {isLoadingRentWorkflow
                          ? "Loading the shared document, referencing, and compliance records for this rent journey."
                          : rentWorkflowError}
                      </div>
                    )}
                  </div>
                )}

                {isPurchaseApplication &&
                !showsLiveSaleJourney &&
                !supportsManagedPurchaseWorkflow &&
                application.status !== APPLICATION_STATUS.APPROVED &&
                application.status !== APPLICATION_STATUS.REJECTED &&
                application.status !== APPLICATION_STATUS.WITHDRAWN ? (
                  <div className="lg:col-span-2 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/10 dark:to-orange-800/10 rounded-xl p-6 border border-orange-200 dark:border-orange-800/50">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <ChevronRight size={20} className="text-orange-500" />
                      What's Next?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* ... existing next steps logic ... */}
                      {application.status ===
                      APPLICATION_STATUS.DOCUMENTS_REQUESTED ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold shadow-sm">
                              1
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Upload Documents
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Submit the requested documents via the Documents
                                tab
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 opacity-50">
                            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              2
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Verification
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Our team will verify your submitted documents
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 opacity-50">
                            <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              3
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Final Decision
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Receive approval or feedback on your application
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                              <CheckCircle size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Application Received
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Your basic details have been submitted
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-8 h-8 ${application.status === APPLICATION_STATUS.UNDER_REVIEW ? "bg-orange-500 text-white shadow-sm" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"} rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold`}
                            >
                              2
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Agent Review
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Agent is reviewing your suitability
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 opacity-50">
                            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                              3
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                Final Decision
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                Typically within 3-5 business days
                              </p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  application.status === APPLICATION_STATUS.APPROVED && (
                    <div className="lg:col-span-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                          <CheckCircle size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Congratulations! Your Application is Approved
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The agent has approved your application. Contact
                            them to proceed with the next steps
                            {application.listingType === "rent"
                              ? " including signing the tenancy agreement and arranging your move-in date."
                              : " including contract signing and completion."}
                          </p>
                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => void handleOpenConversation()}
                              disabled={openingConversation}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg font-medium transition-colors shadow-sm"
                            >
                              <MessageSquare size={18} />
                              <span>
                                {openingConversation
                                  ? "Opening thread..."
                                  : "Contact Agent"}
                              </span>
                            </button>

                    {application.listingType === "rent" && (
                      <button
                        onClick={handleRentContractAction}
                        disabled={
                          rentWorkflowAction !== null ||
                          (!rentCaseFile?.contract_id &&
                            createContractGuard.status === "unavailable")
                        }
                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                      >
                        <FileText size={18} />
                        <span>
                          {rentCaseFile?.contract_id
                            ? "Open Contract"
                            : isLoadingRentWorkflow
                              ? "Refreshing workflow"
                            : createContractGuard.canRun
                              ? "Create contract"
                              : createContractGuard.target === "property_readiness"
                                ? "Review property readiness"
                                : "Review contract blockers"}
                        </span>
                      </button>
                    )}

                            <button
                              onClick={() => setShowCompleteConfirm(true)}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm"
                            >
                              <FileText size={18} />
                              <span>Sign & Complete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                )}

                {/* Completed Message */}
                {application.status === APPLICATION_STATUS.COMPLETED && (
                  <div className="lg:col-span-2 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                        <Key size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          Application Process Complete
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                          Congratulations! The entire application process is
                          complete. You have successfully{" "}
                          {application.listingType === "rent"
                            ? "rented"
                            : "purchased"}{" "}
                          this property.
                        </p>
                        <button
                          onClick={() => navigate("/manager/dashboard")}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                        >
                          <Home size={18} />
                          <span>Back to Dashboard</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-6">
                {application.fastTrackCaseId ? (
                  <CaseFileWorkspace
                    role="manager"
                    caseId={application.fastTrackCaseId}
                    embedded
                    appearance="manager"
                    initialTab="documents"
                    requestedSection="documents"
                  />
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                      <Shield size={20} className="text-orange-500" />
                      <h3 className="text-lg font-semibold">
                        Shared case file unavailable
                      </h3>
                    </div>
                    <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                      This application is not linked to a live fast-track case
                      yet, so the shared document workspace cannot be opened
                      from here.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Activity/History Tab */}
            {activeTab === "history" && (
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-6 border border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-8 flex items-center gap-2">
                    <History size={20} className="text-orange-500" />
                    Application Timeline
                  </h3>
                  <div className="relative ml-4">
                    {activityHistory.map((activity, index) => {
                      const Icon = activity.icon;
                      const colorClasses = {
                        blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
                        orange:
                          "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
                        green:
                          "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
                        red: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
                        yellow:
                          "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400",
                        gray: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400",
                      };

                      return (
                        <div
                          key={activity.id}
                          className="relative flex items-start pb-10 last:pb-2"
                        >
                          {index < activityHistory.length - 1 && (
                            <div className="absolute left-5 top-10 w-0.5 h-full bg-gray-200 dark:bg-gray-700 -ml-px" />
                          )}
                          <div
                            className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-sm ${colorClasses[activity.color]}`}
                          >
                            <Icon size={18} />
                          </div>
                          <div className="ml-6 flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white">
                                {activity.title}
                              </h4>
                              <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <Clock size={12} />
                                {formatDate(activity.date)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Confirmation Modal */}
      {showCompleteConfirm &&
        createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Key size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Finalize Handover?
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                By confirming, you acknowledge that you have received the keys
                and the process is now complete.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompleteConfirm(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-sm"
                >
                  Complete Now
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* Contract Creation Modal */}
      {showContractModal && (
        <CreateContractModal
          applicationId={application.id}
          propertyPrice={application.propertyPrice || 0}
          onClose={() => setShowContractModal(false)}
          onSuccess={async () => {
            await refreshRentWorkflow();
          }}
        />
      )}
    </div>
  );
};

export default ApplicationDetail;
