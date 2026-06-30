export function createDuplicateSafeKeyResolver(fallbackPrefix: string) {
    const counts = new Map<string, number>();

    return (candidate: string | null | undefined, index: number) => {
        const base = candidate?.trim() || `${fallbackPrefix}-${index}`;
        const count = counts.get(base) || 0;
        counts.set(base, count + 1);

        return count === 0 ? base : `${base}-${count + 1}-${index}`;
    };
}
