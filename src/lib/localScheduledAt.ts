// A typed date and time are local wall-clock values. Inside a daylight-saving gap (for example 01:30
// on the UK spring-forward day) that time does not exist and new Date() silently moves it an hour
// later, so refuse it instead of saving a different slot (MB-0452).
export const toLocalScheduledAt = (
    date: string,
    time: string,
): { scheduledAt: string } | { error: string } => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const value = new Date(year, month - 1, day, hours, minutes);
    if (
        Number.isNaN(value.getTime())
        || value.getFullYear() !== year
        || value.getMonth() !== month - 1
        || value.getDate() !== day
    ) {
        return { error: 'Choose a valid date and time.' };
    }
    if (value.getHours() !== hours || value.getMinutes() !== minutes) {
        const dateLabel = new Date(year, month - 1, day, 12).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        return { error: `${time} does not exist on ${dateLabel} because the clocks go forward. Choose another time.` };
    }
    return { scheduledAt: value.toISOString() };
};

// Local calendar day as YYYY-MM-DD, used as the `min` of date pickers so past days are disabled.
export const getLocalTodayInputValue = (now: Date = new Date()): string => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};
