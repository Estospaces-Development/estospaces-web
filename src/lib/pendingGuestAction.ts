import type { Location } from 'react-router-dom';

import {
    getLoginPath,
    sanitizeInternalReturnPath,
    sanitizeReturnNavigationState,
    type ReturnNavigationState,
} from '@/lib/authUtils';

/**
 * A protected seeker action a guest attempted before signing in. It is kept in
 * sessionStorage (one tab, one entry) and consumed at most once after the user
 * returns to the page where it started.
 */
export type PendingGuestActionType = 'save' | 'enquire' | 'fast_track';
export type PendingGuestActionOrigin = 'search' | 'property';

export interface PendingGuestAction {
    type: PendingGuestActionType;
    origin: PendingGuestActionOrigin;
    propertyId: string;
    createdAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export const PENDING_GUEST_ACTION_STORAGE_KEY = 'estospaces:pending-guest-action';
export const PENDING_GUEST_ACTION_TTL_MS = 30 * 60 * 1000;

const PENDING_GUEST_ACTION_TYPES = new Set<PendingGuestActionType>(['save', 'enquire', 'fast_track']);
const PENDING_GUEST_ACTION_ORIGINS = new Set<PendingGuestActionOrigin>(['search', 'property']);

const normalizePropertyId = (value: unknown) => (
    typeof value === 'string' ? value.trim().toLowerCase() : ''
);

export function storePendingGuestAction(
    storage: StorageLike | null | undefined,
    { type, origin, propertyId }: Pick<PendingGuestAction, 'type' | 'origin' | 'propertyId'>,
    now = Date.now(),
): void {
    const normalizedPropertyId = normalizePropertyId(propertyId);
    if (
        !storage
        || !normalizedPropertyId
        || !PENDING_GUEST_ACTION_TYPES.has(type)
        || !PENDING_GUEST_ACTION_ORIGINS.has(origin)
    ) {
        return;
    }

    try {
        storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({
            type,
            origin,
            propertyId: normalizedPropertyId,
            createdAt: now,
        } satisfies PendingGuestAction));
    } catch {
        // Storage can be unavailable (private mode, quota); the return path still works.
    }
}

/**
 * Reads and always clears the stored action, so it can run at most once. Returns
 * it only when it is fresh, well formed and matches the page that consumes it.
 */
export function consumePendingGuestAction(
    storage: StorageLike | null | undefined,
    matches: (action: PendingGuestAction) => boolean,
    now = Date.now(),
): PendingGuestAction | null {
    if (!storage) {
        return null;
    }

    let raw: string | null = null;
    try {
        raw = storage.getItem(PENDING_GUEST_ACTION_STORAGE_KEY);
        if (raw !== null) {
            storage.removeItem(PENDING_GUEST_ACTION_STORAGE_KEY);
        }
    } catch {
        return null;
    }
    if (!raw) {
        return null;
    }

    let parsed: Partial<PendingGuestAction> | null = null;
    try {
        parsed = JSON.parse(raw) as Partial<PendingGuestAction>;
    } catch {
        return null;
    }

    const propertyId = normalizePropertyId(parsed?.propertyId);
    const createdAt = typeof parsed?.createdAt === 'number' ? parsed.createdAt : Number.NaN;
    if (
        !parsed
        || !PENDING_GUEST_ACTION_TYPES.has(parsed.type as PendingGuestActionType)
        || !PENDING_GUEST_ACTION_ORIGINS.has(parsed.origin as PendingGuestActionOrigin)
        || !propertyId
        || !Number.isFinite(createdAt)
        || now - createdAt > PENDING_GUEST_ACTION_TTL_MS
        || createdAt - now > 60 * 1000
    ) {
        return null;
    }

    const action: PendingGuestAction = {
        type: parsed.type as PendingGuestActionType,
        origin: parsed.origin as PendingGuestActionOrigin,
        propertyId,
        createdAt,
    };
    return matches(action) ? action : null;
}

export function isPendingGuestActionForProperty(action: PendingGuestAction, propertyId: string | undefined) {
    return Boolean(propertyId) && action.propertyId === normalizePropertyId(propertyId);
}

/**
 * Login navigation for a guest: the validated current location travels as
 * `state.from` so the login page can return the seeker to it.
 */
export interface GuestLoginReturnLocation {
    pathname: string;
    search: string;
    hash: string;
    state?: ReturnNavigationState;
}

export function buildGuestLoginNavigation(
    location: Pick<Location, 'pathname' | 'search' | 'hash'> & { state?: unknown },
): { to: string; state?: { from: GuestLoginReturnLocation } } {
    const returnPath = sanitizeInternalReturnPath(`${location.pathname}${location.search}${location.hash}`);
    if (!returnPath) {
        return { to: getLoginPath() };
    }

    const parsed = new URL(returnPath, 'https://return-path.invalid');
    const returnState = sanitizeReturnNavigationState(location.state);
    return {
        to: getLoginPath(),
        state: {
            from: {
                pathname: parsed.pathname,
                search: parsed.search,
                hash: parsed.hash,
                ...(returnState ? { state: returnState } : {}),
            },
        },
    };
}
