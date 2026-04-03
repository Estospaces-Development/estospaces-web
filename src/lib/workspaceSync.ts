import { getNotificationNavigationPath, isPropertyWorkflowNotification, NOTIFICATION_TYPES, type Notification } from '@/services/notificationsService';

export const WORKSPACE_SYNC_TAGS = {
    PROPERTIES: 'properties',
    MANAGER_PROPERTIES: 'manager-properties',
    ADMIN_PROPERTIES: 'admin-properties',
    USER_PROPERTIES: 'user-properties',
    MANAGER_DASHBOARD: 'manager-dashboard',
    ADMIN_DASHBOARD: 'admin-dashboard',
    USER_DASHBOARD: 'user-dashboard',
    DASHBOARD_SUMMARY: 'dashboard-summary',
    MANAGER_ANALYTICS: 'manager-analytics',
    ADMIN_ANALYTICS: 'admin-analytics',
    VERIFICATIONS: 'verifications',
    ADMIN_VERIFICATIONS: 'admin-verifications',
    MANAGER_VERIFICATION: 'manager-verification',
    USER_VERIFICATIONS: 'user-verifications',
    LEADS: 'leads',
    CLIENTS: 'clients',
    BROKER_REQUESTS: 'broker-requests',
    FAST_TRACK: 'fast-track',
    CASE_FILE: 'case-file',
    APPLICATIONS: 'applications',
    VIEWINGS: 'viewings',
    CONTRACTS: 'contracts',
    PAYMENTS: 'payments',
    BILLING: 'billing',
    MESSAGES: 'messages',
    SUPPORT: 'support',
} as const;

export type WorkspaceSyncTag = typeof WORKSPACE_SYNC_TAGS[keyof typeof WORKSPACE_SYNC_TAGS];

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
    notificationId?: string;
    notificationType?: string;
    entity?: string;
    targetPath?: string;
    ids?: Record<string, string>;
    timestamp: number;
}

export interface PublishWorkspaceSyncInput {
    key?: string;
    source?: WorkspaceSyncEventSource;
    tags: string[];
    reason?: string;
    notificationId?: string;
    notificationType?: string;
    entity?: string;
    targetPath?: string;
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

const PATH_TAGS: Array<{ needle: string; tags: string[] }> = [
    {
        needle: '/manager/dashboard/properties',
        tags: [
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
        ],
    },
    {
        needle: '/admin/properties',
        tags: [
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.ADMIN_PROPERTIES,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
        ],
    },
    {
        needle: '/manager/dashboard',
        tags: [
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
        ],
    },
    {
        needle: '/admin/dashboard',
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
        ],
    },
    {
        needle: '/manager/analytics',
        tags: [
            WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
    },
    {
        needle: '/admin/analytics',
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
        ],
    },
    {
        needle: '/admin/users',
        tags: [
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
        ],
    },
    {
        needle: '/user/dashboard',
        tags: [
            WORKSPACE_SYNC_TAGS.USER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
        ],
    },
    {
        needle: '/user/properties/',
        tags: [
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.USER_PROPERTIES,
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
        ],
    },
    {
        needle: '/admin/verifications',
        tags: [
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
        ],
    },
    {
        needle: '/manager/verification',
        tags: [
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.MANAGER_VERIFICATION,
        ],
    },
    {
        needle: '/manager/user-verifications',
        tags: [
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.USER_VERIFICATIONS,
        ],
    },
    {
        needle: '/manager/leads',
        tags: [
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.CLIENTS,
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
        ],
    },
    {
        needle: '/manager/clients',
        tags: [
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.CLIENTS,
        ],
    },
    {
        needle: '/fast-track',
        tags: [
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
        ],
    },
    {
        needle: '/case-file',
        tags: [
            WORKSPACE_SYNC_TAGS.CASE_FILE,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
    },
    {
        needle: '/case-files',
        tags: [
            WORKSPACE_SYNC_TAGS.CASE_FILE,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
    },
    {
        needle: '/applications',
        tags: [
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
        ],
    },
    {
        needle: '/viewings',
        tags: [
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
    },
    {
        needle: '/appointments',
        tags: [
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
    },
    {
        needle: '/contracts',
        tags: [
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        ],
    },
    {
        needle: '/payments',
        tags: [
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
    },
    {
        needle: '/billing',
        tags: [
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
        ],
    },
    {
        needle: '/messages',
        tags: [WORKSPACE_SYNC_TAGS.MESSAGES],
    },
    {
        needle: '/help',
        tags: [WORKSPACE_SYNC_TAGS.MESSAGES, WORKSPACE_SYNC_TAGS.SUPPORT],
    },
    {
        needle: 'workspace=broker-request',
        tags: [
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.USER_DASHBOARD,
        ],
    },
];

const VIEWING_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.VIEWING_BOOKED,
    NOTIFICATION_TYPES.VIEWING_CONFIRMED,
    NOTIFICATION_TYPES.VIEWING_COMPLETED,
    NOTIFICATION_TYPES.VIEWING_CANCELLED,
    NOTIFICATION_TYPES.VIEWING_RESCHEDULED,
    NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
]);

const APPLICATION_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.APPLICATION_UPDATE,
    NOTIFICATION_TYPES.APPLICATION_SUBMITTED,
    NOTIFICATION_TYPES.APPLICATION_APPROVED,
    NOTIFICATION_TYPES.APPLICATION_REJECTED,
    NOTIFICATION_TYPES.DOCUMENTS_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED,
    NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED,
]);

const VERIFICATION_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.DOCUMENT_VERIFIED,
    NOTIFICATION_TYPES.PROFILE_VERIFIED,
    NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED,
    NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED,
    NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED,
]);

