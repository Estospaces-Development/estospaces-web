/**
 * Resolves a manager property detail/edit route from the authoritative
 * property-by-ID read instead of the paginated inventory list, so a listing on
 * any inventory page survives direct navigation and reload.
 */

export interface ManagerPropertyLookup<T> {
    data: T | null;
    /** `manager_id` from the backend payload. */
    ownerId?: string | null;
    error: string | null;
    status?: number;
}

export interface ManagerPropertyViewer {
    id?: string | null;
    role?: string | null;
}

export type ManagerPropertyDetailResult<T> =
    | { kind: 'found'; property: T }
    | { kind: 'not_found' }
    | { kind: 'forbidden' }
    | { kind: 'error'; message: string };

export type ManagerPropertyLoadFailureKind = Exclude<ManagerPropertyDetailResult<unknown>['kind'], 'found'>;

export const MANAGER_PROPERTY_LOAD_ERROR_MESSAGE =
    "We couldn't load this property right now. Check your connection and try again.";

export const managerPropertyDetailQueryKey = (id: string, viewerId?: string | null) =>
    ['manager-property-detail', id.trim(), viewerId || ''] as const;

const normalize = (value?: string | null) => (value || '').trim().toLowerCase();

export const resolveManagerPropertyDetail = <T>(
    lookup: ManagerPropertyLookup<T>,
    viewer: ManagerPropertyViewer | null | undefined,
): ManagerPropertyDetailResult<T> => {
    if (lookup.status === 404) {
        return { kind: 'not_found' };
    }
    if (lookup.status === 401 || lookup.status === 403) {
        return { kind: 'forbidden' };
    }
    if (lookup.error) {
        return { kind: 'error', message: MANAGER_PROPERTY_LOAD_ERROR_MESSAGE };
    }
    if (!lookup.data) {
        return { kind: 'not_found' };
    }
    if (normalize(viewer?.role) === 'admin') {
        return { kind: 'found', property: lookup.data };
    }

    // The catalog read also returns other managers' public listings. The
    // manager workspace offers edit/publish/delete actions that core refuses
    // for non-owners, so fail closed unless ownership is proven.
    const ownerId = normalize(lookup.ownerId);
    const viewerId = normalize(viewer?.id);
    if (!ownerId || !viewerId || ownerId !== viewerId) {
        return { kind: 'forbidden' };
    }

    return { kind: 'found', property: lookup.data };
};

export const loadManagerPropertyDetail = async <T>(
    id: string | undefined,
    viewer: ManagerPropertyViewer | null | undefined,
    fetchById: (id: string) => Promise<ManagerPropertyLookup<T>>,
): Promise<ManagerPropertyDetailResult<T>> => {
    const normalizedId = (id || '').trim();
    if (!normalizedId) {
        return { kind: 'not_found' };
    }

    try {
        return resolveManagerPropertyDetail(await fetchById(normalizedId), viewer);
    } catch {
        return { kind: 'error', message: MANAGER_PROPERTY_LOAD_ERROR_MESSAGE };
    }
};
