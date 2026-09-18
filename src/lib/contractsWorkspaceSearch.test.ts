import assert from 'node:assert/strict';
import test from 'node:test';

import { filterContractsWorkspace } from './contractsWorkspaceSearch';
import type { Contract } from '@/types/booking';

const contracts: Contract[] = [
    {
        id: 'c86081a0-0000-4000-8000-000000000001',
        booking_id: 'booking-001',
        application_id: 'application-001',
        property_id: 'property-chennai-001',
        manager_id: 'manager-001',
        user_id: 'user-001',
        status: 'active',
        created_at: '2026-09-18T00:00:00Z',
        updated_at: '2026-09-18T00:00:00Z',
        name: 'Asha Kumar',
        property: 'Marina Heights, Chennai',
        title: 'Chennai tenancy agreement',
    },
    {
        id: 'c86082a0-0000-4000-8000-000000000002',
        property_id: 'property-london-001',
        manager_id: 'manager-002',
        user_id: 'user-001',
        status: 'draft',
        created_at: '2026-09-18T00:00:00Z',
        updated_at: '2026-09-18T00:00:00Z',
        name: 'Jordan Smith',
        property: 'Canary Wharf',
        title: 'London agreement',
    },
];

test('filters contracts by contract identifier, tenant, and property details', () => {
    assert.deepEqual(filterContractsWorkspace(contracts, 'c86081').map((contract) => contract.id), [contracts[0].id]);
    assert.deepEqual(filterContractsWorkspace(contracts, 'asha').map((contract) => contract.id), [contracts[0].id]);
    assert.deepEqual(filterContractsWorkspace(contracts, 'marina').map((contract) => contract.id), [contracts[0].id]);
    assert.deepEqual(filterContractsWorkspace(contracts, 'not present'), []);
});

test('returns a separate array for an empty search so display sorting cannot mutate state', () => {
    const result = filterContractsWorkspace(contracts, '   ');

    assert.notEqual(result, contracts);
    result.reverse();
    assert.deepEqual(contracts.map((contract) => contract.id), [
        'c86081a0-0000-4000-8000-000000000001',
        'c86082a0-0000-4000-8000-000000000002',
    ]);
});
