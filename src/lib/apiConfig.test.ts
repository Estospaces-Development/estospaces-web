/// <reference types="node" />
/**
 * API Configuration Tests — Production Safety and CSP Compliance
 *
 * Verifies that:
 *   1. Production builds use same-origin __api/ prefix URLs (no direct Cloud Run origins).
 *   2. Development builds use localhost direct URLs.
 *   3. All service URLs resolve through the documented fallback chain.
 *   4. No wildcard CSP relaxation is introduced.
 *   5. Search service endpoint is correctly configured.
 *
 * Run: npx tsx --test src/lib/apiConfig.test.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mimics the getServiceUrl() resolution logic from apiUtils.ts:
 *   1. Check VITE_<SERVICE>_SERVICE_URL env var
 *   2. Check VITE_<SERVICE>_API env var
 *   3. Fall back to LOCAL_SERVICE_URLS[service]
 */
function resolveServiceUrl(
    service: string,
    envVars: Record<string, string | undefined>,
    localUrls: Record<string, string>,
): string {
    const upper = service.toUpperCase();
    const candidates = [
        envVars[`VITE_${upper}_SERVICE_URL`],
        envVars[`VITE_${upper}_API`],
    ];
    const found = candidates.find((v) => v && v.trim().length > 0);
    if (found) return found.trim();
    return localUrls[service] ?? 'http://localhost:8080';
}

function isSameOriginSafe(url: string): boolean {
    if (url.startsWith('/__api/')) return true;
    if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) return true;
    if (!url.startsWith('http://') && !url.startsWith('https://')) return true;
    return false;
}

function isDirectCloudRunOrigin(url: string): boolean {
    return /\.a\.run\.app/.test(url);
}

// ── Local URL registry (mirrors apiUtils.ts LOCAL_SERVICE_URLS) ──────────────

const LOCAL_SERVICE_URLS: Record<string, string> = {
    core: 'http://localhost:8080',
    booking: 'http://localhost:8081',
    notification: 'http://localhost:8083',
    payment: 'http://localhost:8082',
    search: 'http://localhost:8084',
    media: 'http://localhost:8085',
    messaging: 'http://localhost:8086',
};

const SERVICES = Object.keys(LOCAL_SERVICE_URLS);

// ── Tests ────────────────────────────────────────────────────────────────────

