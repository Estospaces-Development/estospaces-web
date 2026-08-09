export const VIEWING_RESPONSE_WINDOW_SECONDS = 10 * 60;

export type ViewingResponseSlaStatus = 'active' | 'expired' | 'responded' | 'cancelled' | 'unavailable';

export interface ViewingResponseSlaInput {
    status?: string | null;
    created_at?: string | null;
    response_deadline_at?: string | null;
}

export interface ViewingResponseSlaState {
    status: ViewingResponseSlaStatus;
    deadlineAt: string | null;
    secondsRemaining: number;
}

const parseTimestamp = (value?: string | null) => {
    const timestamp = Date.parse(String(value || ''));
    return Number.isFinite(timestamp) ? timestamp : null;
};

export const getViewingResponseDeadline = (viewing: ViewingResponseSlaInput) => {
    const explicitDeadline = parseTimestamp(viewing.response_deadline_at);
    if (explicitDeadline !== null) {
        return explicitDeadline;
    }

    const createdAt = parseTimestamp(viewing.created_at);
    return createdAt === null
        ? null
        : createdAt + VIEWING_RESPONSE_WINDOW_SECONDS * 1000;
};

export const getViewingResponseSlaState = (
    viewing: ViewingResponseSlaInput,
    now = Date.now(),
): ViewingResponseSlaState => {
    const normalizedStatus = String(viewing.status || '').trim().toLowerCase();
    const deadline = getViewingResponseDeadline(viewing);
    const deadlineAt = deadline === null ? null : new Date(deadline).toISOString();

    if (normalizedStatus === 'cancelled') {
        return { status: 'cancelled', deadlineAt, secondsRemaining: 0 };
    }

    if (['confirmed', 'rescheduled', 'completed'].includes(normalizedStatus)) {
        return { status: 'responded', deadlineAt, secondsRemaining: 0 };
    }

    if (normalizedStatus !== 'pending' || deadline === null) {
        return { status: 'unavailable', deadlineAt, secondsRemaining: 0 };
    }

    const secondsRemaining = Math.max(0, Math.ceil((deadline - now) / 1000));
    return {
        status: secondsRemaining > 0 ? 'active' : 'expired',
        deadlineAt,
        secondsRemaining,
    };
};

export const formatViewingResponseCountdown = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remainingSeconds = safeSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
