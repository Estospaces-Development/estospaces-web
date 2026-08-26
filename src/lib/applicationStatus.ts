/**
 * Normalize status values at the UI boundary. APIs and legacy records have
 * returned a mixture of casing, spaces, and hyphens for the same status.
 */
export const normalizeApplicationStatus = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const applicationStatusMatches = (
  actual: unknown,
  expected: unknown,
): boolean => normalizeApplicationStatus(actual) === normalizeApplicationStatus(expected);
