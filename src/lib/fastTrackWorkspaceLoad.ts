import type { FastTrackCase } from "@/services/fastTrackService";

type FastTrackCasesResult = {
  data: FastTrackCase[] | null;
  error: string | null;
};

type FastTrackCasesFetcher = () => Promise<FastTrackCasesResult>;

const FALLBACK_LOAD_ERROR = "Unable to load fast-track cases.";

const asList = <T>(value: T[] | null | undefined): T[] =>
  Array.isArray(value) ? value : [];

const normalizeIdentityValue = (value: string | number | null | undefined) =>
  String(value || "").trim().toLowerCase();

const buildCompoundIdentity = (
  prefix: string,
  values: Array<string | number | null | undefined>,
) => {
  const normalizedValues = values.map(normalizeIdentityValue);
  if (normalizedValues.some((value) => !value)) {
    return "";
  }
  return `${prefix}:${normalizedValues.join("|")}`;
};

const getLoadErrorMessage = (error: unknown) => (
  error instanceof Error && error.message
    ? `${FALLBACK_LOAD_ERROR} ${error.message}`
    : FALLBACK_LOAD_ERROR
);

export const sortFastTrackWorkspaceCases = (cases: FastTrackCase[]) => [...cases].sort((left, right) => {
  if (left.workspaceFinalStatus !== right.workspaceFinalStatus) {
    if (left.workspaceFinalStatus === "active") {
      return -1;
    }
    if (right.workspaceFinalStatus === "active") {
      return 1;
    }
  }
  if (left.hoursRemaining !== right.hoursRemaining) {
    return left.hoursRemaining - right.hoursRemaining;
  }
  return new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime();
});

const getFastTrackCaseIdentityKeys = (fastTrackCase: FastTrackCase) => {
  const status = normalizeIdentityValue(fastTrackCase.workspaceFinalStatus);
  const strongKeys = [
    ["case", fastTrackCase.caseId],
    ["application", fastTrackCase.applicationId],
    ["viewing", fastTrackCase.viewingId],
    ["contract", fastTrackCase.contractId],
    ["payment", fastTrackCase.paymentId],
  ].map(([prefix, value]) => (
    value ? `${prefix}:${normalizeIdentityValue(value)}` : ""
  ));

  return [
    ...strongKeys,
    buildCompoundIdentity("broker-property-client-status", [
      fastTrackCase.brokerRequestId,
      fastTrackCase.propertyId,
      fastTrackCase.clientId,
      fastTrackCase.journeyMode,
      status,
    ]),
    buildCompoundIdentity("lead-property-client-status", [
      fastTrackCase.leadId,
      fastTrackCase.propertyId,
      fastTrackCase.clientId,
      fastTrackCase.journeyMode,
      status,
    ]),
    buildCompoundIdentity("direct-property-client-status", [
      fastTrackCase.startedFrom,
      fastTrackCase.propertyId,
      fastTrackCase.clientId,
      fastTrackCase.journeyMode,
      status,
    ]),
  ].filter(Boolean);
};

export const dedupeFastTrackWorkspaceCases = (cases: FastTrackCase[]) => {
  const seenCaseByIdentity = new Map<string, FastTrackCase>();
  const dedupedCases: FastTrackCase[] = [];

  for (const fastTrackCase of sortFastTrackWorkspaceCases(cases)) {
    const identityKeys = getFastTrackCaseIdentityKeys(fastTrackCase);
    const duplicate = identityKeys.some((key) => seenCaseByIdentity.has(key));
    if (duplicate) {
      continue;
    }

    dedupedCases.push(fastTrackCase);
    identityKeys.forEach((key) => seenCaseByIdentity.set(key, fastTrackCase));
  }

  return dedupedCases;
};

export const buildFastTrackCasesSignature = (cases: FastTrackCase[]) => JSON.stringify(
  cases.map((item) => ({
    caseId: item.caseId,
    stage: item.stage,
    finalStatus: item.workspaceFinalStatus,
    hoursRemaining: item.hoursRemaining,
    statusReason: item.statusReason || "",
    nextAction: item.nextAction || "",
    documents: item.documents.items.map((document) => ({
      id: document.id,
      status: document.status,
      recordId: document.documentRecordId || "",
      uploadedAt: document.uploadedAt || "",
      reviewedAt: document.reviewedAt || "",
    })),
    viewing: {
      status: item.viewing.status,
      scheduledAt: item.viewing.scheduledAt || "",
      requestedChangeAt: item.viewing.requestedChangeAt || "",
      confirmedByUser: Boolean(item.viewing.confirmedByUser),
    },
    decision: {
      status: item.decision.status,
      amount: item.decision.amount || 0,
      decidedAt: item.decision.decidedAt || "",
    },
    agreement: {
      status: item.agreement.status,
      paymentStatus: item.agreement.paymentStatus,
      amountDue: item.agreement.amountDue || 0,
      acceptedAt: item.agreement.acceptedAt || "",
    },
    handover: {
      status: item.handover.status,
      confirmedAt: item.handover.confirmedAt || "",
      completedAt: item.handover.completedAt || "",
    },
    activity: {
      count: item.activity.length,
      lastId: item.activity[item.activity.length - 1]?.id || "",
    },
  })),
);

export const loadFastTrackWorkspaceCases = async (
  getCases: FastTrackCasesFetcher,
  previousSignature: string,
): Promise<{
  cases: FastTrackCase[] | null;
  signature: string;
  changed: boolean;
  error: string | null;
}> => {
  try {
    const result = await getCases();
    if (result.error) {
      return {
        cases: null,
        signature: previousSignature,
        changed: false,
        error: result.error,
      };
    }

    const nextCases = dedupeFastTrackWorkspaceCases(asList(result.data));
    const nextSignature = buildFastTrackCasesSignature(nextCases);
    return {
      cases: nextCases,
      signature: nextSignature,
      changed: nextSignature !== previousSignature,
      error: null,
    };
  } catch (error) {
    return {
      cases: null,
      signature: previousSignature,
      changed: false,
      error: getLoadErrorMessage(error),
    };
  }
};
