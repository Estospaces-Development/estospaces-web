import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getManagerAnalytics,
    getPlatformAnalytics,
    invalidateAnalyticsCache,
} from '@/services/analyticsService';

const buildResponse = (payload: Record<string, unknown>) => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
        success: true,
        data: {
            total_users: 1,
            total_properties: 2,
            total_leads: 3,
            active_leads: 4,
            total_brokers: 5,
            sla_success_rate: 99,
            avg_response_time: 42,
            pending_verifications: 0,
            total_documents: 6,
            ...payload,
        },
    }),
}) as Response;

test('invalidateAnalyticsCache forces a fresh platform analytics request', async () => {
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        fetchCount += 1;
        return buildResponse({ total_views: fetchCount });
    }) as typeof fetch;

    try {
        invalidateAnalyticsCache('platform_analytics');

        const first = await getPlatformAnalytics();
        const second = await getPlatformAnalytics();

        assert.equal(first.error, null);
        assert.equal(second.error, null);
        assert.equal(fetchCount, 1);

        invalidateAnalyticsCache('platform_analytics');
        const refreshed = await getPlatformAnalytics();

        assert.equal(refreshed.error, null);
        assert.equal(fetchCount, 2);
    } finally {
        globalThis.fetch = originalFetch;
        invalidateAnalyticsCache('platform_analytics');
    }
});

test('invalidateAnalyticsCache forces a fresh manager analytics request', async () => {
    let fetchCount = 0;
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async () => {
        fetchCount += 1;
        return buildResponse({ conversion_rate: fetchCount });
    }) as typeof fetch;

    try {
        invalidateAnalyticsCache('manager_analytics');

        const first = await getManagerAnalytics();
        const second = await getManagerAnalytics();

        assert.equal(first.error, null);
        assert.equal(second.error, null);
        assert.equal(fetchCount, 1);

        invalidateAnalyticsCache('manager_analytics');
        const refreshed = await getManagerAnalytics();

        assert.equal(refreshed.error, null);
        assert.equal(fetchCount, 2);
    } finally {
        globalThis.fetch = originalFetch;
        invalidateAnalyticsCache('manager_analytics');
    }
});
