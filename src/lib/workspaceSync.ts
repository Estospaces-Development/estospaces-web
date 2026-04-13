export const WORKSPACE_SYNC_TAGS = {
    FAST_TRACK: 'fast-track',
    APPLICATIONS: 'applications',
    VIEWINGS: 'viewings',
    CONTRACTS: 'contracts',
    PAYMENTS: 'payments',
    CASE_FILE: 'case-file',
    MESSAGES: 'messages',
    SUPPORT: 'support',
} as const;

export const WORKSPACE_SYNC_INTERVALS = {
    WORKFLOW: 15000,
    DASHBOARD: 30000,
} as const;

export type WorkspaceSyncEventSource = 'notification' | 'mutation' | 'manual' | 'system';

export interface WorkspaceSyncEvent {
    key: string;
    source: WorkspaceSyncEventSource;
    tags: string[];
    reason?: string;
    ids?: Record<string, string>;
    timestamp: number;
}

export interface PublishWorkspaceSyncInput {
    key?: string;
    source?: WorkspaceSyncEventSource;
    tags: string[];
    reason?: string;
    ids?: Record<string, string | undefined | null>;
}

export interface WorkspaceRefreshControllerOptions {
    tags: string[];
    refresh: () => void | Promise<void>;
    debounceMs?: number;
    enabled?: boolean;
}

export const WORKSPACE_SYNC_DEDUPE_TTL_MS = 4000;

type WorkspaceSyncListener = (event: WorkspaceSyncEvent) => void;

const trimString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const compactTags = (tags: Array<string | undefined | null>) => Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag))));

export const matchWorkspaceSyncTags = (registeredTags: string[], eventTags: string[]) => {
    if (registeredTags.length === 0 || eventTags.length === 0) {
        return false;
    }

    return registeredTags.some((tag) => eventTags.includes(tag));
};

export const normalizeWorkspaceSyncInput = (input: PublishWorkspaceSyncInput): WorkspaceSyncEvent | null => {
    const tags = compactTags(input.tags);
    if (tags.length === 0) {
        return null;
    }

    const cleanedIds = Object.entries(input.ids || {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
        const trimmed = trimString(value);
        if (trimmed) {
            accumulator[key] = trimmed;
        }
        return accumulator;
    }, {});

    return {
        key: trimString(input.key) || `${input.source || 'manual'}:${tags.join('|')}:${Date.now()}`,
        source: input.source || 'manual',
        tags,
        reason: trimString(input.reason) || undefined,
        ids: Object.keys(cleanedIds).length > 0 ? cleanedIds : undefined,
        timestamp: Date.now(),
    };
};

export class WorkspaceSyncBus {
    private listeners = new Set<WorkspaceSyncListener>();
    private recentKeys = new Map<string, number>();

    subscribe(listener: WorkspaceSyncListener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    publish(input: PublishWorkspaceSyncInput) {
        const event = normalizeWorkspaceSyncInput(input);
        if (!event || !this.shouldPublish(event.key, event.timestamp)) {
            return null;
        }

        this.listeners.forEach((listener) => listener(event));
        return event;
    }

    private shouldPublish(key: string, timestamp: number) {
        this.prune(timestamp);
        const previousTimestamp = this.recentKeys.get(key);
        if (previousTimestamp && (timestamp - previousTimestamp) < WORKSPACE_SYNC_DEDUPE_TTL_MS) {
            return false;
        }

        this.recentKeys.set(key, timestamp);
        return true;
    }

    private prune(timestamp: number) {
        this.recentKeys.forEach((storedAt, key) => {
            if ((timestamp - storedAt) >= WORKSPACE_SYNC_DEDUPE_TTL_MS) {
                this.recentKeys.delete(key);
            }
        });
    }
}

export const createWorkspaceRefreshController = ({
    tags,
    refresh,
    debounceMs = 250,
    enabled = true,
}: WorkspaceRefreshControllerOptions) => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const trigger = () => {
        if (!enabled) {
            return;
        }

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            timeoutId = null;
            void Promise.resolve(refresh());
        }, debounceMs);
    };

    return {
        handleEvent(event: WorkspaceSyncEvent) {
            if (!enabled || !matchWorkspaceSyncTags(tags, event.tags)) {
                return false;
            }

            trigger();
            return true;
        },
        trigger,
        dispose() {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        },
    };
};
