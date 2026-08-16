import { getApplicationPropertyDisplayTitle } from '@/lib/applicationDisplayTitle';

export const getFastTrackDisplayTitle = (
  propertyTitle?: string | null,
  fallback = 'your selected home',
) => {
  const normalized = String(propertyTitle || '').trim().replace(/\s+/g, ' ');

  return getApplicationPropertyDisplayTitle(normalized, null, fallback);
};
