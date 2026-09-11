import assert from 'node:assert/strict';
import test from 'node:test';
import { apiFetch } from './apiUtils';

for (const status of [200, 503]) {
    test(`POST times out when HTTP ${status} headers arrive but the body stalls`, { timeout: 1000 }, async (t) => {
        let calls = 0;
        t.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
            calls += 1;
            return new Response(new ReadableStream({
                start(controller) {
                    options.signal?.addEventListener('abort', () => {
                        controller.error(new DOMException('Aborted', 'AbortError'));
                    }, { once: true });
                },
            }), { status });
        });

        await assert.rejects(apiFetch('https://example.test/action', {
            method: 'POST', auth: false, suppressErrorToast: true, timeoutMs: 20,
        }), /timed out/);
        assert.equal(calls, 1, 'A mutation must not be automatically retried');
    });
}
