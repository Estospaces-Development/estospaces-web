interface QueuedToast {
    message: string;
    title?: string;
    type: string;
}

/** Adds a toast unless an identical one is already showing, so retries don't stack copies (issue 457). */
export function appendToastUnlessDuplicate<T extends QueuedToast>(toasts: T[], next: T): T[] {
    const duplicate = toasts.some((toast) => (
        toast.type === next.type
        && toast.message === next.message
        && (toast.title || '') === (next.title || '')
    ));
    return duplicate ? toasts : [...toasts, next];
}
