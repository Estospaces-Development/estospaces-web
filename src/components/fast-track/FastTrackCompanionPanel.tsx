"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, FileText, Handshake, Home, Loader2, MessageSquareText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import DateField from "@/components/ui/DateField";
import TimeField from "@/components/ui/TimeField";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { usePublishWorkspaceSync } from "@/contexts/WorkspaceSyncContext";
import {
  buildFastTrackCompanionWorkspacePath,
  describeFastTrackCompanionSummary,
  getFastTrackViewingResponseConflictMessage,
  describeFastTrackStageLabel,
  FAST_TRACK_COMPANION_SYNC_TAGS,
  syncFastTrackCompanionAction,
  type FastTrackCompanionContext,
  type FastTrackCompanionRole,
} from "@/lib/fastTrackCompanion";
import {
  canUserConfirmFastTrackHandover,
  getFastTrackDecisionGuard,
  getFastTrackFinalDecisionGuard,
  isFastTrackCaseCompleteForRole,
  resolveFastTrackThreadRecipientId,
} from "@/lib/fastTrackWorkspace";
import { getFastTrackDisplayTitle } from "@/lib/fastTrackDisplayTitle";
import { PAYMENTS_ENABLED } from "@/lib/launchFlags";
import { LAUNCH_CURRENCY_CODE } from "@/lib/launchLocale";
import type { FastTrackCase } from "@/services/fastTrackService";
import { upsertDirectConversation } from "@/services/messagesService";

interface FastTrackCompanionPanelProps {
  role: FastTrackCompanionRole;
  fastTrackCase: FastTrackCase;
  context?: FastTrackCompanionContext;
  title?: string;
  className?: string;
  onCaseUpdated?: (nextCase: FastTrackCase) => void;
  onRefresh?: () => void | Promise<void>;
}

const toDateInputValue = (dateTime?: string) => {
  if (!dateTime) {
    return "";
  }

  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const offset = parsed.getTimezoneOffset() * 60000;
  return new Date(parsed.getTime() - offset).toISOString().slice(0, 10);
};

