'use client';

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isAfter, isBefore, isSameDay, isSameMonth, parseISO, startOfMonth, startOfToday, startOfWeek, subMonths } from 'date-fns';
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
    placement: 'above' | 'below';
}

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const POPOVER_GAP = 12;
const POPOVER_VIEWPORT_PADDING = 16;
const POPOVER_MAX_WIDTH = 320;

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
    const belowTop = triggerRect.bottom + POPOVER_GAP;
    const aboveTop = triggerRect.top - panelSize.height - POPOVER_GAP;
    const fitsBelow = belowTop + panelSize.height <= viewport.height - POPOVER_VIEWPORT_PADDING;
    const fitsAbove = aboveTop >= POPOVER_VIEWPORT_PADDING;

    if (fitsBelow || !fitsAbove) {
        return {
            top: Math.max(
                POPOVER_VIEWPORT_PADDING,
                Math.min(belowTop, viewport.height - panelSize.height - POPOVER_VIEWPORT_PADDING),
            ),
            left,
            width,
            placement: 'below',
        };
    }

    return {
        top: aboveTop,
        left,
        width,
        placement: 'above',
    };
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
    const selectedDate = useMemo(() => parseDateValue(value), [value]);
    const minDate = useMemo(() => parseDateValue(min), [min]);
    const maxDate = useMemo(() => parseDateValue(max), [max]);
    const [open, setOpen] = useState(false);
    const [popoverPlacement, setPopoverPlacement] = useState<DateFieldPopoverPlacement | null>(null);
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => selectedDate || minDate || startOfToday());

    useEffect(() => {
        if (!selectedDate && !minDate) {
            return;
        }
        setVisibleMonth(selectedDate || minDate || startOfToday());
    }, [selectedDate, minDate]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (!wrapperRef.current?.contains(target) && !panelRef.current?.contains(target)) {
                setOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);

    useLayoutEffect(() => {
        if (!open) {
            setPopoverPlacement(null);
            return;
        }

        const updatePopoverPlacement = () => {
            const triggerRect = triggerRef.current?.getBoundingClientRect();
            const panelRect = panelRef.current?.getBoundingClientRect();
            if (!triggerRect || !panelRect) {
                return;
            }

            const nextPlacement = resolveDateFieldPopoverPlacement(
                triggerRect,
                panelRect,
                { width: window.innerWidth, height: window.innerHeight },
                align,
            );
            setPopoverPlacement((current) => (
                current
                && current.top === nextPlacement.top
                && current.left === nextPlacement.left
                && current.width === nextPlacement.width
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
    }, [align, open]);

    const calendarDays = useMemo(() => {
        const start = startOfWeek(startOfMonth(visibleMonth));
        const end = endOfWeek(endOfMonth(visibleMonth));
        return eachDayOfInterval({ start, end });
    }, [visibleMonth]);

    const displayValue = selectedDate ? format(selectedDate, 'dd MMM yyyy') : placeholder;
    const sizeClass = size === 'sm'
        ? 'min-h-[44px] rounded-xl px-3 py-2 text-sm'
        : 'min-h-[52px] rounded-2xl px-4 py-3 text-sm';

    const isDayDisabled = (day: Date) => {
        if (minDate && isBefore(day, startOfDay(minDate))) {
            return true;
        }
        if (maxDate && isAfter(day, startOfDay(maxDate))) {
            return true;
        }
        return false;
    };

    const commitDate = (day: Date) => {
        if (isDayDisabled(day)) {
            return;
        }
        onChange(format(day, 'yyyy-MM-dd'));
        setOpen(false);
    };

    const calendarPopover = open ? (
        <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose date"
            data-date-field-popover="true"
            data-placement={popoverPlacement?.placement}
            style={{
                top: popoverPlacement?.top ?? 0,
                left: popoverPlacement?.left ?? 0,
                width: popoverPlacement?.width,
                visibility: popoverPlacement ? 'visible' : 'hidden',
            }}
            className={[
                'fixed z-[100] rounded-[28px] border border-gray-200 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur dark:border-gray-800 dark:bg-gray-950/95',
                panelClassName,
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">Choose date</p>
                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                        {format(visibleMonth, 'MMMM yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setVisibleMonth((current) => subMonths(current, 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-700 dark:hover:text-orange-300"
                        aria-label="Previous month"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisibleMonth((current) => addMonths(current, 1))}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-700 dark:hover:text-orange-300"
                        aria-label="Next month"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">
                {WEEKDAY_LABELS.map((label) => (
                    <span key={label}>{label}</span>
                ))}
            </div>

            <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarDays.map((day) => {
                    const outsideMonth = !isSameMonth(day, visibleMonth);
                    const selected = Boolean(selectedDate && isSameDay(day, selectedDate));
                    const disabledDay = isDayDisabled(day);

                    return (
                        <button
                            key={day.toISOString()}
                            type="button"
                            disabled={disabledDay}
                            onClick={() => commitDate(day)}
                            className={[
                                'inline-flex h-10 items-center justify-center rounded-2xl text-sm font-medium transition',
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
                        setOpen(false);
                    }}
                    className="text-sm font-medium text-gray-500 transition hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Clear
                </button>
                <button
                    type="button"
                    onClick={() => commitDate(startOfToday())}
                    className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-orange-700 transition hover:border-orange-300 hover:bg-orange-100 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-300"
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
                onClick={() => setOpen((current) => !current)}
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
