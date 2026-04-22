import assert from 'node:assert/strict';
import test from 'node:test';
import { findRelatedViewing } from './applicationWorkflow';

test('findRelatedViewing prefers direct application links over property/user heuristics', () => {
    const relatedViewing = findRelatedViewing(
        {
            id: 'application-1',
            property_id: 'property-1',
            user_id: 'user-1',
            move_in_date: '2026-05-01',
            status: 'viewing_scheduled',
            created_at: '2026-03-24T10:00:00Z',
            updated_at: '2026-03-24T10:00:00Z',
        },
        [
            {
                id: 'viewing-legacy',
                property_id: 'property-1',
                user_id: 'user-1',
                manager_id: 'manager-1',
                scheduled_at: '2026-03-30T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T10:00:00Z',
            },
            {
                id: 'viewing-linked',
                property_id: 'property-2',
                user_id: 'user-2',
                manager_id: 'manager-2',
                application_id: 'application-1',
                scheduled_at: '2026-03-31T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T11:00:00Z',
            },
        ],
    );

    assert.equal(relatedViewing?.id, 'viewing-linked');
});

test('findRelatedViewing falls back to property and user when legacy viewings have no application_id', () => {
    const relatedViewing = findRelatedViewing(
        {
            id: 'application-2',
            property_id: 'property-9',
            user_id: 'user-9',
            move_in_date: '2026-05-01',
            status: 'submitted',
            created_at: '2026-03-24T10:00:00Z',
            updated_at: '2026-03-24T10:00:00Z',
        },
        [
            {
                id: 'viewing-older',
                property_id: 'property-9',
                user_id: 'user-9',
                manager_id: 'manager-9',
                scheduled_at: '2026-03-28T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'confirmed',
                created_at: '2026-03-24T09:00:00Z',
            },
            {
                id: 'viewing-latest',
                property_id: 'property-9',
                user_id: 'user-9',
                manager_id: 'manager-9',
                scheduled_at: '2026-03-29T11:00:00Z',
                duration_minutes: 30,
                viewing_type: 'in_person',
                status: 'rescheduled',
                created_at: '2026-03-24T10:00:00Z',
            },
        ],
    );

    assert.equal(relatedViewing?.id, 'viewing-latest');
});
