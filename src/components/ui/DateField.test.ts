import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
    buildDateFieldCalendarDays,
    DATE_FIELD_CALENDAR_CELL_COUNT,
    DATE_FIELD_POPOVER_Z_INDEX_CLASS,
    resolveDateFieldInitialFocusDate,
    resolveDateFieldKeyboardTarget,
    resolveDateFieldPopoverPlacement,
} from './DateField';

const day = (value: string) => {
    const [year, month, date] = value.split('-').map(Number);
    return new Date(year, month - 1, date);
};

const iso = (value: Date) => [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, '0'),
    String(value.getDate()).padStart(2, '0'),
].join('-');

test('places the calendar below its trigger when there is room', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 120, right: 520, bottom: 172, left: 200 },
        { width: 320, height: 400 },
        { width: 1280, height: 900 },
        'left',
    );

    assert.deepEqual(placement, {
        top: 184,
        left: 200,
        width: 320,
        maxHeight: 700,
        placement: 'below',
    });
});

test('places the calendar above a lower-page trigger instead of clipping it', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 650, right: 700, bottom: 702, left: 380 },
        { width: 320, height: 400 },
        { width: 1280, height: 900 },
        'left',
    );

    assert.deepEqual(placement, {
        top: 238,
        left: 380,
        width: 320,
        maxHeight: 622,
        placement: 'above',
    });
});

test('keeps the calendar inside narrow viewports', () => {
    const placement = resolveDateFieldPopoverPlacement(
        { top: 100, right: 350, bottom: 152, left: 300 },
        { width: 320, height: 400 },
        { width: 360, height: 760 },
        'right',
    );

    assert.deepEqual(placement, {
        top: 164,
        left: 24,
        width: 320,
        maxHeight: 580,
        placement: 'below',
    });
});

test('QA-MB-20260924-01-017: phone landscape (844x390) keeps the whole panel on screen and scrollable', () => {
    const viewport = { width: 844, height: 390 };
    const placement = resolveDateFieldPopoverPlacement(
        { top: 180, right: 600, bottom: 232, left: 280 },
        { width: 320, height: 430 },
        viewport,
        'left',
    );

    assert.equal(placement.top, 16);
    assert.equal(placement.maxHeight, 358);
    // Rendered bottom edge (top + min(natural, maxHeight)) stays inside the viewport,
    // so Clear/Today are reachable by scrolling the panel.
    assert.ok(placement.top + Math.min(430, placement.maxHeight) <= viewport.height - 16);
});

test('QA-MB-20260925-01-007: short desktop viewport (908x694) never pushes the panel past the bottom edge', () => {
    const viewport = { width: 908, height: 694 };
    const panel = { width: 320, height: 460 };
    for (const triggerTop of [80, 200, 320, 420, 560]) {
        const placement = resolveDateFieldPopoverPlacement(
            { top: triggerTop, right: 600, bottom: triggerTop + 52, left: 280 },
            panel,
            viewport,
            'left',
        );
        const renderedHeight = Math.min(panel.height, placement.maxHeight);
        assert.ok(placement.top >= 16, `top inside viewport for trigger at ${triggerTop}`);
        assert.ok(
            placement.top + renderedHeight <= viewport.height - 16,
            `bottom inside viewport for trigger at ${triggerTop}`,
        );
        assert.ok(placement.maxHeight > 0);
    }
});

test('390px mobile portrait keeps the panel inside the horizontal and vertical bounds', () => {
    const viewport = { width: 390, height: 844 };
    const placement = resolveDateFieldPopoverPlacement(
        { top: 700, right: 374, bottom: 752, left: 16 },
        { width: 320, height: 460 },
        viewport,
        'left',
    );

    assert.equal(placement.placement, 'above');
    assert.ok(placement.left >= 16 && placement.left + placement.width <= viewport.width - 16);
    assert.ok(placement.top >= 16);
    assert.ok(placement.top + Math.min(460, placement.maxHeight) <= viewport.height - 16);
});

