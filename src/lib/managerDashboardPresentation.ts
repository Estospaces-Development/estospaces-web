export const formatManagerDashboardCount = (
    value: number,
    locale?: Intl.LocalesArgument,
): string => value.toLocaleString(locale);

export const formatManagerActivityDateTime = (
    value: Date,
    locale?: Intl.LocalesArgument,
    timeZone?: string,
): string => {
    if (Number.isNaN(value.getTime())) return 'Time unavailable';

    return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...(timeZone ? { timeZone } : {}),
    }).format(value);
};

export const shouldOpenManagerMapFiltersByDefault = (viewportWidth: number): boolean => (
    viewportWidth >= 640
);
