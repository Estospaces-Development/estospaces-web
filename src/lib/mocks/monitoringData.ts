// Mock data for Real-Time Monitoring Dashboard

export interface LiveMetrics {
    activeProperties: number;
    fastTrackActive: number;
    viewingsToday: number;
    dealsReady: number;
    pendingActions: number;
}

export type ActivityType = 'fast_track' | 'viewing' | 'document' | 'approval' | 'deal';
export type ActivitySeverity = 'info' | 'warning' | 'critical';

export interface ActivityItem {
    id: string;
    type: ActivityType;
    message: string;
    severity: ActivitySeverity;
    timestamp: Date;
}

// Initial live metrics
export const initialMetrics: LiveMetrics = {
    activeProperties: 47,
    fastTrackActive: 8,
    viewingsToday: 12,
    dealsReady: 5,
    pendingActions: 3,
};

// Initial activity feed (minimum 15 items with mixed severity)
export const initialActivityFeed: ActivityItem[] = [
    {
        id: 'act-001',
        type: 'fast_track',
        message: 'Fast Track case #FT-2401 nearing SLA limit (2 hours remaining)',
        severity: 'warning',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 mins ago
    },
    {
        id: 'act-002',
        type: 'document',
        message: 'Documents verified for Property #P-8834 (Koramangala)',
        severity: 'info',
        timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 mins ago
    },
    {
        id: 'act-003',
        type: 'deal',
        message: 'Deal marked ready for lease: Property #P-7721',
        severity: 'info',
        timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 mins ago
    },
    {
        id: 'act-004',
        type: 'viewing',
        message: 'Viewing scheduled for Property #P-9012 at 3:00 PM',
        severity: 'info',
        timestamp: new Date(Date.now() - 12 * 60 * 1000), // 12 mins ago
    },
    {
        id: 'act-005',
        type: 'fast_track',
        message: 'Fast Track case #FT-2398 EXPIRED - requires immediate attention',
        severity: 'critical',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
    },
    {
        id: 'act-006',
        type: 'approval',
        message: 'Manager approval required for Property #P-6543 lease agreement',
        severity: 'warning',
        timestamp: new Date(Date.now() - 18 * 60 * 1000), // 18 mins ago
    },
    {
        id: 'act-007',
        type: 'document',
        message: 'Owner documents uploaded for Property #P-5521',
        severity: 'info',
        timestamp: new Date(Date.now() - 22 * 60 * 1000), // 22 mins ago
    },
    {
        id: 'act-008',
        type: 'viewing',
        message: 'Viewing completed for Property #P-4432 - positive feedback',
        severity: 'info',
        timestamp: new Date(Date.now() - 28 * 60 * 1000), // 28 mins ago
    },
    {
        id: 'act-009',
        type: 'fast_track',
        message: 'Fast Track case #FT-2395 advanced to Payment Readiness stage',
        severity: 'info',
        timestamp: new Date(Date.now() - 32 * 60 * 1000), // 32 mins ago
    },
    {
        id: 'act-010',
        type: 'deal',
        message: 'Deal finalized for Property #P-3321 - lease signed',
        severity: 'info',
        timestamp: new Date(Date.now() - 38 * 60 * 1000), // 38 mins ago
    },
    {
        id: 'act-011',
        type: 'approval',
        message: 'Pending approval: Fast Track case #FT-2392 document verification',
        severity: 'warning',
        timestamp: new Date(Date.now() - 42 * 60 * 1000), // 42 mins ago
    },
    {
        id: 'act-012',
        type: 'viewing',
        message: 'Viewing cancelled for Property #P-2211 - client unavailable',
        severity: 'warning',
        timestamp: new Date(Date.now() - 48 * 60 * 1000), // 48 mins ago
    },
    {
        id: 'act-013',
        type: 'document',
        message: 'Legal check completed for Property #P-1123',
        severity: 'info',
        timestamp: new Date(Date.now() - 55 * 60 * 1000), // 55 mins ago
    },
    {
        id: 'act-014',
        type: 'fast_track',
        message: 'New Fast Track case created: #FT-2402 (Property #P-9988)',
        severity: 'info',
        timestamp: new Date(Date.now() - 62 * 60 * 1000), // 62 mins ago
    },
    {
        id: 'act-015',
        type: 'deal',
        message: 'Payment received for Property #P-0987 - deal closing soon',
        severity: 'info',
        timestamp: new Date(Date.now() - 68 * 60 * 1000), // 68 mins ago
    },
    {
        id: 'act-016',
        type: 'approval',
        message: 'Broker request #BR-5543 requires manager review',
        severity: 'warning',
        timestamp: new Date(Date.now() - 75 * 60 * 1000), // 75 mins ago
    },
];

// Helper function to generate random activity updates
const activityTemplates: Array<{ type: ActivityType; message: string; severity: ActivitySeverity }> = [
    { type: 'fast_track', message: 'Fast Track case #FT-{id} progressing on schedule', severity: 'info' },
    { type: 'fast_track', message: 'Fast Track case #FT-{id} approaching deadline', severity: 'warning' },
    { type: 'fast_track', message: 'Fast Track case #FT-{id} CRITICAL - SLA breach imminent', severity: 'critical' },
    { type: 'viewing', message: 'Viewing scheduled for Property #P-{id}', severity: 'info' },
    { type: 'viewing', message: 'Viewing completed for Property #P-{id}', severity: 'info' },
    { type: 'viewing', message: 'Viewing rescheduled for Property #P-{id}', severity: 'warning' },
    { type: 'document', message: 'Documents verified for Property #P-{id}', severity: 'info' },
    { type: 'document', message: 'Document upload pending for Property #P-{id}', severity: 'warning' },
    { type: 'document', message: 'Document verification failed for Property #P-{id}', severity: 'critical' },
    { type: 'approval', message: 'Manager approval required for Property #P-{id}', severity: 'warning' },
    { type: 'approval', message: 'Approval granted for Property #P-{id}', severity: 'info' },
    { type: 'deal', message: 'Deal marked ready for Property #P-{id}', severity: 'info' },
    { type: 'deal', message: 'Deal finalized for Property #P-{id}', severity: 'info' },
    { type: 'deal', message: 'Deal delayed for Property #P-{id} - action needed', severity: 'warning' },
];

export function generateRandomActivity(): ActivityItem {
    const template = activityTemplates[Math.floor(Math.random() * activityTemplates.length)];
    const randomId = Math.floor(1000 + Math.random() * 9000);

    return {
        id: `act-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: template.type,
        message: template.message.replace('{id}', randomId.toString()),
        severity: template.severity,
        timestamp: new Date(),
    };
}

// Helper function to slightly vary metrics (simulating real-time changes)
export function varyMetrics(current: LiveMetrics): LiveMetrics {
    const variance = () => Math.floor(Math.random() * 3) - 1; // -1, 0, or 1

    return {
        activeProperties: Math.max(0, current.activeProperties + variance()),
        fastTrackActive: Math.max(0, current.fastTrackActive + variance()),
        viewingsToday: Math.max(0, current.viewingsToday + variance()),
        dealsReady: Math.max(0, current.dealsReady + variance()),
        pendingActions: Math.max(0, current.pendingActions + variance()),
    };
}
