const INTERNAL_APPLICATION_TITLE_PATTERN = /\b(codex|project\s*5|fast\s*track|manual\s*ft|e2e|mobile\s+live|mobile-live|qa|dev|issue\d*|round\d*|smoke|trace|validation\s+proof|notice|dashboard\s+search|address\s+match|persist\s+proof|fresh\s+sla|fresh\s+assignment|board\d*)\b/i;
const RAW_ID_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}|\b\d{10,}\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4})/i;
const UNAVAILABLE_ADDRESS_PATTERN = /^(address unavailable|location unavailable|unknown address|n\/a|na)$/i;
const WORKFLOW_STATUS_TITLE_PATTERN = /^(cancelled|completed|submitted|approved|rejected|withdrawn|pending|draft|appointment booked|viewing scheduled|viewing completed|under review|documents requested|documents required|verification in progress|buyer qualification|offer ready|offer submitted|offer under review|offer accepted|sale agreed|memorandum issued|conveyancing|exchange)$/i;

const normalizeTitleText = (value?: string | null) => (
  String(value || '').trim().replace(/\s+/g, ' ')
);

export const isInternalApplicationTitle = (value?: string | null) => {
  const normalized = normalizeTitleText(value);
  return Boolean(
    normalized
    && INTERNAL_APPLICATION_TITLE_PATTERN.test(normalized)
    && RAW_ID_PATTERN.test(normalized),
  );
};

const normalizeWorkflowTitle = (value?: string | null) => normalizeTitleText(value)
  .replace(/[_-]+/g, ' ')
  .replace(/^documents required$/i, 'documents requested')
  .toLowerCase();

export const isApplicationWorkflowTitle = (value?: string | null) => {
  const normalized = normalizeWorkflowTitle(value);
  return Boolean(normalized && WORKFLOW_STATUS_TITLE_PATTERN.test(normalized));
};

export const isApplicationWorkflowStatusTitle = (
  value?: string | null,
  ...workflowSignals: Array<string | null | undefined>
) => {
  const normalized = normalizeWorkflowTitle(value);
  return Boolean(
    isApplicationWorkflowTitle(normalized)
    && workflowSignals.some((signal) => normalizeWorkflowTitle(signal) === normalized),
  );
};

export const getApplicationPropertyDisplayTitle = (
  propertyTitle?: string | null,
  propertyAddress?: string | null,
  fallback = 'Property application',
) => {
  const title = normalizeTitleText(propertyTitle);
  if (title && !isInternalApplicationTitle(title)) {
    return title;
  }

  const address = normalizeTitleText(propertyAddress);
  if (address && !UNAVAILABLE_ADDRESS_PATTERN.test(address) && !isInternalApplicationTitle(address)) {
    return address;
  }

  return fallback;
};