const toTimeInputValue = (dateTime?: string) => {
  if (!dateTime) {
    return "10:00";
  }

  const parsed = new Date(dateTime);
  if (Number.isNaN(parsed.getTime())) {
    return "10:00";
  }

  return parsed.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

const stageBadgeClasses = (stage: FastTrackCase["stage"]) => {
  switch (stage) {
    case "documents":
      return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300";
    case "viewing":
      return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300";
    case "decision":
      return "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300";
    case "agreement":
      return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300";
    case "handover":
      return "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
  }
};

export default function FastTrackCompanionPanel({
  role,
  fastTrackCase,
  context,
  title,
  className = "",
  onCaseUpdated,
  onRefresh,
}: FastTrackCompanionPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const publishWorkspaceSync = usePublishWorkspaceSync();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [openingConversation, setOpeningConversation] = useState(false);
  const [viewingDate, setViewingDate] = useState("");
  const [viewingTime, setViewingTime] = useState("10:00");
  const [viewingNote, setViewingNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionAmount, setDecisionAmount] = useState("");
  const [agreementNote, setAgreementNote] = useState("");
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [amountDue, setAmountDue] = useState("");
  const [handoverNote, setHandoverNote] = useState("");
  const [requestChangeNote, setRequestChangeNote] = useState("");

  useEffect(() => {
    setViewingDate(toDateInputValue(fastTrackCase.viewing.scheduledAt));
    setViewingTime(toTimeInputValue(fastTrackCase.viewing.scheduledAt));
    setViewingNote(fastTrackCase.viewing.note || "");
    setDecisionNote(fastTrackCase.decision.note || "");
    setDecisionAmount(
      fastTrackCase.decision.amount ? String(fastTrackCase.decision.amount) : "",
    );
    setAgreementNote(fastTrackCase.agreement.note || "");
    setPaymentRequired(PAYMENTS_ENABLED && (
      fastTrackCase.agreement.paymentStatus === "requested" ||
        fastTrackCase.agreement.paymentStatus === "paid"
    ));
    setAmountDue(
      fastTrackCase.agreement.amountDue ? String(fastTrackCase.agreement.amountDue) : "",
    );
    setHandoverNote(fastTrackCase.handover.note || "");
    setRequestChangeNote(fastTrackCase.viewing.requestedChange || "");
  }, [fastTrackCase]);

  const workspacePath = useMemo(
    () => buildFastTrackCompanionWorkspacePath(role, fastTrackCase, context),
    [context, fastTrackCase, role],
  );
  const messagesPath = role === "manager" ? "/manager/messages" : "/user/dashboard/messages";
  const threadRecipientId = useMemo(
    () => resolveFastTrackThreadRecipientId(role, user?.id, fastTrackCase),
    [fastTrackCase, role, user?.id],
  );

  const parsedDecisionAmount = decisionAmount.trim() ? Number(decisionAmount) : 0;
  const parsedAgreementAmount = amountDue.trim() ? Number(amountDue) : 0;
  const hasValidAgreementAmount =
    Number.isFinite(parsedAgreementAmount) && parsedAgreementAmount > 0;
  const caseComplete = isFastTrackCaseCompleteForRole(fastTrackCase, role);
  const displayPropertyTitle = getFastTrackDisplayTitle(fastTrackCase.propertyTitle, "your selected home");

  const runAction = useCallback(
    async (action: string, payload: Record<string, unknown>, successMessage: string) => {
      setActiveAction(action);
      const result = await syncFastTrackCompanionAction({
        fastTrackCase,
        request: { action, payload },
        publishWorkspaceSync,
        reason: `Companion action: ${action}`,
        tags: FAST_TRACK_COMPANION_SYNC_TAGS,
      });
      setActiveAction(null);

      if (result.error || !result.data) {
        toast.error(result.error || "Unable to update the linked fast-track case.");
        return;
      }

      onCaseUpdated?.(result.data);
      if (onRefresh) {
        await onRefresh();
      }
      toast.success(successMessage);
    },
    [fastTrackCase, onCaseUpdated, onRefresh, publishWorkspaceSync, toast],
  );

  const handleOpenMessages = useCallback(async () => {
    if (!user || !threadRecipientId) {
      toast.error(
        role === "user"
          ? "The case manager conversation is not ready yet."
          : "The client conversation is not ready yet.",
      );
      return;
    }

    setOpeningConversation(true);
    try {
      const conversation = await upsertDirectConversation(threadRecipientId, {
        fastTrackCaseId: fastTrackCase.caseId,
        propertyId: fastTrackCase.propertyId,
        propertyTitle: displayPropertyTitle,
        listingType: fastTrackCase.listingType,
        senderName: user.user_metadata?.full_name || user.name || user.email,
        senderEmail: user.email,
        senderPhone: user.phone || user.user_metadata?.phone || "",
        recipientName: role === "user" ? "Case manager" : fastTrackCase.clientName || "",
      });

      navigate(`${messagesPath}?conversation=${conversation.id}`);
    } catch (error: any) {
      toast.error(error?.message || "Unable to open the linked message thread right now.");
    } finally {
      setOpeningConversation(false);
    }
  }, [displayPropertyTitle, fastTrackCase, messagesPath, navigate, role, threadRecipientId, toast, user]);

  const renderViewingActions = () => {
    if (role === "user") {
      const confirmViewingConflict = getFastTrackViewingResponseConflictMessage(fastTrackCase, "confirm_viewing");
      const requestViewingChangeConflict = getFastTrackViewingResponseConflictMessage(fastTrackCase, "request_viewing_change");
      const confirmViewingDisabled = activeAction === "confirm_viewing" || fastTrackCase.viewing.confirmedByUser || Boolean(confirmViewingConflict);
      const requestViewingChangeDisabled = activeAction === "request_viewing_change" || !requestChangeNote.trim() || Boolean(requestViewingChangeConflict);

      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">
              {fastTrackCase.viewing.scheduledAt
                ? `Current slot: ${new Date(fastTrackCase.viewing.scheduledAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "The manager has not scheduled the viewing yet."}
            </p>
            <p className="mt-2">
              Confirm the slot here or request a change without leaving this page.
            </p>
          </div>
          <textarea
            rows={3}
            value={requestChangeNote}
            onChange={(event) => setRequestChangeNote(event.target.value)}
            placeholder="Add a short note if you need a different slot."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void runAction("confirm_viewing", {}, "Viewing confirmed.")}
              disabled={confirmViewingDisabled}
              title={confirmViewingConflict || (fastTrackCase.viewing.confirmedByUser ? "Viewing is already confirmed." : undefined)}
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction === "confirm_viewing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Confirm viewing
            </button>
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "request_viewing_change",
                  { note: requestChangeNote.trim() },
                  "Viewing change request saved.",
                )
              }
              disabled={requestViewingChangeDisabled}
              title={requestViewingChangeConflict || (!requestChangeNote.trim() ? "Add a short note before requesting a change." : undefined)}
              className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            >
              Request change
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Date</span>
            <DateField
              value={viewingDate}
              onChange={setViewingDate}
              className="w-full"
              buttonClassName="bg-white dark:bg-gray-950"
              ariaLabel="Companion viewing date"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-gray-700 dark:text-gray-300">Time</span>
            <TimeField
              value={viewingTime}
              onChange={setViewingTime}
              className="w-full"
              inputClassName="bg-white dark:bg-gray-950"
              ariaLabel="Companion viewing time"
            />
          </label>
        </div>
        <textarea
          rows={3}
          value={viewingNote}
          onChange={(event) => setViewingNote(event.target.value)}
          placeholder="Add a short note for the client."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void runAction(
                fastTrackCase.viewing.status === "scheduled"
                  ? "reschedule_viewing"
                  : "schedule_viewing",
                {
                  scheduled_at: new Date(`${viewingDate}T${viewingTime}:00`).toISOString(),
                  note: viewingNote,
                },
                fastTrackCase.viewing.status === "scheduled"
                  ? "Viewing rescheduled."
                  : "Viewing scheduled.",
              )
            }
            disabled={
              activeAction === "schedule_viewing" ||
              activeAction === "reschedule_viewing" ||
              !viewingDate ||
              !viewingTime
            }
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "schedule_viewing" ||
            activeAction === "reschedule_viewing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock3 className="h-4 w-4" />
            )}
            {fastTrackCase.viewing.status === "scheduled"
              ? "Reschedule viewing"
              : "Schedule viewing"}
          </button>
          <button
            type="button"
            onClick={() =>
              void runAction("skip_viewing", { note: viewingNote }, "Viewing skipped.")
            }
            disabled={activeAction === "skip_viewing"}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
          >
            Skip viewing
          </button>
          <button
            type="button"
            onClick={() =>
              void runAction(
                "complete_viewing",
                { note: viewingNote },
                "Viewing completed.",
              )
            }
            disabled={activeAction === "complete_viewing"}
            className="rounded-2xl border border-blue-200 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/30"
          >
            Complete viewing
          </button>
        </div>
      </div>
    );
  };

  const renderDecisionActions = () => {
    const decisionStatus = String(fastTrackCase.decision.status || "").trim().toLowerCase();
    const isSaleDecision = fastTrackCase.journeyMode === "sale";
    const offerReviewStarted = decisionStatus === "under_review";
    const offerDecisionFinal = decisionStatus === "approved" || decisionStatus === "rejected";
    const rejectDecisionGuard = getFastTrackDecisionGuard(fastTrackCase, "rejected", decisionAmount, role);
    const approveFinalDecisionGuard = getFastTrackFinalDecisionGuard(fastTrackCase, "approved", decisionAmount, role);
    const rejectFinalDecisionGuard = getFastTrackFinalDecisionGuard(fastTrackCase, "rejected", decisionAmount, role);
    const startOfferReviewGuard = isSaleDecision ? rejectDecisionGuard : null;
    const decisionGuardMessage = approveFinalDecisionGuard || rejectFinalDecisionGuard;

    if (role === "user") {
      return (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
          <p className="font-semibold text-gray-900 dark:text-white">
            {fastTrackCase.decision.status === "approved"
              ? "Approved"
              : fastTrackCase.decision.status === "rejected"
                ? "Rejected"
                : "Waiting for a decision"}
          </p>
          <p className="mt-2">
            {describeFastTrackCompanionSummary(fastTrackCase)}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {decisionGuardMessage ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            {decisionGuardMessage}
          </div>
        ) : null}
        {isSaleDecision ? (
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
          rows={3}
          value={decisionNote}
          onChange={(event) => setDecisionNote(event.target.value)}
          placeholder="Add a short decision note."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
        {isSaleDecision ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200">
            {offerDecisionFinal
              ? `Offer ${decisionStatus.replace("_", " ")}.`
              : offerReviewStarted
                ? "Offer is under review."
                : "Offer review has not started."}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          {isSaleDecision && !offerDecisionFinal ? (
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "start_offer_review",
                  { note: decisionNote },
                  "Offer review started.",
                )
              }
              disabled={
                activeAction === "start_offer_review" ||
                Boolean(startOfferReviewGuard) ||
                offerReviewStarted
              }
              title={startOfferReviewGuard || (offerReviewStarted ? "Offer review is already started." : undefined)}
              className="rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950/30"
            >
              Start offer review
            </button>
          ) : null}
          <button
            type="button"
            onClick={() =>
              void runAction(
                "record_decision",
                {
                  outcome: "approved",
                  note: decisionNote,
                  amount:
                    fastTrackCase.journeyMode === "sale" && parsedDecisionAmount > 0
                      ? parsedDecisionAmount
                      : undefined,
                  currency: LAUNCH_CURRENCY_CODE,
                },
                `${describeFastTrackStageLabel(fastTrackCase)} approved.`,
              )
            }
            disabled={activeAction === "record_decision" || Boolean(approveFinalDecisionGuard)}
            title={approveFinalDecisionGuard || undefined}
            className="inline-flex items-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "record_decision" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={() =>
              void runAction(
                "record_decision",
                { outcome: "rejected", note: decisionNote },
                `${describeFastTrackStageLabel(fastTrackCase)} rejected.`,
              )
            }
            disabled={activeAction === "record_decision" || Boolean(rejectFinalDecisionGuard)}
            title={rejectFinalDecisionGuard || undefined}
            className="rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30"
          >
            Reject
          </button>
        </div>
      </div>
    );
  };

  const renderAgreementActions = () => {
    if (role === "user") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">
              {fastTrackCase.agreement.status === "accepted"
                ? "Agreement accepted"
                : fastTrackCase.agreement.status === "sent"
                  ? "Agreement ready for your confirmation"
                  : "Agreement is being prepared"}
            </p>
            <p className="mt-2">{describeFastTrackCompanionSummary(fastTrackCase)}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void runAction("confirm_agreement", {}, "Agreement confirmed.")
              }
              disabled={
                activeAction === "confirm_agreement" ||
                fastTrackCase.agreement.status === "accepted"
              }
              className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {activeAction === "confirm_agreement" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Handshake className="h-4 w-4" />
              )}
              Confirm agreement
            </button>
          </div>
        </div>
      );
    }

    const publishNeedsAmount = PAYMENTS_ENABLED && paymentRequired && !hasValidAgreementAmount;

    return (
      <div className="space-y-4">
        <textarea
          rows={3}
          value={agreementNote}
          onChange={(event) => setAgreementNote(event.target.value)}
          placeholder="Add a short agreement note."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
        {PAYMENTS_ENABLED ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
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
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 md:max-w-xs"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void runAction(
                "publish_agreement",
                {
                  note: agreementNote,
                  payment_required: PAYMENTS_ENABLED && paymentRequired && hasValidAgreementAmount,
                  amount_due:
                    PAYMENTS_ENABLED && paymentRequired && hasValidAgreementAmount
                      ? parsedAgreementAmount
                      : undefined,
                },
                "Agreement published.",
              )
            }
            disabled={activeAction === "publish_agreement" || publishNeedsAmount}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "publish_agreement" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Publish agreement
          </button>
          {PAYMENTS_ENABLED && paymentRequired ? (
            <button
              type="button"
              onClick={() =>
                void runAction(
                  "mark_payment_received",
                  {},
                  "Payment confirmed.",
                )
              }
              disabled={
                activeAction === "mark_payment_received" ||
                !hasValidAgreementAmount ||
                fastTrackCase.agreement.paymentStatus === "paid"
              }
              className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
            >
              Mark payment received
            </button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderHandoverActions = () => {
    const decisionStatus = String(fastTrackCase.decision.status || "").trim().toLowerCase();
    const agreementStatus = String(fastTrackCase.agreement.status || "").trim().toLowerCase();
    const paymentStatus = String(fastTrackCase.agreement.paymentStatus || "").trim().toLowerCase();
    const handoverStatus = String(fastTrackCase.handover.status || "").trim().toLowerCase();
    const decisionAccepted = decisionStatus === "approved" || decisionStatus === "accepted";
    const agreementAccepted = ["accepted", "signed", "completed"].includes(agreementStatus);
    const handoverReady = handoverStatus === "ready";
    const handoverCompleted = handoverStatus === "completed";
    const handoverPrerequisiteGuard = !decisionAccepted
      ? fastTrackCase.journeyMode === "sale"
        ? "Accept the offer before starting handover."
        : "Approve the application before starting handover."
      : !agreementAccepted
        ? fastTrackCase.journeyMode === "sale"
          ? "Finish the memorandum, solicitor conveyancing, exchange, and signed agreement steps before handover."
          : "Send and confirm the agreement before handover."
        : PAYMENTS_ENABLED && paymentStatus === "requested"
          ? "Confirm payment before handover."
          : null;
    const completeHandoverGuard = handoverPrerequisiteGuard || (!handoverReady && !handoverCompleted
      ? "Mark handover ready before completing it."
      : null);

    if (caseComplete) {
      return (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <p className="font-semibold">Handover complete</p>
          <p className="mt-2">
            The keys and final handover are already confirmed. No more receipt confirmation is needed here.
          </p>
        </div>
      );
    }

    if (role === "user") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            <p className="font-semibold text-gray-900 dark:text-white">
              Confirm receipt here once the handover is done.
            </p>
            <p className="mt-2">{describeFastTrackCompanionSummary(fastTrackCase)}</p>
          </div>
          <button
            type="button"
            onClick={() =>
              void runAction("confirm_handover", {}, "Handover confirmed.")
            }
            disabled={
              activeAction === "confirm_handover" ||
              fastTrackCase.handover.confirmedByUser ||
              !canUserConfirmFastTrackHandover(fastTrackCase)
            }
            title={!canUserConfirmFastTrackHandover(fastTrackCase) ? "The manager must mark handover ready first." : undefined}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "confirm_handover" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Home className="h-4 w-4" />
            )}
            Confirm handover
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {handoverPrerequisiteGuard ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            {handoverPrerequisiteGuard}
          </div>
        ) : null}
        <textarea
          rows={3}
          value={handoverNote}
          onChange={(event) => setHandoverNote(event.target.value)}
          placeholder="Add a final handover note."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void runAction(
                "mark_handover_ready",
                { note: handoverNote },
                "Handover marked ready.",
              )
            }
            disabled={
              activeAction === "mark_handover_ready" ||
              Boolean(handoverPrerequisiteGuard) ||
              handoverReady ||
              handoverCompleted
            }
            title={handoverPrerequisiteGuard || (handoverReady ? "Handover is already ready." : undefined)}
            className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === "mark_handover_ready" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Handshake className="h-4 w-4" />
            )}
            Mark handover ready
          </button>
          <button
            type="button"
            onClick={() =>
              void runAction(
                "complete_handover",
                { note: handoverNote },
                "Handover completed.",
              )
            }
            disabled={
              activeAction === "complete_handover" ||
              Boolean(completeHandoverGuard) ||
              handoverCompleted
            }
            title={completeHandoverGuard || (handoverCompleted ? "Handover is already complete." : undefined)}
            className="rounded-2xl border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
          >
            Complete handover
          </button>
        </div>
      </div>
    );
  };

  const renderStageActions = () => {
    switch (fastTrackCase.stage) {
      case "viewing":
        return renderViewingActions();
      case "decision":
        return renderDecisionActions();
      case "agreement":
        return renderAgreementActions();
      case "handover":
        return renderHandoverActions();
      default:
        return (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-300">
            This page is linked to the live fast-track case. Open the workspace for the full selected or documents stage controls.
          </div>
        );
    }
  };

  return (
    <div
      data-fast-track-companion-panel="true"
      data-fast-track-companion-role={role}
      data-fast-track-companion-stage={fastTrackCase.stage}
      data-fast-track-companion-case={fastTrackCase.caseId}
      className={`rounded-3xl border border-orange-200 bg-orange-50/70 p-5 shadow-sm dark:border-orange-900/40 dark:bg-orange-950/20 ${className}`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">
              {title || "Linked Fast-Track Case"}
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${stageBadgeClasses(fastTrackCase.stage)}`}
            >
              {describeFastTrackStageLabel(fastTrackCase)}
            </span>
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {displayPropertyTitle}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {describeFastTrackCompanionSummary(fastTrackCase)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            data-fast-track-companion-open-messages="true"
            onClick={() => void handleOpenMessages()}
            disabled={openingConversation || !threadRecipientId}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-black dark:text-gray-200 dark:hover:bg-gray-900"
          >
            {openingConversation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquareText className="h-4 w-4" />
            )}
            {openingConversation ? "Opening messages" : "Open messages"}
          </button>
          <button
            type="button"
            data-fast-track-companion-open-workspace="true"
            onClick={() => navigate(workspacePath)}
            className="inline-flex items-center gap-2 rounded-2xl border border-orange-300 bg-white px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-800 dark:bg-black dark:text-orange-200 dark:hover:bg-orange-950/30"
          >
            Open fast-track workspace
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5">{renderStageActions()}</div>
    </div>
  );
}
