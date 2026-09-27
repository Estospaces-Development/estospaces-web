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

function ReservationHarness({
    onModalClose,
    onDate,
    initialValue = '',
}: {
    onModalClose: () => void;
    onDate: (value: string) => void;
    initialValue?: string;
}) {
    const [value, setValue] = useState(initialValue);
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

type PointerInit = { pointerType: 'mouse' | 'touch' | 'pen'; pointerId?: number; clientX?: number; clientY?: number };
const pointer = (dom: Dom, target: Element | HTMLElement, type: string, init: PointerInit) => {
    const event = new dom.browserWindow.PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: init.pointerId ?? 1,
        pointerType: init.pointerType,
        clientX: init.clientX ?? 0,
        clientY: init.clientY ?? 0,
    });
    (target as unknown as EventTarget).dispatchEvent(event as unknown as Event);
};
const flushTimers = () => new Promise((resolve) => setTimeout(resolve, 5));

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
            pointer(dom, title, 'pointerdown', { pointerType: 'mouse' });
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

const dayButtons = (dom: Dom) => Array.from(
    popover(dom)?.querySelectorAll('button[data-date-field-day]') ?? [],
) as unknown as HTMLButtonElement[];

// happy-dom has no layout engine: stub the geometry the placement code reads so
// the panel height follows the rendered week-row count, as it does in Chrome.
const PANEL_CHROME_HEIGHT = 172;
const WEEK_ROW_HEIGHT = 48;
const installLayoutStub = (dom: Dom, triggerRect: { top: number; bottom: number; left: number; right: number }) => {
    const proto = dom.browserWindow.HTMLElement.prototype as unknown as Record<string, unknown>;
    const originalRect = proto.getBoundingClientRect as (this: HTMLElement) => DOMRect;
    const originalScrollHeight = Object.getOwnPropertyDescriptor(proto, 'scrollHeight');
    const rect = (top: number, left: number, width: number, height: number) => ({
        top, left, width, height, x: left, y: top, right: left + width, bottom: top + height, toJSON: () => ({}),
    });
    proto.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement) {
        if (this.getAttribute('aria-label') === 'Booking check-in date') {
            return rect(triggerRect.top, triggerRect.left, triggerRect.right - triggerRect.left, triggerRect.bottom - triggerRect.top);
        }
        if (this.getAttribute('data-date-field-popover') === 'true') {
            return rect(0, 0, 320, 0);
        }
        return originalRect.call(this);
    };
    Object.defineProperty(proto, 'scrollHeight', {
        configurable: true,
        get(this: HTMLElement) {
            if (this.getAttribute('data-date-field-popover') === 'true') {
                const rows = this.querySelectorAll('[data-date-field-day]').length / 7;
                return PANEL_CHROME_HEIGHT + (rows * WEEK_ROW_HEIGHT);
            }
            return 0;
        },
    });
    return () => {
        proto.getBoundingClientRect = originalRect;
        if (originalScrollHeight) Object.defineProperty(proto, 'scrollHeight', originalScrollHeight);
        else Reflect.deleteProperty(proto, 'scrollHeight');
    };
};

const buttonIndex = (panel: HTMLElement, button: Element | null) => (
    Array.from(panel.querySelectorAll('button')) as unknown as Element[]
).indexOf(button as Element);

test('verifier F1: paging Dec 2026 -> Jan 2027 (5-row -> 6-row month) at 908x694 keeps the panel and Next button still', () => {
    const dom = installDOM();
    // Lower-half trigger in the Reserve Booking layout: too little room below,
    // so the panel is positioned from its bottom edge (above / viewport clamp).
    const restoreLayout = installLayoutStub(dom, { top: 480, bottom: 532, left: 280, right: 600 });
    try {
        assert.equal(dom.browserWindow.innerHeight, 694);
        act(() => dom.root.render(
            <ReservationHarness onModalClose={() => undefined} onDate={() => undefined} initialValue="2026-12-10" />,
        ));
        act(() => trigger(dom).click());

        const panel = popover(dom)!;
        assert.match(panel.textContent || '', /December 2026/);
        assert.equal(dayButtons(dom).length, 42, 'December renders a fixed six-row grid');
        const next = panel.querySelector('button[aria-label="Next month"]') as unknown as HTMLButtonElement;
        const before = { top: panel.style.top, maxHeight: panel.style.maxHeight, nextIndex: buttonIndex(panel, next) };
        assert.ok(before.top, 'panel was positioned');

        act(() => next.click());

        const after = popover(dom)!;
        assert.match(after.textContent || '', /January 2027/);
        assert.equal(dayButtons(dom).length, 42, 'January renders the same six-row grid');
        assert.equal(after.style.top, before.top, 'panel top edge did not move');
        assert.equal(after.style.maxHeight, before.maxHeight);
        const nextAfter = after.querySelector('button[aria-label="Next month"]') as unknown as HTMLButtonElement;
        assert.equal(buttonIndex(after, nextAfter), before.nextIndex, 'Next keeps its place in the header');

        // Repeated clicks at the same spot keep paging (the header stays under the pointer).
        act(() => nextAfter.click());
        assert.match(popover(dom)!.textContent || '', /February 2027/);
        assert.equal(popover(dom)!.style.top, before.top);
    } finally {
        restoreLayout();
        dom.restore();
    }
});

