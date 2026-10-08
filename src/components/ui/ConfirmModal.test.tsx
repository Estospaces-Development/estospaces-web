import assert from 'node:assert/strict';
import test from 'node:test';
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import ForceDeletePropertyModal from '@/components/admin/ForceDeletePropertyModal';
import ConfirmModal from './ConfirmModal';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/admin/properties', width: 1024, height: 768 });
    const keys = ['window', 'document', 'navigator', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'KeyboardEvent', 'IS_REACT_ACT_ENVIRONMENT'] as const;
    const descriptors = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    const globals: Record<(typeof keys)[number], unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        HTMLButtonElement: browserWindow.HTMLButtonElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        KeyboardEvent: browserWindow.KeyboardEvent,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(globals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });
    const host = browserWindow.document.createElement('div');
    browserWindow.document.body.append(host);
    const root = createRoot(host as unknown as HTMLDivElement);
    return {
        document: browserWindow.document,
        root,
        restore: () => {
            act(() => root.unmount());
            for (const key of keys) {
                const descriptor = descriptors.get(key);
                if (descriptor) Object.defineProperty(globalThis, key, descriptor);
                else Reflect.deleteProperty(globalThis, key);
            }
            browserWindow.close();
        },
    };
};

const buttonNamed = (document: ReturnType<typeof installDOM>['document'], name: string) =>
    [...document.querySelectorAll('button')].find((button) => button.textContent === name) as unknown as HTMLButtonElement;

function OpenerHarness() {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button" onClick={() => setOpen(true)}>Open</button>
            <ConfirmModal isOpen={open} onClose={() => setOpen(false)} onConfirm={() => setOpen(false)} title="Delete?" />
        </>
    );
}

test('confirm modal moves focus to Cancel when it opens and back to the opener when it closes', () => {
    const dom = installDOM();
    try {
        act(() => dom.root.render(<OpenerHarness />));
        const opener = buttonNamed(dom.document, 'Open');
        opener.focus();
        act(() => opener.click());
        assert.equal(dom.document.activeElement, buttonNamed(dom.document, 'Cancel'));
        act(() => buttonNamed(dom.document, 'Cancel').click());
        assert.equal(dom.document.activeElement, opener);
    } finally {
        dom.restore();
    }
});

// The registry's own delete dialog closes as "Delete anyway?" opens.
function RefusedDeleteHarness() {
    const [refusal, setRefusal] = useState<string | null>(null);
    return refusal === null ? (
        <div role="dialog">
            <button type="button" onClick={() => setRefusal('This property cannot be deleted while it has active bookings (1 open application).')}>
                Delete property
            </button>
        </div>
    ) : (
        <ForceDeletePropertyModal refusal={refusal} loading={false} onClose={() => setRefusal(null)} onConfirm={() => undefined} />
    );
}

test('"Delete anyway?" takes focus after the first delete dialog closes', () => {
    const dom = installDOM();
    try {
        act(() => dom.root.render(<RefusedDeleteHarness />));
        const deleteButton = buttonNamed(dom.document, 'Delete property');
        deleteButton.focus();
        act(() => deleteButton.click());
        const cancel = buttonNamed(dom.document, 'Cancel');
        assert.ok(cancel, 'the force-delete dialog is open');
        assert.equal(dom.document.activeElement, cancel);
    } finally {
        dom.restore();
    }
});
