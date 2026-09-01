interface PropertyDetailScrollTarget {
    scrollTo(options: ScrollToOptions): void;
    requestAnimationFrame(callback: FrameRequestCallback): number;
    cancelAnimationFrame(handle: number): void;
}

const scrollToPropertyDetailTop = (target: PropertyDetailScrollTarget) => {
    target.scrollTo({ top: 0, left: 0, behavior: 'auto' });
};

export const shouldResetPropertyDetailScroll = (hash: string) => hash.trim() === '';

export const resetPropertyDetailScroll = (target: PropertyDetailScrollTarget) => {
    scrollToPropertyDetailTop(target);

    const frame = target.requestAnimationFrame(() => {
        scrollToPropertyDetailTop(target);
    });

    return () => target.cancelAnimationFrame(frame);
};
