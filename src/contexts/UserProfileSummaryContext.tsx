"use client";

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type UserProfileSummary, userService } from '@/services/userService';

type SummaryCache = Record<string, UserProfileSummary | null>;

interface UserProfileSummaryContextValue {
    summaries: SummaryCache;
    ensureSummaries: (ids: Array<string | null | undefined>) => void;
    getSummary: (id?: string | null) => UserProfileSummary | null;
    mergeSummary: (summary: UserProfileSummary) => void;
}

const UserProfileSummaryContext = createContext<UserProfileSummaryContextValue | undefined>(undefined);
const SUMMARY_REVALIDATE_MS = 30_000;

const normalizeId = (value?: string | null) => String(value || '').trim();

const getFallbackDisplayName = (user: ReturnType<typeof useAuth>['user']) => {
    if (!user) {
        return '';
    }

    return user.user_metadata?.full_name || user.name || user.email.split('@')[0] || 'User';
};

export const UserProfileSummaryProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [cacheVersion, setCacheVersion] = useState(0);
    const cacheRef = useRef<SummaryCache>({});
    const fetchedAtRef = useRef<Record<string, number>>({});
    const pendingIdsRef = useRef<Set<string>>(new Set());
    const inFlightIdsRef = useRef<Set<string>>(new Set());
    const flushTimerRef = useRef<number | null>(null);
    const previousUserIdRef = useRef<string | null>(null);
    const isMountedRef = useRef(true);

    const publish = useCallback(() => {
        if (!isMountedRef.current) {
            return;
        }
        setCacheVersion((version) => version + 1);
    }, []);

    const mergeSummary = useCallback((summary: UserProfileSummary) => {
        const normalizedId = normalizeId(summary.id);
        if (!normalizedId) {
            return;
        }

        cacheRef.current = {
            ...cacheRef.current,
            [normalizedId]: {
                ...summary,
                id: normalizedId,
            },
        };
        fetchedAtRef.current[normalizedId] = Date.now();
        publish();
    }, [publish]);

    const getSummary = useCallback((id?: string | null) => {
        const normalizedId = normalizeId(id);
        if (!normalizedId) {
            return null;
        }

        return cacheRef.current[normalizedId] ?? null;
    }, []);

    const flushPending = useCallback(async () => {
        const ids = Array.from(pendingIdsRef.current);
        if (ids.length === 0) {
            return;
        }

        pendingIdsRef.current.clear();
        ids.forEach((id) => inFlightIdsRef.current.add(id));

        const { data, error } = await userService.getUserSummaries(ids);
        ids.forEach((id) => inFlightIdsRef.current.delete(id));

        if (error) {
            return;
        }

        const nextCache: SummaryCache = { ...cacheRef.current };
        const returnedIds = new Set<string>();
        const fetchedAt = Date.now();

        for (const summary of data) {
            const normalizedId = normalizeId(summary.id);
            if (!normalizedId) {
                continue;
            }
            returnedIds.add(normalizedId);
            fetchedAtRef.current[normalizedId] = fetchedAt;
            nextCache[normalizedId] = {
                ...summary,
                id: normalizedId,
            };
        }

        for (const id of ids) {
            if (!returnedIds.has(id) && nextCache[id] === undefined) {
                nextCache[id] = null;
            }
            if (!returnedIds.has(id)) {
                fetchedAtRef.current[id] = fetchedAt;
            }
        }

        cacheRef.current = nextCache;
        publish();
    }, [publish]);

    const scheduleFlush = useCallback(() => {
        if (flushTimerRef.current !== null) {
            return;
        }

        flushTimerRef.current = window.setTimeout(() => {
            flushTimerRef.current = null;
            void flushPending();
        }, 0);
    }, [flushPending]);

    const ensureSummaries = useCallback((ids: Array<string | null | undefined>) => {
        let hasNewPendingId = false;

        for (const id of ids) {
            const normalizedId = normalizeId(id);
            if (!normalizedId) {
                continue;
            }
            if (inFlightIdsRef.current.has(normalizedId)) {
                continue;
            }
            const hasCachedValue = cacheRef.current[normalizedId] !== undefined;
            const fetchedAt = fetchedAtRef.current[normalizedId] || 0;
            const isStale = !hasCachedValue || (Date.now() - fetchedAt) >= SUMMARY_REVALIDATE_MS;
            if (!isStale) {
                continue;
            }
            pendingIdsRef.current.add(normalizedId);
            hasNewPendingId = true;
        }

        if (hasNewPendingId) {
            scheduleFlush();
        }
    }, [scheduleFlush]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            if (flushTimerRef.current !== null) {
                window.clearTimeout(flushTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        const currentUserId = normalizeId(user?.id);
        if (previousUserIdRef.current !== currentUserId) {
            cacheRef.current = {};
            fetchedAtRef.current = {};
            pendingIdsRef.current.clear();
            inFlightIdsRef.current.clear();
            previousUserIdRef.current = currentUserId;
            publish();
        }

        if (!user || !currentUserId) {
            return;
        }

        mergeSummary({
            id: currentUserId,
            display_name: getFallbackDisplayName(user),
            avatar: user.avatar || user.avatar_url || '',
            role: user.role,
        });
    }, [
        mergeSummary,
        publish,
        user,
        user?.avatar,
        user?.avatar_url,
        user?.email,
        user?.id,
        user?.name,
        user?.role,
        user?.user_metadata?.full_name,
    ]);

    const value = useMemo(() => ({
        summaries: cacheRef.current,
        ensureSummaries,
        getSummary,
        mergeSummary,
    }), [cacheVersion, ensureSummaries, getSummary, mergeSummary]);

    return (
        <UserProfileSummaryContext.Provider value={value}>
            {children}
        </UserProfileSummaryContext.Provider>
    );
};

export const useUserProfileSummaries = () => {
    const context = useContext(UserProfileSummaryContext);
    if (!context) {
        throw new Error('useUserProfileSummaries must be used within a UserProfileSummaryProvider');
    }
    return context;
};

export const useUserProfileSummary = (id?: string | null) => {
    const { ensureSummaries, getSummary } = useUserProfileSummaries();
    const normalizedId = normalizeId(id);

    useEffect(() => {
        if (!normalizedId) {
            return;
        }

        ensureSummaries([normalizedId]);
        const interval = window.setInterval(() => {
            ensureSummaries([normalizedId]);
        }, SUMMARY_REVALIDATE_MS);

        return () => window.clearInterval(interval);
    }, [ensureSummaries, normalizedId]);

    return getSummary(normalizedId);
};
