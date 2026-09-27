'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, addMonths, addYears, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, parseISO, startOfMonth, startOfToday, startOfWeek, subMonths } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

type DateFieldSize = 'sm' | 'md';

interface DateFieldProps {
    value: string;
    onChange: (value: string) => void;
    min?: string;
    max?: string;
    disabled?: boolean;
    placeholder?: string;
    ariaLabel?: string;
    className?: string;
    buttonClassName?: string;
    panelClassName?: string;
    align?: 'left' | 'right';
    size?: DateFieldSize;
    name?: string;
    id?: string;
    ariaDescribedBy?: string;
}

interface DateFieldPopoverRect {
    top: number;
    right: number;
    bottom: number;
    left: number;
}

interface DateFieldPopoverSize {
    width: number;
    height: number;
}

interface DateFieldPopoverViewport {
    width: number;
    height: number;
}

export interface DateFieldPopoverPlacement {
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: 'above' | 'below';
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const POPOVER_GAP = 12;
const POPOVER_VIEWPORT_PADDING = 16;
const POPOVER_MAX_WIDTH = 320;
// When neither side of the trigger can show a usable slice of the calendar
// (short landscape phones), the panel covers the viewport height instead and
// scrolls internally so Clear/Today stay reachable.
const POPOVER_MIN_SIDE_HEIGHT = 240;

/**
 * Tailwind z-index class for the calendar panel. It must stay above the shared
 * Modal (`z-[9999]`) and the page-level modals that reuse that layer, otherwise
 * the calendar renders behind the dialog and pointer clicks land on the modal.
 */
export const DATE_FIELD_POPOVER_Z_INDEX_CLASS = 'z-[10000]';

export function resolveDateFieldPopoverPlacement(
    triggerRect: DateFieldPopoverRect,
    panelSize: DateFieldPopoverSize,
    viewport: DateFieldPopoverViewport,
    align: 'left' | 'right',
): DateFieldPopoverPlacement {
    const width = Math.min(POPOVER_MAX_WIDTH, Math.max(0, viewport.width - (POPOVER_VIEWPORT_PADDING * 2)));
    const preferredLeft = align === 'right'
        ? triggerRect.right - width
        : triggerRect.left;
    const left = Math.max(
        POPOVER_VIEWPORT_PADDING,
        Math.min(preferredLeft, viewport.width - width - POPOVER_VIEWPORT_PADDING),
    );
    const fullHeight = Math.max(0, viewport.height - (POPOVER_VIEWPORT_PADDING * 2));
    const belowTop = triggerRect.bottom + POPOVER_GAP;
    const spaceBelow = Math.max(0, viewport.height - POPOVER_VIEWPORT_PADDING - belowTop);
    const spaceAbove = Math.max(0, triggerRect.top - POPOVER_GAP - POPOVER_VIEWPORT_PADDING);
    const panelHeight = Math.max(0, panelSize.height);

    if (panelHeight <= spaceBelow) {
        return { top: belowTop, left, width, maxHeight: spaceBelow, placement: 'below' };
    }

    if (panelHeight <= spaceAbove) {
        return {
            top: triggerRect.top - POPOVER_GAP - panelHeight,
            left,
            width,
            maxHeight: spaceAbove,
            placement: 'above',
        };
    }

    // The panel fits on neither side: keep the whole panel inside the viewport
    // and let it scroll, rather than pushing its action row off-screen.
    if (panelHeight <= fullHeight || Math.max(spaceAbove, spaceBelow) < POPOVER_MIN_SIDE_HEIGHT) {
        const maxHeight = fullHeight;
        const visibleHeight = Math.min(panelHeight, maxHeight);
        const preferBelow = spaceBelow >= spaceAbove;
        const idealTop = preferBelow ? belowTop : triggerRect.top - POPOVER_GAP - visibleHeight;
        const top = Math.max(
            POPOVER_VIEWPORT_PADDING,
            Math.min(idealTop, viewport.height - POPOVER_VIEWPORT_PADDING - visibleHeight),
        );
        return { top, left, width, maxHeight, placement: preferBelow ? 'below' : 'above' };
    }

    if (spaceBelow >= spaceAbove) {
        return { top: belowTop, left, width, maxHeight: spaceBelow, placement: 'below' };
    }

    return {
        top: POPOVER_VIEWPORT_PADDING,
        left,
        width,
        maxHeight: spaceAbove,
        placement: 'above',
    };
}

export type DateFieldNavigationKey =
    | 'ArrowLeft'
    | 'ArrowRight'
    | 'ArrowUp'
    | 'ArrowDown'
    | 'Home'
    | 'End'
    | 'PageUp'
    | 'PageDown';

const DATE_FIELD_NAVIGATION_KEYS = new Set<string>([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
]);

export function isDateFieldNavigationKey(key: string): key is DateFieldNavigationKey {
    return DATE_FIELD_NAVIGATION_KEYS.has(key);
}

/**
 * Keyboard grid navigation for the calendar (WAI-ARIA date picker pattern).
 * Moves are clamped to min/max so focus never lands on a disabled day.
 */
export function resolveDateFieldKeyboardTarget(
    key: DateFieldNavigationKey,
    current: Date,
    options: { shiftKey?: boolean; min?: Date | null; max?: Date | null } = {},
): Date {
    let next: Date;
    switch (key) {
        case 'ArrowLeft':
            next = addDays(current, -1);
            break;
        case 'ArrowRight':
            next = addDays(current, 1);
            break;
        case 'ArrowUp':
            next = addDays(current, -7);
            break;
        case 'ArrowDown':
            next = addDays(current, 7);
            break;
        case 'Home':
            next = startOfWeek(current);
            break;
        case 'End':
            next = startOfDay(endOfWeek(current));
            break;
        case 'PageUp':
            next = options.shiftKey ? addYears(current, -1) : addMonths(current, -1);
            break;
        case 'PageDown':
            next = options.shiftKey ? addYears(current, 1) : addMonths(current, 1);
            break;
    }

    const min = options.min ? startOfDay(options.min) : null;
    const max = options.max ? startOfDay(options.max) : null;
    if (min && isBefore(next, min)) {
        return min;
    }
    if (max && isAfter(next, max)) {
        return max;
    }
    return next;
}

/** Day that receives focus when the calendar opens. */
export function resolveDateFieldInitialFocusDate(
    selected: Date | null,
    today: Date,
    min: Date | null,
    max: Date | null,
): Date {
    const minDay = min ? startOfDay(min) : null;
    const maxDay = max ? startOfDay(max) : null;
    const candidate = startOfDay(selected || today);
    if (minDay && isBefore(candidate, minDay)) {
        return minDay;
    }
    if (maxDay && isAfter(candidate, maxDay)) {
        return maxDay;
    }
    return candidate;
}

const parseDateValue = (value?: string | null) => {
    if (!value) {
        return null;
    }

    try {
        const parsed = parseISO(value);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    } catch {
        return null;
    }
};

export default function DateField({
    value,
    onChange,
    min,
    max,
    disabled = false,
    placeholder = 'Select date',
    ariaLabel,
    className = '',
    buttonClassName = '',
    panelClassName = '',
    align = 'left',
    size = 'md',
    name,
    id,
    ariaDescribedBy,
}: DateFieldProps) {
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const triggerRef = useRef<HTMLButtonElement | null>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const focusDayOnRenderRef = useRef(false);
    const selectedDate = useMemo(() => parseDateValue(value), [value]);
    const minDate = useMemo(() => parseDateValue(min), [min]);
    const maxDate = useMemo(() => parseDateValue(max), [max]);
    const [open, setOpen] = useState(false);
    const [popoverPlacement, setPopoverPlacement] = useState<DateFieldPopoverPlacement | null>(null);
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => selectedDate || minDate || startOfToday());
    const [focusedDate, setFocusedDate] = useState<Date | null>(null);

