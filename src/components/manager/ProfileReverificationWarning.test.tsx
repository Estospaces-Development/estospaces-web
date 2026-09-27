import assert from 'node:assert/strict';
import test from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

// QA-MB-20260923-01-029: a verified manager is told before saving that the
// change will require re-verification, and can back out.

test('the pre-save warning names the fields, focuses Cancel and reports each choice', async () => {
    const window = new Window({ url: 'https://estospaces.test/manager/profile' });
    const globals: Record<string, unknown> = {
        window,
        document: window.document,
        navigator: window.navigator,
        HTMLElement: window.HTMLElement,
        Element: window.Element,
        Node: window.Node,
        Event: window.Event,
        MouseEvent: window.MouseEvent,
        KeyboardEvent: window.KeyboardEvent,
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    const descriptors = new Map(Object.keys(globals).map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    }

    const { default: ProfileReverificationWarning } = await import('./ProfileReverificationWarning');
    const calls: string[] = [];
    const host = window.document.createElement('div');
    window.document.body.append(host);
    const root = createRoot(host as unknown as HTMLElement);

    try {
        await act(async () => {
            root.render(
                <ProfileReverificationWarning
                    fields={['Branch name', 'Complaints contact']}
                    onConfirm={() => calls.push('confirm')}
                    onCancel={() => calls.push('cancel')}
                />,
            );
        });

        const dialog = window.document.querySelector('[role="alertdialog"]');
        assert.ok(dialog);
        assert.equal(dialog.getAttribute('aria-labelledby'), 'manager-reverification-warning-title');
        assert.match(dialog.textContent ?? '', /Changing Branch name and Complaints contact will require re-verification/);
        assert.match(dialog.textContent ?? '', /new Fast Track cases pause/);
        assert.equal(window.document.activeElement?.textContent, 'Cancel');

        const button = (label: string) => Array.from(window.document.querySelectorAll('button'))
            .find((element) => element.textContent === label);
        await act(async () => { button('Cancel')?.click(); });
        await act(async () => { button('Save changes anyway')?.click(); });
        await act(async () => {
            dialog.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        });
        assert.deepEqual(calls, ['cancel', 'confirm', 'cancel']);
    } finally {
        await act(async () => root.unmount());
        await window.happyDOM.close();
        for (const [key, descriptor] of descriptors) {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete (globalThis as Record<string, unknown>)[key];
        }
    }
});
