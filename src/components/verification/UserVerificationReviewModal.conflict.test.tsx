import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import { AuthProvider } from '@/contexts/AuthContext';
import ToastActionsContext from '@/contexts/ToastContext';
import { UserProfileSummaryProvider } from '@/contexts/UserProfileSummaryContext';
import UserVerificationReviewModal from './UserVerificationReviewModal';

const ALREADY_REQUESTED = 'A re-upload has already been requested for this document.';

const verificationDetails = (documentStatus: string) => ({
    user: {
        user_id: 'user-1',
        email: 'seeker@example.com',
        full_name: 'Seeker One',
        verification_level: 'basic',
        has_identity_doc: true,
        has_address_doc: false,
        has_financial_doc: false,
        documents_uploaded: true,
        documents_verified: false,
        lead_count: 0,
        pending_leads: 0,
        created_at: '2026-10-01T00:00:00Z',
        last_active: '2026-10-01T00:00:00Z',
    },
    documents: [{
        id: 'doc-1',
        user_id: 'user-1',
        document_type: 'passport',
        document_category: 'identity',
        file_name: 'passport.pdf',
        file_url: 'https://files.example.com/passport.pdf',
        status: documentStatus,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
    }],
    recent_leads: [],
});

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
});

const pathOf = (input: unknown) => String(input).replace(/^https?:\/\/[^/]+/, '').split('?')[0];

/** Core stub: details read, review write, and the avatar's profile-summary lookup, which is not under test. */
const coreStub = (
    requests: string[],
    readDocumentStatus: () => string,
    review: () => Response,
) => (async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const path = pathOf(input);
    if (path.endsWith('/users/summaries')) return json(200, { success: true, data: [] });
    requests.push(`${method} ${path}`);
    return method === 'PUT'
        ? review()
        : json(200, { success: true, data: verificationDetails(readDocumentStatus()) });
}) as typeof fetch;

function installDOM(fetchHandler: typeof fetch) {
    const browserWindow = new Window({ url: 'https://estospaces.test/admin/verifications' });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'localStorage', 'sessionStorage', 'fetch', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        Event: browserWindow.Event,
        localStorage: browserWindow.localStorage,
        sessionStorage: browserWindow.sessionStorage,
        fetch: fetchHandler,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });
    const browserHost = browserWindow.document.createElement('div');
    browserWindow.document.body.append(browserHost);
    const root = createRoot(browserHost as unknown as HTMLDivElement);
    return {
        browserWindow,
        root,
        restore: () => {
            act(() => root.unmount());
            keys.forEach((key) => {
                const descriptor = descriptors.get(key);
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            });
            browserWindow.close();
        },
    };
}

const toastSpy = () => {
    const calls: Array<{ type: string; message: string }> = [];
    const record = (type: string) => (message: string) => {
        calls.push({ type, message });
        return type;
    };
    return {
        calls,
        actions: {
            showToast: record('show'),
            success: record('success'),
            error: record('error'),
            warning: record('warning'),
            info: record('info'),
            clearAll: () => undefined,
        },
    };
};

test('a 409 on a document review reloads the documents and shows the server message (#698)', async () => {
    let storedStatus = 'pending';
    const requests: string[] = [];
    const dom = installDOM(coreStub(requests, () => storedStatus, () => {
        // Another reviewer asked for the re-upload first.
        storedStatus = 'reupload_required';
        return json(409, { success: false, error: ALREADY_REQUESTED });
    }));
    const toast = toastSpy();

    try {
        await act(async () => {
            dom.root.render(
                <AuthProvider>
                    <UserProfileSummaryProvider>
                        <ToastActionsContext.Provider value={toast.actions}>
                            <UserVerificationReviewModal scope="manager" userId="user-1" onClose={() => undefined} />
                        </ToastActionsContext.Provider>
                    </UserProfileSummaryProvider>
                </AuthProvider>,
            );
        });

        const body = dom.browserWindow.document.body;
        assert.match(body.textContent ?? '', /passport\.pdf/);
        assert.doesNotMatch(body.textContent ?? '', /Waiting for the user to upload a replacement/);

        const approve = body.querySelector('button[aria-label="Approve passport.pdf"]') as unknown as HTMLButtonElement;
        assert.ok(approve, 'a pending document offers Approve');
        await act(async () => { approve.click(); });

        assert.deepEqual(requests, [
            'GET /api/v1/manager/users/user-1/verification',
            'PUT /api/v1/manager/documents/doc-1/review',
            'GET /api/v1/manager/users/user-1/verification',
        ]);
        // The card now shows the real status instead of the stale one, and the modal stays open.
        assert.match(body.textContent ?? '', /Re-upload Required/);
        assert.match(body.textContent ?? '', /Waiting for the user to upload a replacement/);
        assert.ok(body.querySelector('[role="dialog"]'));
        assert.deepEqual(toast.calls, [{ type: 'error', message: ALREADY_REQUESTED }]);
    } finally {
        dom.restore();
    }
});

test('a non-conflict review failure does not trigger a reload', async () => {
    const requests: string[] = [];
    const dom = installDOM(coreStub(requests, () => 'pending', () => json(400, { success: false, error: 'Invalid request' })));
    const toast = toastSpy();

    try {
        await act(async () => {
            dom.root.render(
                <AuthProvider>
                    <UserProfileSummaryProvider>
                        <ToastActionsContext.Provider value={toast.actions}>
                            <UserVerificationReviewModal scope="manager" userId="user-1" onClose={() => undefined} />
                        </ToastActionsContext.Provider>
                    </UserProfileSummaryProvider>
                </AuthProvider>,
            );
        });
        const approve = dom.browserWindow.document.body.querySelector('button[aria-label="Approve passport.pdf"]') as unknown as HTMLButtonElement;
        await act(async () => { approve.click(); });

        assert.deepEqual(requests, [
            'GET /api/v1/manager/users/user-1/verification',
            'PUT /api/v1/manager/documents/doc-1/review',
        ]);
        assert.deepEqual(toast.calls, []);
    } finally {
        dom.restore();
    }
});
