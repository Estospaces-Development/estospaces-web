export function orderManagerPlans<T extends { code: 'pro' | 'growth' }>(plans: T[]): T[] {
    return [...plans].sort((first, second) => Number(first.code !== 'pro') - Number(second.code !== 'pro'));
}
