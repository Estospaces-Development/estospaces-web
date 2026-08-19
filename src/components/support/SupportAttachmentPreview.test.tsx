import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import { SupportAttachmentPreview, isSupportImageAttachment } from '@/components/support/SupportAttachmentPreview';

test('support image detection is MIME-based and case-insensitive', () => {
    const base = { file_name: 'attachment', file_url: '/uploads/private/attachment' };
    assert.equal(isSupportImageAttachment({ ...base, mime_type: 'image/jpeg' }), true);
    assert.equal(isSupportImageAttachment({ ...base, mime_type: ' IMAGE/PNG ' }), true);
    assert.equal(isSupportImageAttachment({ ...base, file_name: 'legacy-screenshot.webp' }), true);
    assert.equal(isSupportImageAttachment({ ...base, file_name: 'contract.pdf', mime_type: 'application/pdf' }), false);
});

test('support image attachment resolves and renders its authorized preview URL', async () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/admin/help' });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLImageElement', 'Element', 'Node', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const originalFetch = globalThis.fetch;
    const requestedUrls: string[] = [];

    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        HTMLImageElement: browserWindow.HTMLImageElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });
    globalThis.fetch = (async (input) => {
        requestedUrls.push(String(input));
        return new Response(JSON.stringify({
            success: true,
            data: {
                access_url: 'https://media.estospaces.test/access/screenshot-1',
                expires_at: '2026-08-19T12:00:00Z',
            },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }) as typeof fetch;

    const browserHost = browserWindow.document.createElement('div');
    browserWindow.document.body.append(browserHost);
    const host = browserHost as unknown as HTMLDivElement;
    const root = createRoot(host);

    try {
        await act(async () => {
            root.render(
                <SupportAttachmentPreview
                    attachment={{
                        id: 'attachment-1',
                        file_url: '/uploads/private/screenshot-1.png',
                        file_name: 'Screenshot.png',
                        mime_type: 'image/png',
                    }}
                    onOpenAttachment={() => undefined}
                />,
            );
            await new Promise((resolve) => setTimeout(resolve, 0));
        });

        assert.equal(requestedUrls.length, 1);
        assert.match(requestedUrls[0], /\/api\/v1\/support\/attachments\/attachment-1\/access-url/);
        const image = browserWindow.document.querySelector('img');
        assert.ok(image);
        assert.equal(image.getAttribute('src'), 'https://media.estospaces.test/access/screenshot-1');
        assert.equal(image.getAttribute('alt'), 'Screenshot.png');
        assert.equal(image.getAttribute('referrerpolicy'), 'no-referrer');
    } finally {
        act(() => root.unmount());
        globalThis.fetch = originalFetch;
        for (const key of keys) {
            const descriptor = descriptors.get(key);
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else Reflect.deleteProperty(globalThis, key);
        }
        browserWindow.close();
    }
});
