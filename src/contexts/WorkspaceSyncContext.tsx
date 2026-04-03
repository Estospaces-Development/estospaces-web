"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import {
    createWorkspaceRefreshController,
    type PublishWorkspaceSyncInput,
    type WorkspaceSyncEvent,
    WORKSPACE_SYNC_INTERVALS,
    WorkspaceSyncBus,
} from '@/lib/workspaceSync';

interface WorkspaceSyncContextValue {
    publish: (input: PublishWorkspaceSyncInput) => WorkspaceSyncEvent | null;
    publishMany: (inputs: PublishWorkspaceSyncInput[]) => WorkspaceSyncEvent[];
    subscribe: (listener: (event: WorkspaceSyncEvent) => void) => () => void;
}

interface UseWorkspaceRefreshOptions {
    tags: string[];
    refresh: () => void | Promise<void>;
    enabled?: boolean;
    intervalMs?: number;
    refreshOnFocus?: boolean;
    refreshOnVisible?: boolean;
    debounceMs?: number;
}

type UsePresetWorkspaceRefreshOptions = Pick<
    UseWorkspaceRefreshOptions,
    'tags' | 'refresh' | 'enabled' | 'debounceMs'
>;

const WorkspaceSyncContext = createContext<WorkspaceSyncContextValue | undefined>(undefined);

export const WorkspaceSyncProvider = ({ children }: { children: React.ReactNode }) => {
    const busRef = useRef<WorkspaceSyncBus | null>(null);

    if (busRef.current === null) {
        busRef.current = new WorkspaceSyncBus();
    }

    const publish = useCallback((input: PublishWorkspaceSyncInput) => (
        busRef.current?.publish(input) || null
    ), []);

    const publishMany = useCallback((inputs: PublishWorkspaceSyncInput[]) => (
        busRef.current?.publishMany(inputs) || []
    ), []);

    const subscribe = useCallback((listener: (event: WorkspaceSyncEvent) => void) => (
        busRef.current?.subscribe(listener) || (() => undefined)
    ), []);

    const value = useMemo(() => ({
        publish,
        publishMany,
        subscribe,
    }), [publish, publishMany, subscribe]);

    return (
        <WorkspaceSyncContext.Provider value={value}>
            {children}
        </WorkspaceSyncContext.Provider>
    );
};

export const useWorkspaceSync = () => {
    const context = useContext(WorkspaceSyncContext);
    if (!context) {
        throw new Error('useWorkspaceSync must be used within a WorkspaceSyncProvider');
    }
    return context;
};

export const usePublishWorkspaceSync = () => useWorkspaceSync().publish;

export const useWorkspaceRefresh = ({
    tags,
    refresh,
    enabled = true,
    intervalMs,
    refreshOnFocus = false,
    refreshOnVisible = false,
    debounceMs = 250,
}: UseWorkspaceRefreshOptions) => {
    const { subscribe } = useWorkspaceSync();
    const refreshRef = useRef(refresh);
    const tagsKey = useMemo(() => Array.from(new Set(tags)).sort().join('|'), [tags]);
    const controllerRef = useRef<ReturnType<typeof createWorkspaceRefreshController> | null>(null);

    useEffect(() => {
        refreshRef.current = refresh;
    }, [refresh]);

    useEffect(() => {
        controllerRef.current?.dispose();
        controllerRef.current = createWorkspaceRefreshController({
            tags: tagsKey ? tagsKey.split('|') : [],
            refresh: () => refreshRef.current(),
            debounceMs,
            enabled,
        });

        return () => {
            controllerRef.current?.dispose();
            controllerRef.current = null;
        };
    }, [debounceMs, enabled, tagsKey]);

    useEffect(() => {
        if (!enabled || !controllerRef.current) {
            return;
        }

        return subscribe((event) => {
            controllerRef.current?.handleEvent(event);
        });
    }, [enabled, subscribe, tagsKey]);

    useEffect(() => {
        if (!enabled || !intervalMs || !controllerRef.current) {
            return;
        }

        const handleInterval = () => {
            if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
                return;
            }

            controllerRef.current?.trigger();
        };

        const interval = window.setInterval(handleInterval, intervalMs);
        return () => window.clearInterval(interval);
    }, [enabled, intervalMs, tagsKey]);

    useEffect(() => {
        if (!enabled || (!refreshOnFocus && !refreshOnVisible) || !controllerRef.current) {
            return;
        }

        const handleFocus = () => {
            if (!refreshOnFocus) {
                return;
            }
            controllerRef.current?.trigger();
        };

        const handleVisibility = () => {
            if (!refreshOnVisible || document.visibilityState !== 'visible') {
                return;
            }
            controllerRef.current?.trigger();
        };

        if (refreshOnFocus) {
            window.addEventListener('focus', handleFocus);
        }
        if (refreshOnVisible) {
            document.addEventListener('visibilitychange', handleVisibility);
        }

        return () => {
            if (refreshOnFocus) {
                window.removeEventListener('focus', handleFocus);
            }
            if (refreshOnVisible) {
                document.removeEventListener('visibilitychange', handleVisibility);
            }
        };
    }, [enabled, refreshOnFocus, refreshOnVisible, tagsKey]);

    return {
        triggerRefresh: () => controllerRef.current?.trigger(),
    };
};

export const useWorkflowWorkspaceRefresh = ({
    tags,
    refresh,
    enabled = true,
    debounceMs,
}: UsePresetWorkspaceRefreshOptions) => useWorkspaceRefresh({
    tags,
    refresh,
    enabled,
    debounceMs,
    intervalMs: WORKSPACE_SYNC_INTERVALS.WORKFLOW,
    refreshOnFocus: true,
    refreshOnVisible: true,
});

export const useDashboardWorkspaceRefresh = ({
    tags,
    refresh,
    enabled = true,
    debounceMs,
}: UsePresetWorkspaceRefreshOptions) => useWorkspaceRefresh({
    tags,
    refresh,
    enabled,
    debounceMs,
    intervalMs: WORKSPACE_SYNC_INTERVALS.DASHBOARD,
    refreshOnFocus: true,
    refreshOnVisible: true,
});
