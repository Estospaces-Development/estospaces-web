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
  describeFastTrackStageLabel,
  FAST_TRACK_COMPANION_SYNC_TAGS,
  syncFastTrackCompanionAction,
  type FastTrackCompanionContext,
  type FastTrackCompanionRole,
} from "@/lib/fastTrackCompanion";
import { resolveFastTrackThreadRecipientId } from "@/lib/fastTrackWorkspace";
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
    setPaymentRequired(
      fastTrackCase.agreement.paymentStatus === "requested" ||
        fastTrackCase.agreement.paymentStatus === "paid",
    );
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
        propertyTitle: fastTrackCase.propertyTitle,
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
  }, [fastTrackCase, messagesPath, navigate, role, threadRecipientId, toast, user]);

  const renderViewingActions = () => {
    if (role === "user") {
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
              disabled={activeAction === "confirm_viewing" || fastTrackCase.viewing.confirmedByUser}
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
              disabled={
                activeAction === "request_viewing_change" || !requestChangeNote.trim()
              }
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
        {fastTrackCase.journeyMode === "sale" ? (
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
        <div className="flex flex-wrap gap-3">
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
                  currency: "GBP",
                },
                `${describeFastTrackStageLabel(fastTrackCase)} approved.`,
              )
            }
            disabled={activeAction === "record_decision"}
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
            disabled={activeAction === "record_decision"}
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

    const publishNeedsAmount = paymentRequired && !hasValidAgreementAmount;

    return (
      <div className="space-y-4">
        <textarea
          rows={3}
          value={agreementNote}
          onChange={(event) => setAgreementNote(event.target.value)}
          placeholder="Add a short agreement note."
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-orange-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200"
        />
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
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() =>
              void runAction(
                "publish_agreement",
                {
                  note: agreementNote,
                  payment_required: paymentRequired && hasValidAgreementAmount,
                  amount_due:
                    paymentRequired && hasValidAgreementAmount
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
          {paymentRequired ? (
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
              fastTrackCase.handover.confirmedByUser
            }
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
            disabled={activeAction === "mark_handover_ready"}
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
            disabled={activeAction === "complete_handover"}
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
              {fastTrackCase.propertyTitle}
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
