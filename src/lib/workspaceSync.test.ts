import test from 'node:test';
import assert from 'node:assert/strict';
import { NOTIFICATION_TYPES } from '@/services/notificationsService';
import {
    WORKSPACE_SYNC_TAGS,
    WorkspaceSyncBus,
    createWorkspaceRefreshController,
    matchWorkspaceSyncTags,
    normalizeNotificationToWorkspaceSyncEvent,
    resolveWorkspaceSyncTagsFromPath,
} from '@/lib/workspaceSync';

const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test('normalizeNotificationToWorkspaceSyncEvent maps property workflow notifications to property and dashboard tags', () => {
    const event = normalizeNotificationToWorkspaceSyncEvent({
        id: 'notif-property-1',
        type: NOTIFICATION_TYPES.SYSTEM,
        data: {
            entity: 'property_status_update',
            propertyId: 'property-123',
            target_path: '/manager/dashboard/properties/property-123',
        },
    }, 'manager');

    assert.ok(event);
    assert.equal(event.notificationId, 'notif-property-1');
    assert.equal(event.ids?.propertyId, 'property-123');
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.PROPERTIES));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.MANAGER_PROPERTIES));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.MANAGER_ANALYTICS));
});

test('normalizeNotificationToWorkspaceSyncEvent routes inactive billing notifications through contracts only', () => {
    const paymentEvent = normalizeNotificationToWorkspaceSyncEvent({
        id: 'notif-payment-1',
        type: NOTIFICATION_TYPES.PAYMENT_RECEIVED,
        data: {
            invoiceId: 'invoice-9',
            target_path: '/user/dashboard/payments?invoice=invoice-9',
        },
    }, 'user');

    assert.ok(paymentEvent);
    assert.equal(paymentEvent.ids?.invoiceId, 'invoice-9');
    assert.ok(paymentEvent.tags.includes(WORKSPACE_SYNC_TAGS.CONTRACTS));
    assert.equal(paymentEvent.tags.includes(WORKSPACE_SYNC_TAGS.PAYMENTS), false);
    assert.equal(paymentEvent.tags.includes(WORKSPACE_SYNC_TAGS.BILLING), false);

    const paymentPathTags = resolveWorkspaceSyncTagsFromPath('/user/dashboard/payments?invoice=invoice-9');
    assert.equal(paymentPathTags.includes(WORKSPACE_SYNC_TAGS.PAYMENTS), false);
    assert.equal(paymentPathTags.includes(WORKSPACE_SYNC_TAGS.BILLING), false);
});

test('broker fast-track notifications trigger manager dashboard refresh tags', () => {
    const event = normalizeNotificationToWorkspaceSyncEvent({
        id: 'notif-broker-fast-track-1',
        type: NOTIFICATION_TYPES.FAST_TRACK_STARTED,
        data: {
            entity: 'broker_request',
            case_id: 'case-1',
            lead_id: 'lead-1',
            property_id: 'property-1',
        },
    }, 'broker');

    assert.ok(event);
    assert.equal(event.targetPath, '/manager/fast-track?case=case-1&lead=lead-1&property=property-1');
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.DASHBOARD_SUMMARY));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.BROKER_REQUESTS));
    assert.ok(event.tags.includes(WORKSPACE_SYNC_TAGS.FAST_TRACK));
});

test('normalizeNotificationToWorkspaceSyncEvent infers support refresh tags from payloads and paths', () => {
    const supportEvent = normalizeNotificationToWorkspaceSyncEvent({
        id: 'notif-support-1',
        type: NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED,
        data: {
            target_path: '/user/help?ticket=ticket-42',
        },
    }, 'user');

    assert.ok(supportEvent);
    assert.ok(supportEvent.tags.includes(WORKSPACE_SYNC_TAGS.MESSAGES));
    assert.ok(supportEvent.tags.includes(WORKSPACE_SYNC_TAGS.SUPPORT));
});

test('resolveWorkspaceSyncTagsFromPath covers analytics and property detail routes', () => {
    const adminAnalyticsTags = resolveWorkspaceSyncTagsFromPath('/admin/analytics');
    assert.ok(adminAnalyticsTags.includes(WORKSPACE_SYNC_TAGS.ADMIN_ANALYTICS));
    assert.ok(adminAnalyticsTags.includes(WORKSPACE_SYNC_TAGS.ADMIN_DASHBOARD));

    const propertyDetailTags = resolveWorkspaceSyncTagsFromPath('/user/properties/property-123?fast-track=1');
    assert.ok(propertyDetailTags.includes(WORKSPACE_SYNC_TAGS.USER_PROPERTIES));
    assert.ok(propertyDetailTags.includes(WORKSPACE_SYNC_TAGS.FAST_TRACK));
});

test('matchWorkspaceSyncTags only matches overlapping tag sets', () => {
    assert.equal(
        matchWorkspaceSyncTags(
            [WORKSPACE_SYNC_TAGS.FAST_TRACK, WORKSPACE_SYNC_TAGS.CASE_FILE],
            [WORKSPACE_SYNC_TAGS.PAYMENTS, WORKSPACE_SYNC_TAGS.FAST_TRACK],
        ),
        true,
    );

    assert.equal(
        matchWorkspaceSyncTags(
            [WORKSPACE_SYNC_TAGS.VERIFICATIONS],
            [WORKSPACE_SYNC_TAGS.MESSAGES],
        ),
        false,
    );
});

test('WorkspaceSyncBus dedupes repeated events with the same key', () => {
    const bus = new WorkspaceSyncBus();
    const received: string[] = [];

    const unsubscribe = bus.subscribe((event) => {
        received.push(event.key);
    });

    const first = bus.publish({
        key: 'same-key',
        source: 'notification',
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
    });
    const duplicate = bus.publish({
        key: 'same-key',
        source: 'notification',
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
    });

    unsubscribe();

    assert.ok(first);
    assert.equal(duplicate, null);
    assert.deepEqual(received, ['same-key']);
});

test('createWorkspaceRefreshController debounces bursts and ignores unrelated tags', async () => {
    let refreshCount = 0;
    const controller = createWorkspaceRefreshController({
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
        refresh: () => {
            refreshCount += 1;
        },
        debounceMs: 20,
    });

    assert.equal(controller.handleEvent({
        key: 'event-1',
        source: 'notification',
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
        timestamp: Date.now(),
    }), true);
    assert.equal(controller.handleEvent({
        key: 'event-2',
        source: 'notification',
        tags: [WORKSPACE_SYNC_TAGS.FAST_TRACK],
        timestamp: Date.now(),
    }), true);

    await waitFor(50);
    assert.equal(refreshCount, 1);

    assert.equal(controller.handleEvent({
        key: 'event-3',
        source: 'notification',
        tags: [WORKSPACE_SYNC_TAGS.MESSAGES],
        timestamp: Date.now(),
    }), false);

    await waitFor(30);
    assert.equal(refreshCount, 1);

    controller.dispose();
});