test('verifier F3: a real pointer sequence on a day inside the Modal selects it without closing either layer early', async () => {
    for (const pointerType of ['mouse', 'touch'] as const) {
        const dom = installDOM();
        const committed: string[] = [];
        let modalCloses = 0;
        try {
            act(() => dom.root.render(
                <ReservationHarness onModalClose={() => { modalCloses += 1; }} onDate={(value) => committed.push(value)} />,
            ));
            act(() => trigger(dom).click());
            const target = dayButtons(dom).find((button) => !button.disabled && button.getAttribute('tabindex') === '-1')!;
            assert.ok(target, 'an enabled, non-focused day exists');
            const chosen = target.getAttribute('data-date-field-day');
            const mouse = (type: string) => (target as unknown as EventTarget).dispatchEvent(
                new dom.browserWindow.MouseEvent(type, { bubbles: true, cancelable: true }) as unknown as Event,
            );

            await act(async () => {
                pointer(dom, target, 'pointerdown', { pointerType, clientX: 50, clientY: 50 });
                mouse('mousedown');
                await flushTimers();
            });
            assert.ok(popover(dom), `${pointerType}: pointerdown on a day does not dismiss the calendar`);

            await act(async () => {
                pointer(dom, target, 'pointerup', { pointerType, clientX: 50, clientY: 50 });
                mouse('mouseup');
                mouse('click');
                await flushTimers();
            });

            assert.deepEqual(committed, [chosen], `${pointerType}: the pressed day was committed`);
            assert.ok(popover(dom) === null, `${pointerType}: calendar closed after selection`);
            assert.equal(modalCloses, 0, `${pointerType}: the Reserve Booking modal stayed open`);
            assert.ok(active(dom) === trigger(dom), `${pointerType}: focus returned to the trigger`);
        } finally {
            dom.restore();
        }
    }
});

test('verifier F4: a touch scroll/drag that starts outside the panel does not close it; a touch tap does', async () => {
    const dom = installDOM();
    try {
        act(() => dom.root.render(<ReservationHarness onModalClose={() => undefined} onDate={() => undefined} />));
        act(() => trigger(dom).click());
        const outside = dom.document.getElementById('modal-title') as unknown as HTMLElement;

        // Drag: moves well beyond the tap slop before release.
        await act(async () => {
            pointer(dom, outside, 'pointerdown', { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 100 });
            pointer(dom, outside, 'pointermove', { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 160 });
            pointer(dom, outside, 'pointerup', { pointerType: 'touch', pointerId: 7, clientX: 100, clientY: 160 });
            await flushTimers();
        });
        assert.ok(popover(dom), 'drag gesture kept the calendar open');

        // Native scroll: the browser cancels the pointer once panning starts.
        await act(async () => {
            pointer(dom, outside, 'pointerdown', { pointerType: 'touch', pointerId: 8, clientX: 100, clientY: 100 });
            pointer(dom, outside, 'pointercancel', { pointerType: 'touch', pointerId: 8, clientX: 100, clientY: 104 });
            pointer(dom, outside, 'pointerup', { pointerType: 'touch', pointerId: 8, clientX: 100, clientY: 104 });
            await flushTimers();
        });
        assert.ok(popover(dom), 'cancelled (scrolling) pointer kept the calendar open');

        // Pen drag behaves like touch.
        await act(async () => {
            pointer(dom, outside, 'pointerdown', { pointerType: 'pen', pointerId: 9, clientX: 10, clientY: 10 });
            pointer(dom, outside, 'pointerup', { pointerType: 'pen', pointerId: 9, clientX: 60, clientY: 10 });
            await flushTimers();
        });
        assert.ok(popover(dom), 'pen drag kept the calendar open');

        // Tap: release within the slop closes and restores focus.
        await act(async () => {
            pointer(dom, outside, 'pointerdown', { pointerType: 'touch', pointerId: 10, clientX: 100, clientY: 100 });
            pointer(dom, outside, 'pointerup', { pointerType: 'touch', pointerId: 10, clientX: 103, clientY: 102 });
            await flushTimers();
        });
        assert.ok(popover(dom) === null, 'touch tap outside closed the calendar');
        assert.ok(active(dom) === trigger(dom), 'focus restored to the trigger');
    } finally {
        dom.restore();
    }
});