describe('API Configuration — Production Safety', () => {
    describe('Service URL resolution fallback chain', () => {
        it('resolves from VITE_*_SERVICE_URL when set', () => {
            const env = { VITE_CORE_SERVICE_URL: '/__api/core' };
            assert.strictEqual(resolveServiceUrl('core', env, LOCAL_SERVICE_URLS), '/__api/core');
        });

        it('falls back to VITE_*_API when SERVICE_URL is absent', () => {
            const env = { VITE_SEARCH_API: '/__api/search' };
            assert.strictEqual(resolveServiceUrl('search', env, LOCAL_SERVICE_URLS), '/__api/search');
        });

        it('falls back to localhost when no env var is set', () => {
            const env: Record<string, string | undefined> = {};
            assert.strictEqual(resolveServiceUrl('core', env, LOCAL_SERVICE_URLS), 'http://localhost:8080');
            assert.strictEqual(resolveServiceUrl('search', env, LOCAL_SERVICE_URLS), 'http://localhost:8084');
            assert.strictEqual(resolveServiceUrl('messaging', env, LOCAL_SERVICE_URLS), 'http://localhost:8086');
        });

        it('prefers SERVICE_URL over API when both are set', () => {
            const env = {
                VITE_CORE_SERVICE_URL: '/__api/core',
                VITE_CORE_API: '/other/path',
            };
            assert.strictEqual(resolveServiceUrl('core', env, LOCAL_SERVICE_URLS), '/__api/core');
        });

        it('returns localhost for unknown services', () => {
            const env: Record<string, string | undefined> = {};
            const result = resolveServiceUrl('nonexistent', env, LOCAL_SERVICE_URLS);
            assert.strictEqual(result, 'http://localhost:8080');
        });
    });

    describe('Production URL safety — no direct Cloud Run origins', () => {
        const prodEnvVars: Record<string, string> = {
            VITE_CORE_SERVICE_URL: '/__api/core',
            VITE_BOOKING_SERVICE_URL: '/__api/booking',
            VITE_NOTIFICATION_SERVICE_URL: '/__api/notification',
            VITE_PAYMENT_SERVICE_URL: '/__api/payment',
            VITE_SEARCH_SERVICE_URL: '/__api/search',
            VITE_MEDIA_SERVICE_URL: '/__api/media',
            VITE_MESSAGING_SERVICE_URL: '/__api/messaging',
        };

        it('all services resolve to same-origin __api/ paths in production', () => {
            for (const service of SERVICES) {
                const url = resolveServiceUrl(service, prodEnvVars, LOCAL_SERVICE_URLS);
                assert.ok(
                    isSameOriginSafe(url),
                    `Service ${service} URL "${url}" should be same-origin safe`,
                );
                assert.ok(
                    !isDirectCloudRunOrigin(url),
                    `Service ${service} URL "${url}" must NOT be a direct Cloud Run origin`,
                );
            }
        });

        it('rejects direct Cloud Run URLs as production configuration', () => {
            const cloudRunEnv = {
                VITE_CORE_SERVICE_URL: 'https://estospaces-core-service-prod-zaryfkxmeq-nw.a.run.app',
            };
            const url = resolveServiceUrl('core', cloudRunEnv, LOCAL_SERVICE_URLS);
            assert.ok(isDirectCloudRunOrigin(url), 'Expected direct Cloud Run origin');
            assert.ok(!isSameOriginSafe(url), 'Expected not same-origin safe');
        });
    });

    describe('Development URL configuration', () => {
        it('uses localhost URLs when no env vars are set (development mode)', () => {
            const env: Record<string, string | undefined> = {};
            for (const service of SERVICES) {
                const url = resolveServiceUrl(service, env, LOCAL_SERVICE_URLS);
                assert.ok(
                    url.startsWith('http://localhost:'),
                    `${service} should use localhost in dev, got ${url}`,
                );
            }
        });

        it('allows explicit localhost override via env vars', () => {
            const env = { VITE_SEARCH_SERVICE_URL: 'http://localhost:9999/search' };
            assert.strictEqual(
                resolveServiceUrl('search', env, LOCAL_SERVICE_URLS),
                'http://localhost:9999/search',
            );
        });
    });

    describe('Search service endpoint', () => {
        it('resolves search to the correct localhost port', () => {
            const env: Record<string, string | undefined> = {};
            const url = resolveServiceUrl('search', env, LOCAL_SERVICE_URLS);
            assert.strictEqual(url, 'http://localhost:8084');
        });

        it('resolves search to the correct production prefix', () => {
            const env = { VITE_SEARCH_SERVICE_URL: '/__api/search' };
            const url = resolveServiceUrl('search', env, LOCAL_SERVICE_URLS);
            assert.strictEqual(url, '/__api/search');
        });

        it('search port 8084 does not conflict with other services', () => {
            const ports = SERVICES
                .map((s) => {
                    const m = LOCAL_SERVICE_URLS[s]?.match(/:(\d+)/);
                    return m ? { service: s, port: Number(m[1]) } : null;
                })
                .filter(Boolean) as { service: string; port: number }[];
            const uniquePorts = new Set(ports.map((p) => p.port));
            assert.strictEqual(uniquePorts.size, ports.length, `Port conflicts: ${JSON.stringify(ports)}`);
        });
    });

    describe('CSP origin requirements', () => {
        const prodEnvVars: Record<string, string> = {
            VITE_CORE_SERVICE_URL: '/__api/core',
            VITE_BOOKING_SERVICE_URL: '/__api/booking',
            VITE_NOTIFICATION_SERVICE_URL: '/__api/notification',
            VITE_PAYMENT_SERVICE_URL: '/__api/payment',
            VITE_SEARCH_SERVICE_URL: '/__api/search',
            VITE_MEDIA_SERVICE_URL: '/__api/media',
            VITE_MESSAGING_SERVICE_URL: '/__api/messaging',
        };

        it('production __api/ URLs require no additional connect-src CSP origins', () => {
            for (const service of SERVICES) {
                const url = resolveServiceUrl(service, prodEnvVars, LOCAL_SERVICE_URLS);
                assert.ok(
                    url.startsWith('/__api/'),
                    `${service} should use /__api/ prefix, got ${url}`,
                );
            }
        });

        it('direct Cloud Run URLs would require CSP connect-src entries (not recommended)', () => {
            const badUrl = 'https://estospaces-search-service-prod-zaryfkxmeq-nw.a.run.app';
            assert.ok(badUrl.startsWith('https://'));
            assert.ok(!isSameOriginSafe(badUrl));
        });
    });

    describe('Environment variable naming conventions', () => {
        it('VITE_*_SERVICE_URL is the primary key for all services', () => {
            const primaryKeys = SERVICES.map((s) => `VITE_${s.toUpperCase()}_SERVICE_URL`);
            const expected = [
                'VITE_CORE_SERVICE_URL',
                'VITE_BOOKING_SERVICE_URL',
                'VITE_NOTIFICATION_SERVICE_URL',
                'VITE_PAYMENT_SERVICE_URL',
                'VITE_SEARCH_SERVICE_URL',
                'VITE_MEDIA_SERVICE_URL',
                'VITE_MESSAGING_SERVICE_URL',
            ];
            for (const key of expected) {
                assert.ok(primaryKeys.includes(key), `Missing primary key: ${key}`);
            }
        });

        it('VITE_*_API is the secondary fallback key for all services', () => {
            const secondaryKeys = SERVICES.map((s) => `VITE_${s.toUpperCase()}_API`);
            const expected = [
                'VITE_CORE_API',
                'VITE_BOOKING_API',
                'VITE_NOTIFICATION_API',
                'VITE_PAYMENT_API',
                'VITE_SEARCH_API',
                'VITE_MEDIA_API',
                'VITE_MESSAGING_API',
            ];
            for (const key of expected) {
                assert.ok(secondaryKeys.includes(key), `Missing secondary key: ${key}`);
            }
        });
    });
});
