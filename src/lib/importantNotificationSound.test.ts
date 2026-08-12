import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    IMPORTANT_NOTIFICATION_SOUND_URL,
    IMPORTANT_NOTIFICATION_SOUND_VOLUME,
    buildNotificationAlertBatch,
    createImportantNotificationSoundController,
    hasImportantNotification,
    isImportantNotification,
} from './importantNotificationSound';

const notification = (type: string, priority?: string) => ({
    type,
    data: priority ? { priority } : null,
});

test('the requested Pixabay track is the default important-notification sound', () => {
    assert.equal(IMPORTANT_NOTIFICATION_SOUND_URL, '/audio/new-notification-024.mp3');
    assert.equal(IMPORTANT_NOTIFICATION_SOUND_VOLUME, 1);

    const asset = readFileSync(new URL('../../public/audio/new-notification-024.mp3', import.meta.url));
    assert.equal(asset.byteLength, 80640);
    assert.equal(
        createHash('sha256').update(asset).digest('hex'),
        'a0ba8fde6501b833d8615d5a3bdd611dd8a8d9ea95efd3f0b47adf62e162f760',
    );
});

test('important notification coverage includes user, manager, and admin journeys', () => {
    const roleScenarios = {
        user: [
            'appointment_approved',
            'application_update',
            'broker_request_matched',
            'portfolio_shared',
            'broker_request_rematch',
            'case_file_document_requested',
            'payment_failed',
            'contract_update',
            'fast_track_updated',
        ],
        manager: [
            'property_selected',
            'case_file_document_uploaded',
            'viewing_booked',
            'application_submitted',
            'fast_track_started',
        ],
        admin: [
            'user_verification_submitted',
            'manager_verification_submitted',
            'support_ticket_created',
            'support_ticket_assigned',
            'system',
        ],
    };

    Object.values(roleScenarios).flat().forEach((type) => {
        assert.equal(isImportantNotification(notification(type)), true, type);
    });
});

test('explicit high, urgent, and critical priorities are important even for new types', () => {
    assert.equal(isImportantNotification(notification('future_notification', 'high')), true);
    assert.equal(isImportantNotification(notification('future_notification', 'URGENT')), true);
    assert.equal(isImportantNotification(notification('future_notification', 'critical')), true);
    assert.equal(isImportantNotification(notification('future_notification', 'medium')), false);
});

test('routine notifications remain silent', () => {
    assert.equal(isImportantNotification(notification('welcome')), false);
    assert.equal(isImportantNotification(notification('property_saved')), false);
    assert.equal(isImportantNotification(notification('new_property_match')), false);
});

test('a polling batch with several important notifications requests one alert', () => {
    assert.equal(hasImportantNotification([
        notification('property_selected'),
        notification('case_file_document_uploaded'),
        notification('fast_track_updated'),
    ]), true);
    assert.equal(hasImportantNotification([
        notification('welcome'),
        notification('property_saved'),
    ]), false);
});

test('an important fourth notification still alerts when only three toasts are shown', () => {
    const notifications = [
        { id: 'routine-1', type: 'welcome' },
        { id: 'routine-2', type: 'property_saved' },
        { id: 'routine-3', type: 'new_property_match' },
        { id: 'important-4', type: 'fast_track_started' },
    ].map((item) => ({
        ...item,
        user_id: 'user-1',
        title: item.id,
        message: item.id,
        data: null,
        is_read: false,
        channel: 'in_app',
        created_at: '2026-08-13T00:00:00Z',
    }));

    const batch = buildNotificationAlertBatch(notifications, new Set());

    assert.equal(batch.visibleNotifications.length, 3);
    assert.equal(batch.visibleNotifications.some(isImportantNotification), false);
    assert.equal(hasImportantNotification(batch.freshNotifications), true);
});

test('playback uses one loud reusable audio element and restarts the tone', async () => {
    let created = 0;
    let played = 0;
    const fakeAudio = {
        currentTime: 1.7,
        muted: false,
        pause: () => undefined,
        play: async () => {
            played += 1;
        },
        preload: '',
        volume: 0,
    };
    const controller = createImportantNotificationSoundController(() => {
        created += 1;
        return fakeAudio;
    });

    controller.play();
    controller.play();
    await Promise.resolve();

    assert.equal(created, 1);
    assert.equal(played, 2);
    assert.equal(fakeAudio.currentTime, 0);
    assert.equal(fakeAudio.volume, 1);
    assert.equal(fakeAudio.preload, 'auto');
});

test('blocked autoplay and synchronous media errors never escape', async () => {
    const blockedController = createImportantNotificationSoundController(() => ({
        currentTime: 0,
        muted: false,
        pause: () => undefined,
        play: () => Promise.reject(new Error('NotAllowedError')),
        preload: '',
        volume: 0,
    }));
    assert.doesNotThrow(() => blockedController.prime());
    assert.doesNotThrow(() => blockedController.play());

    const throwingController = createImportantNotificationSoundController(() => ({
        currentTime: 0,
        muted: false,
        pause: () => undefined,
        play: () => {
            throw new Error('media unavailable');
        },
        preload: '',
        volume: 0,
    }));
    assert.doesNotThrow(() => throwingController.prime());
    assert.doesNotThrow(() => throwingController.play());
    await Promise.resolve();
});
