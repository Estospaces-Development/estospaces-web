type ToastOptions = {
    title?: string;
    duration?: number;
    position?: 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';
};

type ToastHandler = (message: string, options?: ToastOptions) => string | void;

const DEDUPE_WINDOW_MS = 2500;

let errorToastHandler: ToastHandler | null = null;
const recentErrors = new Map<string, number>();

export function registerErrorToastHandler(handler: ToastHandler) {
    errorToastHandler = handler;

    return () => {
        if (errorToastHandler === handler) {
            errorToastHandler = null;
        }
    };
}

export function emitErrorToast(message: string, options: ToastOptions = {}) {
    if (!errorToastHandler) {
        return;
    }

    const now = Date.now();
    const key = `${options.title || ''}::${message}`;
    const previous = recentErrors.get(key);

    if (previous && now - previous < DEDUPE_WINDOW_MS) {
        return;
    }

    recentErrors.set(key, now);
    errorToastHandler(message, options);
}
