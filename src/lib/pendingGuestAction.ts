import type { Location } from 'react-router-dom';

import {
    getLoginPath,
    sanitizeInternalReturnPath,
    sanitizePendingActionNonce,
    sanitizeReturnNavigationState,
    type ReturnNavigationState,
} from '@/lib/authUtils';

/**
 * A protected seeker action a guest attempted before signing in. It is kept in
 * sessionStorage (one tab, one entry) and bound to a single login handoff by a
 * random nonce plus the exact return path. It runs at most once, and only when
 * the post-login navigation carries the same nonce back to the same path.
 */
export type PendingGuestActionType = 'save' | 'enquire' | 'fast_track';
export type PendingGuestActionOrigin = 'search' | 'property';

export interface PendingGuestAction {
    type: PendingGuestActionType;
    origin: PendingGuestActionOrigin;
    propertyId: string;
    nonce: string;
    returnPath: string;
    createdAt: number;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type LocationLike = Pick<Location, 'pathname' | 'search' | 'hash'> & { state?: unknown };

export const PENDING_GUEST_ACTION_STORAGE_KEY = 'estospaces:pending-guest-action';
export const PENDING_GUEST_ACTION_TTL_MS = 30 * 60 * 1000;

const PENDING_GUEST_ACTION_TYPES = new Set<PendingGuestActionType>(['save', 'enquire', 'fast_track']);
const PENDING_GUEST_ACTION_ORIGINS = new Set<PendingGuestActionOrigin>(['search', 'property']);

const normalizePropertyId = (value: unknown) => (
    typeof value === 'string' ? value.trim().toLowerCase() : ''
);

/**
 * Comparable form of a return path: validated, trailing slash removed from the
 * pathname, hash ignored (it never affects which page consumes the action).
 */
export function normalizePendingActionReturnPath(value: unknown): string | null {
    const sanitized = sanitizeInternalReturnPath(value);
    if (!sanitized) {
        return null;
    }

    const parsed = new URL(sanitized, 'https://return-path.invalid');
    const pathname = parsed.pathname.length > 1 ? parsed.pathname.replace(/\/+$/, '') : parsed.pathname;
    return `${pathname}${parsed.search}`;
}

const createNonce = (): string => {
    const cryptoApi = globalThis.crypto;
    if (cryptoApi?.randomUUID) {
        return cryptoApi.randomUUID();
    }
    const bytes = new Uint8Array(16);
    if (cryptoApi?.getRandomValues) {
        cryptoApi.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

export function clearPendingGuestAction(storage: StorageLike | null | undefined): void {
    try {
        storage?.removeItem(PENDING_GUEST_ACTION_STORAGE_KEY);
    } catch {
        // Storage can be unavailable; nothing to clear.
    }
}

/**
 * Stores the action for the given return location and returns the nonce the
 * login handoff must carry back, or null when nothing was stored.
 */
export function storePendingGuestAction(
    storage: StorageLike | null | undefined,
    { type, origin, propertyId }: Pick<PendingGuestAction, 'type' | 'origin' | 'propertyId'>,
    returnLocation: Pick<Location, 'pathname' | 'search' | 'hash'>,
    now = Date.now(),
): string | null {
    const normalizedPropertyId = normalizePropertyId(propertyId);
    const returnPath = normalizePendingActionReturnPath(
        `${returnLocation.pathname}${returnLocation.search}${returnLocation.hash}`,
    );
    if (
        !storage
        || !normalizedPropertyId
        || !returnPath
        || !PENDING_GUEST_ACTION_TYPES.has(type)
        || !PENDING_GUEST_ACTION_ORIGINS.has(origin)
    ) {
        clearPendingGuestAction(storage);
        return null;
    }

    const nonce = createNonce();
    try {
        storage.setItem(PENDING_GUEST_ACTION_STORAGE_KEY, JSON.stringify({
            type,
            origin,
            propertyId: normalizedPropertyId,
            nonce,
            returnPath,
            createdAt: now,
        } satisfies PendingGuestAction));
    } catch {
        // Storage can be unavailable (private mode, quota); the return path still works.
        return null;
    }
    return nonce;
}

/**
 * Reads and always clears the stored action, so it can run at most once. It is
 * returned only when it is fresh and well formed, when the current location's
 * router state carries the same nonce, when the current path equals the stored
 * return path, and when the consumer-specific `matches` check passes.
 */
export function consumePendingGuestAction(
    storage: StorageLike | null | undefined,
    currentLocation: LocationLike,
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
    const storedNonce = sanitizePendingActionNonce(parsed?.nonce);
    const storedReturnPath = normalizePendingActionReturnPath(parsed?.returnPath);
    if (
        !parsed
        || !PENDING_GUEST_ACTION_TYPES.has(parsed.type as PendingGuestActionType)
        || !PENDING_GUEST_ACTION_ORIGINS.has(parsed.origin as PendingGuestActionOrigin)
        || !propertyId
        || !storedNonce
        || !storedReturnPath
        || !Number.isFinite(createdAt)
        || now - createdAt > PENDING_GUEST_ACTION_TTL_MS
        || createdAt - now > 60 * 1000
    ) {
        return null;
    }

    const locationNonce = sanitizeReturnNavigationState(currentLocation.state)?.pendingActionNonce;
    const currentPath = normalizePendingActionReturnPath(
        `${currentLocation.pathname}${currentLocation.search}${currentLocation.hash}`,
    );
    if (locationNonce !== storedNonce || currentPath !== storedReturnPath) {
        return null;
    }

    const action: PendingGuestAction = {
        type: parsed.type as PendingGuestActionType,
        origin: parsed.origin as PendingGuestActionOrigin,
        propertyId,
        nonce: storedNonce,
        returnPath: storedReturnPath,
        createdAt,
    };
    return matches(action) ? action : null;
}

export function isPendingGuestActionForProperty(action: PendingGuestAction, propertyId: string | undefined) {
    return Boolean(propertyId) && action.propertyId === normalizePropertyId(propertyId);
}

export interface GuestLoginReturnLocation {
    pathname: string;
    search: string;
    hash: string;
    state?: ReturnNavigationState;
}

/**
 * Login navigation for a guest: the validated current location travels as
 * `state.from`, with its validated back target and (when an action was stored)
 * the pending-action nonce in `state.from.state`.
 */
export function buildGuestLoginNavigation(
    location: LocationLike,
    pendingActionNonce?: string | null,
): { to: string; state?: { from: GuestLoginReturnLocation } } {
    const returnPath = sanitizeInternalReturnPath(`${location.pathname}${location.search}${location.hash}`);
    if (!returnPath) {
        return { to: getLoginPath() };
    }

    const parsed = new URL(returnPath, 'https://return-path.invalid');
    const backState = sanitizeReturnNavigationState(location.state);
    const returnState = sanitizeReturnNavigationState({
        backTo: backState?.backTo,
        backLabel: backState?.backLabel,
        pendingActionNonce: pendingActionNonce || undefined,
    });
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
