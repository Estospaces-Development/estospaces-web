import assert from 'node:assert/strict';
import test from 'node:test';
import { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

import DateField from './DateField';
import Modal from './Modal';

const installDOM = () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/user/dashboard/bookings', width: 908, height: 694 });
    const keys = [
        'window',
        'document',
        'navigator',
        'HTMLElement',
        'HTMLButtonElement',
        'Element',
        'Node',
        'KeyboardEvent',
        'IS_REACT_ACT_ENVIRONMENT',
    ] as const;
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

    const browserHost = browserWindow.document.createElement('div');
    browserWindow.document.body.append(browserHost);
    const root = createRoot(browserHost as unknown as HTMLDivElement);

    return {
        browserWindow,
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

type Dom = ReturnType<typeof installDOM>;

function ReservationHarness({ onModalClose, onDate }: { onModalClose: () => void; onDate: (value: string) => void }) {
    const [value, setValue] = useState('');
    return (
        <Modal isOpen onClose={onModalClose} title="Reserve Booking" footer={<button type="button">Create Reservation</button>}>
            <DateField
                value={value}
                onChange={(next) => {
                    setValue(next);
                    onDate(next);
                }}
                ariaLabel="Booking check-in date"
            />
        </Modal>
    );
}

const trigger = (dom: Dom) => dom.document.querySelector('button[aria-label="Booking check-in date"]') as unknown as HTMLButtonElement;
const popover = (dom: Dom) => dom.document.querySelector('[data-date-field-popover="true"]') as unknown as HTMLElement | null;
const active = (dom: Dom) => dom.document.activeElement as unknown as HTMLElement | null;
const pressKey = (dom: Dom, key: string) => {
    const target = (active(dom) || dom.document.body) as unknown as EventTarget;
    act(() => {
        target.dispatchEvent(new dom.browserWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }) as unknown as Event);
    });
};

test('QA-MB-20260925-01-007/012: calendar inside Modal is portalled above it and receives focus on open', () => {
    const dom = installDOM();
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => undefined} onDate={() => undefined} />));
        act(() => trigger(dom).click());

        const panel = popover(dom);
        assert.ok(panel, 'calendar is rendered');
        assert.ok(panel.parentElement === (dom.document.body as unknown as HTMLElement), 'calendar is portalled to <body>');
        assert.match(panel.className, /\bz-\[10000\]/);
        assert.match(panel.className, /overflow-y-auto/);
        assert.equal(trigger(dom).getAttribute('aria-expanded'), 'true');

        const focused = active(dom);
        assert.ok(focused && panel.contains(focused), 'focus moved into the calendar');
        assert.ok(focused.getAttribute('data-date-field-day'), 'a day button holds focus');
        assert.equal(focused.getAttribute('tabindex'), '0');
    } finally {
        dom.restore();
    }
});

test('QA-MB-20260923-01-026: arrow keys move focus across the grid; Escape closes only the calendar and restores focus', () => {
    const dom = installDOM();
    let modalCloses = 0;
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => { modalCloses += 1; }} onDate={() => undefined} />));
        act(() => trigger(dom).click());

        const start = active(dom)?.getAttribute('data-date-field-day');
        assert.ok(start);
        pressKey(dom, 'ArrowRight');
        const afterRight = active(dom)?.getAttribute('data-date-field-day');
        assert.ok(afterRight && afterRight > start, `ArrowRight moved from ${start} to ${afterRight}`);
        pressKey(dom, 'ArrowDown');
        const afterDown = active(dom)?.getAttribute('data-date-field-day');
        assert.ok(afterDown && afterDown > afterRight, 'ArrowDown moved one week forward');
        pressKey(dom, 'ArrowUp');
        assert.equal(active(dom)?.getAttribute('data-date-field-day'), afterRight);

        pressKey(dom, 'Escape');
        assert.ok(popover(dom) === null, 'calendar closed');
        assert.equal(modalCloses, 0, 'Escape did not also close the enclosing modal');
        assert.ok(active(dom) === trigger(dom), 'focus returned to the date trigger');
        assert.equal(trigger(dom).getAttribute('aria-expanded'), 'false');

        pressKey(dom, 'Escape');
        assert.equal(modalCloses, 1, 'a second Escape reaches the modal once the calendar is closed');
    } finally {
        dom.restore();
    }
});

test('QA-MB-20260925-01-012: selecting a day commits it and returns focus to the trigger', () => {
    const dom = installDOM();
    const committed: string[] = [];
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => undefined} onDate={(value) => committed.push(value)} />));
        act(() => trigger(dom).click());
        pressKey(dom, 'ArrowRight');
        const chosen = active(dom)?.getAttribute('data-date-field-day');
        act(() => (active(dom) as HTMLButtonElement).click());

        assert.deepEqual(committed, [chosen]);
        assert.ok(popover(dom) === null, 'calendar closed after selection');
        assert.ok(active(dom) === trigger(dom), 'focus returned to the date trigger');
    } finally {
        dom.restore();
    }
});

test('outside press closes the calendar and restores focus to the trigger when focus would be lost', async () => {
    const dom = installDOM();
    let modalCloses = 0;
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => { modalCloses += 1; }} onDate={() => undefined} />));
        act(() => trigger(dom).click());
        assert.ok(popover(dom));

        const title = dom.document.getElementById('modal-title') as unknown as HTMLElement;
        await act(async () => {
            title.dispatchEvent(new dom.browserWindow.Event('pointerdown', { bubbles: true }) as unknown as Event);
            await new Promise((resolve) => setTimeout(resolve, 5));
        });

        assert.ok(popover(dom) === null, 'calendar closed on outside press');
        assert.equal(modalCloses, 0);
        assert.ok(active(dom) === trigger(dom), 'focus restored to the trigger instead of <body>');
    } finally {
        dom.restore();
    }
});

test('Tab stays inside the open calendar', () => {
    const dom = installDOM();
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => undefined} onDate={() => undefined} />));
        act(() => trigger(dom).click());
        const panel = popover(dom)!;
        const buttons = Array.from(panel.querySelectorAll('button')).filter((button) => (
            !button.hasAttribute('disabled') && button.getAttribute('tabindex') !== '-1'
        )) as unknown as HTMLButtonElement[];
        assert.equal(buttons[buttons.length - 1].textContent?.trim(), 'Today');
        const last = buttons[buttons.length - 1];
        act(() => last.focus());
        pressKey(dom, 'Tab');
        assert.ok(active(dom) === buttons[0], 'Tab from the last control wraps to the first');
    } finally {
        dom.restore();
    }
});
