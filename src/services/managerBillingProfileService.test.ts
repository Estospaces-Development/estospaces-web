import assert from 'node:assert/strict';
import test from 'node:test';

import {
    getAdminManagerBillingProfile,
    getMyManagerBillingProfile,
    verifyAdminManagerBillingProfile,
} from './managerBillingProfileService';

test('manager billing read uses the manager-owned Core route', async () => {
    const previousFetch = globalThis.fetch;
    const calls: string[] = [];
    globalThis.fetch = async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ success: true, data: { market: 'IN', verification_status: 'verified' } }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    };
    try {
        const profile = await getMyManagerBillingProfile();
        assert.equal(profile.market, 'IN');
        assert.match(calls[0], /\/api\/v1\/manager\/billing-profile$/);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test('admin verification records an explicit country, review source and profile version', async () => {
    const previousFetch = globalThis.fetch;
    const calls: Array<{ url: string; method: string; body: string | undefined }> = [];
    globalThis.fetch = async (input, init) => {
        calls.push({ url: String(input), method: init?.method ?? 'GET', body: init?.body?.toString() });
        return new Response(JSON.stringify({ success: true, data: { manager_id: 'manager-1', market: 'IN', verification_status: 'verified', profile_version: 3 } }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
        });
    };
    try {
        await getAdminManagerBillingProfile('manager-1');
        await verifyAdminManagerBillingProfile('manager-1', 'IN', 2);
        assert.match(calls[0].url, /\/api\/v1\/admin\/billing-profiles\/manager-1$/);
        assert.equal(calls[0].method, 'GET');
        assert.equal(calls[1].method, 'PUT');
        assert.deepEqual(JSON.parse(calls[1].body ?? '{}'), {
            market: 'IN', verification_status: 'verified', verification_source: 'admin_document_review', expected_profile_version: 2,
        });
    } finally {
        globalThis.fetch = previousFetch;
    }
});
