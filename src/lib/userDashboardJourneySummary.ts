const INTERNAL_JOURNEY_TITLE_PATTERN = /\b(codex|project\s*5|fast\s*track|manual\s*ft|e2e)\b/i;
const TIMESTAMP_OR_RAW_ID_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}[-:]\d{2}[-:]\d{2}|\b\d{10,}\b|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4})/i;

export const getUserJourneyPropertyDisplayTitle = (propertyTitle?: string | null) => {
  const normalized = String(propertyTitle || '').trim().replace(/\s+/g, ' ');

  if (!normalized) {
    return 'your selected home';
  }

  if (INTERNAL_JOURNEY_TITLE_PATTERN.test(normalized) && TIMESTAMP_OR_RAW_ID_PATTERN.test(normalized)) {
    return 'your selected home';
  }

  return normalized;
};

export const buildUserJourneyNowCopy = (propertyTitle: string | null | undefined, stageLabel: string) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)} is at ${stageLabel.toLowerCase()}.`
);

export const buildCompletedUserJourneyCopy = (propertyTitle: string | null | undefined) => (
  `${getUserJourneyPropertyDisplayTitle(propertyTitle)} has finished its guided journey.`
);
