import { format, formatDistance, formatRelative, isValid, parseISO } from 'date-fns';

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date | null | undefined, formatStr = 'PPP'): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return format(dateObj, formatStr);
}

/**
 * Format date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return formatDistance(dateObj, new Date(), { addSuffix: true });
}

/**
 * Format date to relative format (e.g., "yesterday at 3:20 PM")
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) return '';

  return formatRelative(dateObj, new Date());
}

/**
 * Format date to short format (e.g., "Jan 15, 2026")
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMM d, yyyy');
}

/**
 * Format date to long format (e.g., "January 15, 2026")
 */
export function formatLongDate(date: string | Date | null | undefined): string {
  return formatDate(date, 'MMMM d, yyyy');
}

/**
 * Format time (e.g., "3:20 PM")
 */
export function formatTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'p');
}

/**
 * Format date and time (e.g., "Jan 15, 2026 at 3:20 PM")
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'PPp');
}
