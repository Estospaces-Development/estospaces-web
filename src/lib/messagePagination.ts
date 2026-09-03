export interface PaginatedMessage {
    id: string;
    timestamp: string;
}

export const mergeLatestMessagePage = <T extends PaginatedMessage>(
    existingMessages: T[],
    latestMessages: T[],
) => {
    const latestIds = new Set(latestMessages.map((message) => message.id));
    const retainedMessages = existingMessages.filter((message) => !latestIds.has(message.id));
    return [...retainedMessages, ...latestMessages].sort((left, right) => {
        const leftTime = new Date(left.timestamp).getTime();
        const rightTime = new Date(right.timestamp).getTime();
        if (!Number.isFinite(leftTime) || !Number.isFinite(rightTime) || leftTime === rightTime) {
            return left.id.localeCompare(right.id);
        }
        return leftTime - rightTime;
    });
};