const FAST_TRACK_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.FAST_TRACK_STARTED,
    NOTIFICATION_TYPES.FAST_TRACK_UPDATED,
    NOTIFICATION_TYPES.FAST_TRACK_COMPLETED,
    NOTIFICATION_TYPES.SALE_JOURNEY_UPDATED,
    NOTIFICATION_TYPES.SALE_JOURNEY_COMPLETED,
]);

const BILLING_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.PAYMENT_RECEIVED,
    NOTIFICATION_TYPES.PAYMENT_FAILED,
    NOTIFICATION_TYPES.PAYMENT_REMINDER,
    NOTIFICATION_TYPES.CONTRACT_UPDATE,
    NOTIFICATION_TYPES.CONTRACT_EXPIRING,
]);

const MESSAGE_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPES.MESSAGE_RECEIVED,
    NOTIFICATION_TYPES.TICKET_RESPONSE,
    NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED,
    NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED,
]);

const trimString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const compactTags = (tags: Array<string | undefined | null>) => Array.from(new Set(tags.filter((tag): tag is string => Boolean(tag))));

const pickIDs = (data: Record<string, any> | null | undefined) => {
    if (!data) {
        return {};
    }

    return Object.entries({
        propertyId: trimString(data.propertyId || data.property_id),
        leadId: trimString(data.leadId || data.lead_id),
        caseId: trimString(data.caseId || data.case_id || data.fastTrackId || data.fast_track_id),
        applicationId: trimString(data.applicationId || data.application_id),
        viewingId: trimString(data.viewingId || data.viewing_id),
        contractId: trimString(data.contractId || data.contract_id),
        paymentId: trimString(data.paymentId || data.payment_id),
        invoiceId: trimString(data.invoiceId || data.invoice_id),
        conversationId: trimString(data.conversationId || data.conversation_id),
        subjectUserId: trimString(data.subject_user_id || data.subjectUserId),
    }).reduce<Record<string, string>>((accumulator, [key, value]) => {
        if (value) {
            accumulator[key] = value;
        }
        return accumulator;
    }, {});
};

export const matchWorkspaceSyncTags = (registeredTags: string[], eventTags: string[]) => {
    if (registeredTags.length === 0 || eventTags.length === 0) {
        return false;
    }

    return registeredTags.some((tag) => eventTags.includes(tag));
};

export const resolveWorkspaceSyncTagsFromPath = (path: string) => {
    const normalizedPath = trimString(path).toLowerCase();
    if (!normalizedPath) {
        return [];
    }

    return compactTags(
        PATH_TAGS.flatMap((candidate) => (
            normalizedPath.includes(candidate.needle.toLowerCase()) ? candidate.tags : []
        )),
    );
};

