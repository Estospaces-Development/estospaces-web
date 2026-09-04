const isSameLocalDay = (left: Date, right: Date) => (
    left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate()
);

export const formatConversationTime = (timestamp?: string, now = new Date()) => {
    if (!timestamp) {
        return '';
    }

    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    if (isSameLocalDay(parsed, now)) {
        return parsed.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    if (isSameLocalDay(parsed, yesterday)) {
        return 'Yesterday';
    }

    return parsed.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        ...(parsed.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
    });
};
