/**
 * Listing ids that the property lookup did not return. A failed lookup (null)
 * marks nothing as missing, so callers keep listings available.
 */
export const findMissingListingIds = (
    requestedIds: string[],
    foundProperties: Array<{ id?: string | null }> | null,
): Set<string> => {
    if (!foundProperties) {
        return new Set();
    }
    const foundIds = new Set(foundProperties.map((property) => String(property.id || '').trim()));
    return new Set(requestedIds.filter((id) => !foundIds.has(id)));
};
