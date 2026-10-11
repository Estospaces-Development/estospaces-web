import test from 'node:test';
import assert from 'node:assert/strict';

import { reviewUserDocument } from './userVerificationService';
import { requestDocumentReupload } from './managerVerificationService';

const ALREADY_REQUESTED = 'A re-upload has already been requested for this document.';

const withFetch = async (status: number, body: unknown, run: () => Promise<void>) => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
    try {
        await run();
    } finally {
        globalThis.fetch = realFetch;
    }
};

const reviewCalls = [
    ['reviewUserDocument (manager scope)', () => reviewUserDocument('manager', 'doc-1', 'reupload_required', 'Photo is blurry, upload a sharper copy.')],
    ['reviewUserDocument (admin scope)', () => reviewUserDocument('admin', 'doc-1', 'reupload_required', 'Photo is blurry, upload a sharper copy.')],
    ['requestDocumentReupload', () => requestDocumentReupload('manager-1', 'admin-1', 'doc-1', 'Photo is blurry, upload a sharper copy.')],
] as const;

for (const [name, call] of reviewCalls) {
    test(`${name}: a 409 keeps the server message and is flagged as a conflict (#698)`, async () => {
        await withFetch(409, { success: false, error: ALREADY_REQUESTED }, async () => {
            const result = await call();
            assert.equal(result.error, ALREADY_REQUESTED);
            assert.equal((result as { conflict?: boolean }).conflict, true);
        });
    });

    test(`${name}: other failures and success are not conflicts`, async () => {
        await withFetch(400, { success: false, error: 'Invalid request' }, async () => {
            const result = await call();
            assert.equal(result.error, 'Invalid request');
            assert.notEqual((result as { conflict?: boolean }).conflict, true);
        });
        await withFetch(200, { success: true, data: { message: 'Document reviewed' } }, async () => {
            const result = await call();
            assert.equal(result.error, null);
            assert.notEqual((result as { conflict?: boolean }).conflict, true);
        });
    });
}
