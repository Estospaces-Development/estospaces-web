export type VerificationDocumentRecord = {
  document_category?: string | null;
  document_type?: string | null;
};

export const USER_FIRST_TIME_VERIFICATION_REQUIREMENTS = ['identity', 'address'] as const;

const normalizeRequirementKey = (value: string | null | undefined): string => (
  String(value || '').trim().toLowerCase()
);

export const getVerificationDocumentKeys = (document: VerificationDocumentRecord): string[] => {
  const keys = [
    normalizeRequirementKey(document.document_category),
    normalizeRequirementKey(document.document_type),
  ].filter(Boolean);

  return Array.from(new Set(keys));
};

export const hasAnyRequiredVerificationDocument = (
  documents: VerificationDocumentRecord[],
  requiredKeys: readonly string[],
): boolean => {
  const requiredSet = new Set(requiredKeys.map(normalizeRequirementKey));

  return documents.some((document) => (
    getVerificationDocumentKeys(document).some((key) => requiredSet.has(key))
  ));
};

export const shouldRequireFirstTimeVerificationBundle = (
  documents: VerificationDocumentRecord[],
  requiredKeys: readonly string[],
): boolean => (
  requiredKeys.length > 1 && !hasAnyRequiredVerificationDocument(documents, requiredKeys)
);

export const getMissingVerificationBundleFileKeys = <T extends string>(
  filesByKey: Partial<Record<T, File | null | undefined>>,
  requiredKeys: readonly T[],
): T[] => requiredKeys.filter((key) => !filesByKey[key]);
