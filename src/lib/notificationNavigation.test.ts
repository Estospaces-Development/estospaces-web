import test from 'node:test';
import assert from 'node:assert/strict';
import { getNotificationNavigationPath } from '@/lib/notificationNavigation';

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

    assert.equal(path, '/admin/chat?conversation=conversation-5');
});

test('payment notifications deep-link the user into the exact payments workspace', () => {
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

    assert.equal(path, '/user/dashboard/payments?application=application-1&contract=contract-1&payment=payment-1&invoice=invoice-1&case=case-1&lead=lead-1&property=property-1');
});

test('payment notifications deep-link the manager into the billing workspace', () => {
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

    assert.equal(path, '/manager/billing?application=application-9&contract=contract-9&payment=payment-9&invoice=invoice-9&case=case-9&lead=lead-9&property=property-9');
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

test('saved-property notifications without a property id fall back to the real saved route', () => {
    const path = getNotificationNavigationPath({
        type: 'property_saved',
        data: {},
    }, 'user');

    assert.equal(path, '/user/saved');
});
