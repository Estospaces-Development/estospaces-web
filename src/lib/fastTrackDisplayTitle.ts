const INTERNAL_FAST_TRACK_TITLE_PATTERN = /\b(codex|project\s*5|fast\s*track|manual\s*ft|e2e)\b/i;
const TIMESTAMP_OR_RAW_ID_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}|\b\d{10,}\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4})/i;

export const getFastTrackDisplayTitle = (
  propertyTitle?: string | null,
  fallback = 'your selected home',
) => {
  const normalized = String(propertyTitle || '').trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return fallback;
  }

  if (INTERNAL_FAST_TRACK_TITLE_PATTERN.test(normalized) && TIMESTAMP_OR_RAW_ID_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized;
};
