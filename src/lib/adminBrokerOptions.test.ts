import assert from 'node:assert/strict';
import test from 'node:test';

import { deduplicateAdminBrokers } from './adminBrokerOptions';

test('deduplicates broker choices by account without collapsing distinct brokers with the same label', () => {
    const brokers = deduplicateAdminBrokers([
        { user_id: 'broker-1', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-1', company_name: 'Estospaces Launch Manager' },
        { user_id: 'broker-2', company_name: 'Estospaces Launch Manager' },
        { user_id: '  ', company_name: 'Invalid choice' },
    ]);

    assert.deepEqual(brokers.map((broker) => broker.user_id), ['broker-1', 'broker-2']);
});