    useEffect(() => {
        if (!selectedDate && !minDate) {
            return;
        }
        setVisibleMonth(selectedDate || minDate || startOfToday());
    }, [selectedDate, minDate]);

    const closePopover = useCallback((restoreFocus: 'always' | 'if-lost') => {
        setOpen(false);
        focusDayOnRenderRef.current = false;
        if (restoreFocus === 'always') {
            triggerRef.current?.focus();
            return;
        }
        // Outside press: let the pressed control take focus, but never strand
        // keyboard focus on <body> after the calendar unmounts.
        window.setTimeout(() => {
            const trigger = triggerRef.current;
            const active = document.activeElement;
            const focusLost = !active
                || active === document.body
                || !active.isConnected
                || Boolean(panelRef.current?.contains(active));
            if (trigger?.isConnected && focusLost) {
                trigger.focus();
            }
        }, 0);
    }, []);

    const openPopover = () => {
        const initialFocus = resolveDateFieldInitialFocusDate(selectedDate, startOfToday(), minDate, maxDate);
        setFocusedDate(initialFocus);
        setVisibleMonth(startOfMonth(initialFocus));
        focusDayOnRenderRef.current = true;
        setOpen(true);
    };

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: Event) => {
            const target = event.target as Node | null;
            if (!target) {
                return;
            }
            if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                closePopover('if-lost');
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Capture phase + stopPropagation: Escape closes only the calendar,
                // not an enclosing Modal that listens for Escape on document.
                event.preventDefault();
                event.stopPropagation();
                closePopover('always');
                return;
            }

            const panel = panelRef.current;
            if (event.key !== 'Tab' || !panel || !panel.contains(document.activeElement)) {
                return;
            }
            const focusable = Array.from(panel.querySelectorAll<HTMLButtonElement>('button:not([disabled])'))
                .filter((element) => element.tabIndex >= 0);
            if (focusable.length === 0) {
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown, true);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown, true);
        };
    }, [closePopover, open]);

    useLayoutEffect(() => {
        if (!open) {
            setPopoverPlacement(null);
            return;
        }

        const updatePopoverPlacement = (event?: Event) => {
            // Scrolling inside the calendar itself must not re-anchor it.
            if (event?.target && panelRef.current?.contains(event.target as Node)) {
                return;
            }
            const panel = panelRef.current;
            const triggerRect = triggerRef.current?.getBoundingClientRect();
            const panelRect = panel?.getBoundingClientRect();
            if (!panel || !triggerRect || !panelRect) {
                return;
            }

            // Natural (unclamped) height, so a max-height from a previous pass
            // does not feed back into the measurement.
            const borderHeight = Math.max(0, panel.offsetHeight - panel.clientHeight);
            const naturalHeight = Math.max(panelRect.height, panel.scrollHeight + borderHeight);
            const nextPlacement = resolveDateFieldPopoverPlacement(
                triggerRect,
                { width: panelRect.width, height: naturalHeight },
                { width: window.innerWidth, height: window.innerHeight },
                align,
            );
            setPopoverPlacement((current) => (
                current
                && current.top === nextPlacement.top
                && current.left === nextPlacement.left
                && current.width === nextPlacement.width
                && current.maxHeight === nextPlacement.maxHeight
                && current.placement === nextPlacement.placement
                    ? current
                    : nextPlacement
            ));
        };

        updatePopoverPlacement();
        window.addEventListener('resize', updatePopoverPlacement);
        window.addEventListener('scroll', updatePopoverPlacement, true);

        return () => {
            window.removeEventListener('resize', updatePopoverPlacement);
            window.removeEventListener('scroll', updatePopoverPlacement, true);
        };
    }, [align, open, visibleMonth]);

    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(visibleMonth));
        const end = endOfWeek(endOfMonth(visibleMonth));
        return eachDayOfInterval({ start, end });
    }, [visibleMonth]);

    const isDayDisabled = useCallback((day: Date) => {
        if (minDate && isBefore(day, startOfDay(minDate))) {
            return true;
        }
        if (maxDate && isAfter(day, startOfDay(maxDate))) {
            return true;
        }
        return false;
    }, [maxDate, minDate]);

    // Roving tabindex: exactly one enabled day in the grid is tabbable.
    const tabbableDay = useMemo(() => {
        const enabledDays = calendarDays.filter((day) => !isDayDisabled(day));
        const today = startOfToday();
        const preferred = [focusedDate, selectedDate, today].find((candidate): candidate is Date => (
            Boolean(candidate)
            && isSameMonth(candidate as Date, visibleMonth)
            && enabledDays.some((day) => isSameDay(day, candidate as Date))
        ));
        return preferred || enabledDays.find((day) => isSameMonth(day, visibleMonth)) || enabledDays[0] || null;
    }, [calendarDays, focusedDate, isDayDisabled, selectedDate, visibleMonth]);

    useEffect(() => {
        if (!open || !popoverPlacement || !focusDayOnRenderRef.current) {
            return;
        }
        const panel = panelRef.current;
        if (!panel) {
            return;
        }
        const dayKey = focusedDate ? format(focusedDate, 'yyyy-MM-dd') : null;
        const target = (dayKey
            ? panel.querySelector<HTMLButtonElement>(`button[data-date-field-day="${dayKey}"]:not([disabled])`)
            : null)
            || panel.querySelector<HTMLButtonElement>('button[data-date-field-day][tabindex="0"]:not([disabled])')
            || panel.querySelector<HTMLButtonElement>('button:not([disabled])');
        focusDayOnRenderRef.current = false;
        (target || panel).focus();
    }, [focusedDate, open, popoverPlacement, visibleMonth]);

    const displayValue = selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder;
    const sizeClass = size === 'sm'
        ? 'min-h-[44px] rounded-xl px-3 py-2 text-sm'
        : 'min-h-[52px] rounded-2xl px-4 py-3 text-sm';

    const commitDate = (day: Date) => {
        if (isDayDisabled(day)) {
            return;
        }
        onChange(format(day, 'yyyy-MM-dd'));
        closePopover('always');
    };

    const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!isDateFieldNavigationKey(event.key)) {
            return;
        }
        const current = focusedDate || tabbableDay;
        if (!current) {
            return;
        }
        event.preventDefault();
        const next = resolveDateFieldKeyboardTarget(event.key, current, {
            shiftKey: event.shiftKey,
            min: minDate,
            max: maxDate,
        });
        focusDayOnRenderRef.current = true;
        setFocusedDate(next);
        if (!isSameMonth(next, visibleMonth)) {
            setVisibleMonth(startOfMonth(next));
        }
    };

    const todayDisabled = isDayDisabled(startOfToday());

    const calendarPopover = open ? (
        <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Choose date"
            tabIndex={-1}
            data-date-field-popover="true"
            data-placement={popoverPlacement?.placement}
            style={{
                top: popoverPlacement?.top ?? 0,
                left: popoverPlacement?.left ?? 0,
                width: popoverPlacement?.width,
                maxHeight: popoverPlacement?.maxHeight,
                visibility: popoverPlacement ? 'visible' : 'hidden',
            }}
            className={[
                'fixed',
                DATE_FIELD_POPOVER_Z_INDEX_CLASS,
                'overflow-y-auto overscroll-contain rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur focus:outline-none dark:border-gray-800 dark:bg-gray-950/95',
                panelClassName,
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Choose date</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white" aria-live="polite">
                        {format(visibleMonth, 'MMMM yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-700 dark:hover:text-orange-300"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-700 dark:hover:text-orange-300"
                        aria-label="Next month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400" aria-hidden="true">
                {WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2" data-date-field-grid="true" onKeyDown={handleGridKeyDown}>
                {calendarDays.map((day) => {
                    const outsideMonth = !isSameMonth(day, visibleMonth);
                    const selected = Boolean(selectedDate && isSameDay(day, selectedDate));
                    const disabledDay = isDayDisabled(day);
                    const tabbable = Boolean(tabbableDay && isSameDay(day, tabbableDay));

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            disabled={disabledDay}
                            tabIndex={tabbable ? 0 : -1}
                            data-date-field-day={format(day, 'yyyy-MM-dd')}
                            aria-label={format(day, 'EEEE d MMMM yyyy')}
                            aria-pressed={selected}
                            aria-current={isSameDay(day, startOfToday()) ? 'date' : undefined}
                            onFocus={() => setFocusedDate(day)}
                            onClick={() => commitDate(day)}
                            className={[
                                'inline-flex h-10 items-center justify-center rounded-2xl text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/70',
                                selected
                                    ? 'bg-orange-500 text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)]'
                                    : outsideMonth
                                        ? 'text-gray-300 dark:text-gray-600'
                                        : 'text-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:text-slate-200 dark:hover:bg-orange-950/30 dark:hover:text-orange-300',
                                disabledDay ? 'cursor-not-allowed opacity-30' : '',
                            ].join(' ')}
                        >
                            {format(day, 'd')}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
                <button
                    type="button"
                    onClick={() => {
                        onChange('');
                        closePopover('always');
                    }}
                    className="rounded-md text-sm font-medium text-gray-500 transition hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Clear
                </button>
                <button
                    type="button"
                    disabled={todayDisabled}
                    onClick={() => commitDate(startOfToday())}
                    className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/60 disabled:cursor-not-allowed disabled:opacity-40 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300"
                >
                    Today
                </button>
            </div>
        </div>
    ) : null;

    return (
        <div ref={wrapperRef} className={`relative ${className}`.trim()}>
            {name ? <input type="hidden" name={name} value={value} /> : null}
            <button
                ref={triggerRef}
                id={id}
                type="button"
                aria-label={ariaLabel || placeholder}
                aria-describedby={ariaDescribedBy}
                aria-expanded={open}
                aria-haspopup="dialog"
                disabled={disabled}
                onClick={() => {
                    if (open) {
                        closePopover('always');
                    } else {
                        openPopover();
                    }
                }}
                className={[
                    'flex w-full items-center gap-3 border border-gray-200 bg-white text-left text-gray-900 shadow-sm transition hover:border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-400/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-white',
                    sizeClass,
                    buttonClassName,
                ].join(' ')}
            >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
                    <CalendarDays size={18} />
                </span>
                <span className={selectedDate ? 'font-medium' : 'text-gray-400 dark:text-gray-500'}>
                    {displayValue}
                </span>
            </button>

            {calendarPopover && typeof document !== 'undefined'
                ? createPortal(calendarPopover, document.body)
                : calendarPopover}
        </div>
    );
}

function startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}
