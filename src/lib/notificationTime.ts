// Formats an appointment instant for notification text in the viewer's zone
// (or an explicit zone), always labelled so the clock cannot be misread.
// Values that are not parseable dates are returned unchanged.
export const formatNotificationDateTime = (value: string, timeZone?: string): string => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return '';
    }
    const timestamp = Date.parse(trimmed);
    if (!Number.isFinite(timestamp)) {
        return trimmed;
    }

    const parts = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
        timeZoneName: 'short',
        ...(timeZone ? { timeZone } : {}),
    }).formatToParts(new Date(timestamp));
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';

    return `${part('day')} ${part('month')} ${part('year')} at ${part('hour')}:${part('minute')} ${part('timeZoneName')}`.trim();
};
