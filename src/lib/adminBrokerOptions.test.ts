import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAdminBrokerDisplayLabels, deduplicateAdminBrokers } from './adminBrokerOptions';

test('deduplicates broker choices by account without collapsing distinct brokers with the same label', () => {
    const brokers = deduplicateAdminBrokers([
        { user_id: 'broker-1', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-1', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-2', company_name: 'Estospaces Launch Manager' },
        { user_id: '  ', company_name: 'Invalid choice' },
    ]);

    assert.deepEqual(brokers.map((broker) => broker.user_id), ['broker-1', 'broker-2']);
});

test('disambiguates distinct broker accounts that share a visible company name', () => {
    const labels = buildAdminBrokerDisplayLabels([
        { user_id: 'broker-000001', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-000002', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-000003', company_name: 'North Branch', branch_name: 'North Branch' },
    ]);

    assert.deepEqual([...labels.entries()], [
        ['broker-000001', 'Estospaces Launch Manager · Account ending 000001'],
        ['broker-000002', 'Estospaces Launch Manager · Account ending 000002'],
        ['broker-000003', 'North Branch'],
    ]);
});
