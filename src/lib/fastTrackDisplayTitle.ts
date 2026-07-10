const INTERNAL_FAST_TRACK_TITLE_PATTERN = /\b(codex|project\s*5|fast\s*track|manual\s*ft|e2e|qa|dev|issue\d*|round\d*|smoke|trace|validation\s+proof|notice|dashboard\s+search|address\s+match|persist\s+proof|fresh\s+sla|fresh\s+assignment|board\d*|live\s*24h|cancelled?|cancel)\b/i;
const TIMESTAMP_OR_RAW_ID_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}|\b\d{10,}\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4})/i;

export const isInternalFastTrackTitle = (propertyTitle?: string | null) => {
  const normalized = String(propertyTitle || '').trim().replace(/\s+/g, ' ');

  return Boolean(
    normalized
    && INTERNAL_FAST_TRACK_TITLE_PATTERN.test(normalized)
    && TIMESTAMP_OR_RAW_ID_PATTERN.test(normalized)
  );
};

export const getFastTrackDisplayTitle = (
  propertyTitle?: string | null,
  fallback = 'your selected home',
) => {
  const normalized = String(propertyTitle || '').trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return fallback;
  }

  if (isInternalFastTrackTitle(normalized)) {
    return fallback;
  }

  return normalized;
};

export const getFastTrackWorkspaceDisplayTitle = (
  fastTrackCase: {
    propertyTitle?: string | null;
    clientName?: string | null;
  },
  role: 'user' | 'manager' | 'admin',
) => getFastTrackDisplayTitle(
  fastTrackCase.propertyTitle,
  role === 'user'
    ? 'your selected home'
    : fastTrackCase.clientName?.trim()
      ? `${fastTrackCase.clientName.trim()}'s fast-track case`
      : 'Selected fast-track case',
);