export const normalizeWorkspaceSyncInput = (input: PublishWorkspaceSyncInput): WorkspaceSyncEvent | null => {
    const tags = compactTags(input.tags);
    if (tags.length === 0) {
        return null;
    }

    const cleanedIDs = Object.entries(input.ids || {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
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
        notificationId: trimString(input.notificationId) || undefined,
        notificationType: trimString(input.notificationType) || undefined,
        entity: trimString(input.entity) || undefined,
        targetPath: trimString(input.targetPath) || undefined,
        ids: Object.keys(cleanedIDs).length > 0 ? cleanedIDs : undefined,
        timestamp: Date.now(),
    };
};

export const normalizeNotificationToWorkspaceSyncEvent = (
    notification: Pick<Notification, 'id' | 'type' | 'data'>,
    role = 'user',
): WorkspaceSyncEvent | null => {
    const targetPath = getNotificationNavigationPath(notification, role) || trimString(notification.data?.target_path || notification.data?.targetPath);
    const entity = trimString(notification.data?.entity);
    const ids = pickIDs(notification.data);

    const tags = resolveWorkspaceSyncTagsFromPath(targetPath);

    if (isPropertyWorkflowNotification(notification)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES,
            WORKSPACE_SYNC_TAGS.ADMIN_PROPERTIES,
            WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
            WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD,
            WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS,
            WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS,
            WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY,
        );
    }

    if (VIEWING_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.CASE_FILE,
        );
    }

    if (APPLICATION_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.CASE_FILE,
        );
    }

    if (FAST_TRACK_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.APPLICATIONS,
            WORKSPACE_SYNC_TAGS.CASE_FILE,
            WORKSPACE_SYNC_TAGS.VIEWINGS,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
            WORKSPACE_SYNC_TAGS.PAYMENTS,
        );
    }

    if (VERIFICATION_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.ADMIN_VERIFICATIONS,
            WORKSPACE_SYNC_TAGS.MANAGER_VERIFICATION,
            WORKSPACE_SYNC_TAGS.USER_VERIFICATIONS,
        );
    }

    if (MESSAGE_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.MESSAGES,
        );
    }

    if (
        notification.type === NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED
        || notification.type === NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED
        || notification.type === NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED
        || notification.type === NOTIFICATION_TYPES.TICKET_RESPONSE
    ) {
        tags.push(WORKSPACE_SYNC_TAGS.SUPPORT);
    }

    if (BILLING_NOTIFICATION_TYPES.has(notification.type as any)) {
        tags.push(
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
            WORKSPACE_SYNC_TAGS.CONTRACTS,
        );
    }

    if (entity.includes('broker_request')) {
        tags.push(
            WORKSPACE_SYNC_TAGS.BROKER_REQUESTS,
            WORKSPACE_SYNC_TAGS.LEADS,
            WORKSPACE_SYNC_TAGS.CLIENTS,
        );
    }

    if (entity.includes('verification')) {
        tags.push(WORKSPACE_SYNC_TAGS.VERIFICATIONS);
    }

    if (entity.includes('property')) {
        tags.push(WORKSPACE_SYNC_TAGS.PROPERTIES);
    }

    if (entity.includes('fast_track') || ids.caseId) {
        tags.push(
            WORKSPACE_SYNC_TAGS.FAST_TRACK,
            WORKSPACE_SYNC_TAGS.CASE_FILE,
        );
    }

    if (ids.paymentId || ids.invoiceId) {
        tags.push(
            WORKSPACE_SYNC_TAGS.PAYMENTS,
            WORKSPACE_SYNC_TAGS.BILLING,
        );
    }

    return normalizeWorkspaceSyncInput({
        key: `notification:${notification.id}`,
        source: 'notification',
        tags,
        reason: notification.type,
        notificationId: notification.id,
        notificationType: notification.type,
        entity,
        targetPath,
        ids,
    });
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

    publishMany(inputs: PublishWorkspaceSyncInput[]) {
        return inputs
            .map((input) => this.publish(input))
            .filter((event): event is WorkspaceSyncEvent => Boolean(event));
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
