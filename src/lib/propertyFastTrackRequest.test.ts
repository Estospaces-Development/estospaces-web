import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildPropertyFastTrackStartRequest,
    requestDirectPropertyFastTrack,
} from './propertyFastTrackRequest';
import type { Lead } from '@/services/leadsService';

const buildLead = (id: string, brokerID: string): Lead => ({
    id,
    broker_id: brokerID,
    status: 'pending_broker_response',
    created_at: '2026-08-28T09:59:00.000Z',
    updated_at: '2026-08-28T09:59:00.000Z',
});

test('builds a direct Fast Track request from the selected property and assigned lead', () => {
    const request = buildPropertyFastTrackStartRequest({
        property: {
            id: 'property-1',
            title: 'Anna Nagar Home',
            listing_type: 'sale',
            country: 'India',
        },
        lead: {
            id: 'lead-1',
            broker_id: 'manager-1',
        },
        brokerRequestQuery: '',
        clientId: 'user-1',
        clientName: 'Test User',
    });

    assert.deepEqual(request, {
        property_id: 'property-1',
        broker_request_id: undefined,
        lead_id: 'lead-1',
        manager_id: 'manager-1',
        client_id: 'user-1',
        client_name: 'Test User',
        property_title: 'Anna Nagar Home',
        property_type: 'buy',
        property_country: 'India',
        listing_type: 'sale',
        started_from: 'direct_property',
    });
});

test('creates the lead and waits for confirmed manager notification delivery', async () => {
    const calls: Array<{ name: string; payload: unknown }> = [];

    const result = await requestDirectPropertyFastTrack({
        property: {
            id: 'property-2',
            title: 'Chennai Rental',
            listing_type: 'rent',
            country: 'India',
        },
        clientId: 'user-2',
        clientName: 'Request User',
        dependencies: {
            createLead: async (propertyID) => {
                calls.push({ name: 'createLead', payload: propertyID });
                return {
                    data: buildLead('lead-2', 'manager-2'),
                    error: null,
                };
            },
            requestFastTrack: async (request) => {
                calls.push({ name: 'requestFastTrack', payload: request });
                return {
                    requested: true,
                    requestedAt: '2026-08-28T10:00:00.000Z',
                    error: null,
                };
            },
        },
    });

    assert.deepEqual(result, {
        leadId: 'lead-2',
        requestedAt: '2026-08-28T10:00:00.000Z',
    });
    assert.equal(calls[0]?.name, 'createLead');
    assert.equal(calls[1]?.name, 'requestFastTrack');
    assert.deepEqual(calls[1]?.payload, {
        property_id: 'property-2',
        broker_request_id: undefined,
        lead_id: 'lead-2',
        client_name: 'Request User',
        property_title: 'Chennai Rental',
        property_type: 'rent',
        property_country: 'India',
        listing_type: 'rent',
    });
});

test('does not report success when the manager notification cannot be delivered', async () => {
    await assert.rejects(
        requestDirectPropertyFastTrack({
            property: {
                id: 'property-3',
                title: 'Notification Failure Home',
                listing_type: 'sale',
            },
            clientId: 'user-3',
            clientName: 'Request User',
            dependencies: {
                createLead: async () => ({
                    data: buildLead('lead-3', 'manager-3'),
                    error: null,
                }),
                requestFastTrack: async () => ({
                    requested: false,
                    requestedAt: null,
                    error: 'The Fast Track request could not be delivered. Please try again',
                }),
            },
        }),
        /could not be delivered/i,
    );
});

test('rejects unsupported listing types before creating a lead', async () => {
    let createLeadCalls = 0;

    await assert.rejects(
        requestDirectPropertyFastTrack({
            property: {
                id: 'property-4',
                title: 'Short Stay',
                listing_type: 'short_term',
            },
            clientId: 'user-4',
            clientName: 'Request User',
            dependencies: {
                createLead: async () => {
                    createLeadCalls += 1;
                    return { data: null, error: null };
                },
                requestFastTrack: async () => ({
                    requested: false,
                    requestedAt: null,
                    error: null,
                }),
            },
        }),
        /not available for short-term/i,
    );
    assert.equal(createLeadCalls, 0);
});
