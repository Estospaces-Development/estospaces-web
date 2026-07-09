const INTERNAL_APPLICATION_TITLE_PATTERN = /\b(codex|project\s*5|fast\s*track|manual\s*ft|e2e|mobile\s+live|mobile-live|qa\s+application)\b/i;
const RAW_ID_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}|\b\d{10,}\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4})/i;

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
  return address || fallback;
};
