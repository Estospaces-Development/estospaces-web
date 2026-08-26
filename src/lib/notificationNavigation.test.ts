import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationNavigationPath } from '@/lib/notificationNavigation';
import { getNotificationsPagePath } from '@/services/notificationsService';

test('Fast Track request notification fallback opens the manager approval flow', () => {
    const path = getNotificationNavigationPath({
        type: 'fast_track_requested',
        data: {
            broker_request_id: 'request-42',
            lead_id: 'lead-42',
            client_id: 'user-42',
            property_id: 'property-42',
        },
    }, 'manager');

    assert.equal(path, '/manager/dashboard?fast-track=request&broker-request=request-42&lead=lead-42');
});

test('documents requested notifications deep-link the user into the exact fast-track workspace', () => {
    const path = getNotificationNavigationPath({
        type: 'documents_requested',
        data: {
            fast_track_id: 'case-1',
            lead_id: 'lead-1',
            propertyId: 'property-1',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/fast-track?case=case-1&lead=lead-1&property=property-1');
});

test('application notifications open the linked manager applications workspace', () => {
    const path = getNotificationNavigationPath({
        type: 'application_submitted',
        data: {
            applicationId: 'application-1',
            fastTrackId: 'case-2',
            leadId: 'lead-2',
            propertyId: 'property-2',
        },
    }, 'manager');

    assert.equal(path, '/manager/applications?application=application-1&case=case-2&lead=lead-2&property=property-2');
});

test('contract notifications preserve the linked contract context', () => {
    const path = getNotificationNavigationPath({
        type: 'contract_update',
        data: {
            contractId: 'contract-1',
            applicationId: 'application-7',
            fast_track_id: 'case-7',
            propertyId: 'property-7',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/contracts?application=application-7&contract=contract-1&case=case-7&property=property-7');
});

test('document verified notifications stay in the live fast-track journey when linked ids exist', () => {
    const path = getNotificationNavigationPath({
        type: 'document_verified',
        data: {
            fast_track_id: 'case-9',
            lead_id: 'lead-9',
            property_id: 'property-9',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/fast-track?case=case-9&lead=lead-9&property=property-9');
});

test('admin message notifications preserve the conversation id in support chat', () => {
    const path = getNotificationNavigationPath({
        type: 'message_received',
        data: {
            conversation_id: 'conversation-5',
        },
    }, 'admin');

    assert.equal(path, '/admin/help?conversation=conversation-5');
});

test('admin property notification detail targets open the filtered property registry', () => {
    const path = getNotificationNavigationPath({
        type: 'system',
        data: {
            entity: 'property_status_update',
            property_id: 'b0e2f0aa-6097-45c4-860a-ab56dcad5ab6',
            property_title: 'Mobile Live Approval mobile-live-1781167247728317',
            target_path: '/admin/properties/b0e2f0aa-6097-45c4-860a-ab56dcad5ab6',
        },
    }, 'admin');

    assert.equal(path, '/admin/properties?search=Mobile+Live+Approval+mobile-live-1781167247728317');
});

test('payment notifications route users to contracts while payments are Phase 2', () => {
    const path = getNotificationNavigationPath({
        type: 'payment_reminder',
        data: {
            paymentId: 'payment-1',
            invoiceId: 'invoice-1',
            applicationId: 'application-1',
            contractId: 'contract-1',
            fast_track_id: 'case-1',
            lead_id: 'lead-1',
            property_id: 'property-1',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/contracts?application=application-1&contract=contract-1&case=case-1&lead=lead-1&property=property-1');
});

test('payment notifications route managers to contracts while billing is Phase 2', () => {
    const path = getNotificationNavigationPath({
        type: 'payment_received',
        data: {
            paymentId: 'payment-9',
            invoiceId: 'invoice-9',
            applicationId: 'application-9',
            contractId: 'contract-9',
            fast_track_id: 'case-9',
            lead_id: 'lead-9',
            property_id: 'property-9',
        },
    }, 'manager');

    assert.equal(path, '/manager/contracts?application=application-9&contract=contract-9&case=case-9&lead=lead-9&property=property-9');
});

test('payment target paths are redirected to contracts while payments are Phase 2', () => {
    const path = getNotificationNavigationPath({
        type: 'payment_failed',
        data: {
            target_path: '/user/dashboard/payments?payment=payment-2',
            contract_id: 'contract-2',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/contracts?contract=contract-2');
});

test('sale journey notifications deep-link the user into the exact fast-track workspace', () => {
    const path = getNotificationNavigationPath({
        type: 'sale_journey_updated',
        data: {
            fast_track_id: 'case-sale-1',
            lead_id: 'lead-sale-1',
            property_id: 'property-sale-1',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/fast-track?case=case-sale-1&lead=lead-sale-1&property=property-sale-1');
});

test('user verification submitted notifications open the manager verification queue for managers', () => {
    const path = getNotificationNavigationPath({
        type: 'user_verification_submitted',
        data: {},
    }, 'manager');

    assert.equal(path, '/manager/user-verifications');
});

test('user verification submitted notifications deep-link admins into the user queue entry', () => {
    const path = getNotificationNavigationPath({
        type: 'user_verification_submitted',
        data: {
            subject_user_id: 'user-42',
        },
    }, 'admin');

    assert.equal(path, '/admin/verifications?entity=user&userId=user-42');
});

test('manager verification submitted notifications deep-link admins into the manager queue entry', () => {
    const path = getNotificationNavigationPath({
        type: 'manager_verification_submitted',
        data: {
            subject_user_id: 'manager-42',
        },
    }, 'admin');

    assert.equal(path, '/admin/verifications?entity=manager&managerId=manager-42');
});

test('saved-property notifications without a property id fall back to the real saved route', () => {
    const path = getNotificationNavigationPath({
        type: 'property_saved',
        data: {},
    }, 'user');

    assert.equal(path, '/user/saved');
});

test('generic user notifications do not jump to help without support context', () => {
    const path = getNotificationNavigationPath({
        type: 'system',
        data: {
            target_path: '/user/dashboard/help',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/notifications');
});

test('support notifications still deep-link to help when ticket context exists', () => {
    const path = getNotificationNavigationPath({
        type: 'ticket_response',
        data: {
            target_path: '/user/dashboard/help',
            ticket_id: 'ticket-123',
            conversation_id: 'conversation-123',
        },
    }, 'user');

    assert.equal(path, '/user/dashboard/help?ticket=ticket-123&conversation=conversation-123');
});

test('broker role uses manager fast-track notification routes in the manager shell', () => {
    const path = getNotificationNavigationPath({
        type: 'fast_track_started',
        data: {
            case_id: 'case-manager-1',
            lead_id: 'lead-manager-1',
            property_id: 'property-manager-1',
        },
    }, 'broker');

    assert.equal(path, '/manager/fast-track?case=case-manager-1&lead=lead-manager-1&property=property-manager-1');
});

test('broker role uses manager messaging and support notification routes', () => {
    const messagePath = getNotificationNavigationPath({
        type: 'message_received',
        data: {
            conversation_id: 'conversation-manager-1',
        },
    }, 'broker');

    assert.equal(messagePath, '/manager/messages?conversation=conversation-manager-1');

    const supportPath = getNotificationNavigationPath({
        type: 'ticket_response',
        data: {
            ticket_id: 'ticket-manager-1',
            conversation_id: 'conversation-manager-2',
        },
    }, 'broker');

    assert.equal(supportPath, '/manager/help?ticket=ticket-manager-1&conversation=conversation-manager-2');
});

test('broker role opens the manager notifications page from the dropdown', () => {
    assert.equal(getNotificationsPagePath('broker'), '/manager/notifications');
});
