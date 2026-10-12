import { useEffect, useState, type RefObject } from 'react';

/** 1px tolerance absorbs sub-pixel rounding between scrollWidth and clientWidth. */
export function hasHorizontalOverflow(scrollWidth: number, clientWidth: number): boolean {
    return scrollWidth - clientWidth > 1;
}

/** True while the referenced element's content is wider than its box (so swiping can reveal more). */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, watch: unknown): boolean {
    const [overflowing, setOverflowing] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) {
            setOverflowing(false);
            return undefined;
        }
        const measure = () => setOverflowing(hasHorizontalOverflow(el.scrollWidth, el.clientWidth));
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(el);
        if (el.firstElementChild) observer.observe(el.firstElementChild);
        return () => observer.disconnect();
    }, [ref, watch]);

    return overflowing;
}