test('arrow keys move by day and week; Home/End go to week edges', () => {
    const current = day('2026-09-23');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowRight', current)), '2026-09-24');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowLeft', current)), '2026-09-22');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowDown', current)), '2026-09-30');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowUp', current)), '2026-09-16');
    assert.equal(iso(resolveDateFieldKeyboardTarget('Home', current)), '2026-09-20');
    assert.equal(iso(resolveDateFieldKeyboardTarget('End', current)), '2026-09-26');
    assert.equal(iso(resolveDateFieldKeyboardTarget('PageDown', current)), '2026-10-23');
    assert.equal(iso(resolveDateFieldKeyboardTarget('PageUp', current, { shiftKey: true })), '2025-09-23');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowRight', day('2026-09-30'))), '2026-10-01');
});

test('keyboard navigation is clamped to min and max so focus never lands on a disabled day', () => {
    const min = day('2026-09-23');
    const max = day('2026-09-28');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowLeft', min, { min, max })), '2026-09-23');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowUp', day('2026-09-25'), { min, max })), '2026-09-23');
    assert.equal(iso(resolveDateFieldKeyboardTarget('ArrowDown', day('2026-09-25'), { min, max })), '2026-09-28');
    assert.equal(iso(resolveDateFieldKeyboardTarget('PageDown', day('2026-09-25'), { min, max })), '2026-09-28');
});

test('initial focus prefers the selected day, then today, clamped to min/max', () => {
    const today = day('2026-09-27');
    assert.equal(iso(resolveDateFieldInitialFocusDate(day('2026-10-05'), today, null, null)), '2026-10-05');
    assert.equal(iso(resolveDateFieldInitialFocusDate(null, today, null, null)), '2026-09-27');
    assert.equal(iso(resolveDateFieldInitialFocusDate(null, today, day('2026-10-01'), null)), '2026-10-01');
    assert.equal(iso(resolveDateFieldInitialFocusDate(null, today, null, day('2026-09-01'))), '2026-09-01');
});

test('QA-MB-20260925-01-007: calendar layer is above the shared Modal and in-page z-[9999] dialogs', () => {
    const zOf = (className: string) => Number(/z-\[(\d+)\]/.exec(className)?.[1] ?? Number.NaN);
    const modalSource = readFileSync(new URL('./Modal.tsx', import.meta.url), 'utf8');
    const modalZ = zOf(/className="fixed inset-0 (z-\[\d+\])/.exec(modalSource)?.[1] ?? '');

    assert.ok(Number.isFinite(modalZ), 'Modal z-index is discoverable');
    assert.ok(zOf(DATE_FIELD_POPOVER_Z_INDEX_CLASS) > modalZ);
    assert.ok(zOf(DATE_FIELD_POPOVER_Z_INDEX_CLASS) > 9999);
});

test('verifier F1: every month renders the same 42-cell grid, including 5-row and 6-row months', () => {
    for (const month of ['2026-12-01', '2027-01-01', '2026-02-01', '2027-02-01', '2026-08-01']) {
        const days = buildDateFieldCalendarDays(day(month));
        assert.equal(days.length, DATE_FIELD_CALENDAR_CELL_COUNT, month);
        assert.equal(days[0].getDay(), 0, `${month} grid starts on Sunday`);
        assert.ok(days.some((value) => iso(value) === month), `${month} grid contains the 1st`);
    }
    // Dec 2026 needs 5 rows and Jan 2027 needs 6; both grids have the same size.
    assert.equal(iso(buildDateFieldCalendarDays(day('2026-12-01'))[0]), '2026-11-29');
    assert.equal(iso(buildDateFieldCalendarDays(day('2026-12-01'))[41]), '2027-01-09');
    assert.equal(iso(buildDateFieldCalendarDays(day('2027-01-01'))[0]), '2026-12-27');
    assert.equal(iso(buildDateFieldCalendarDays(day('2027-01-01'))[41]), '2027-02-06');
});
