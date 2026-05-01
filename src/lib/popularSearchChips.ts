import type { PopularSearch } from '@/services/searchService';

export const buildPopularSearchTerms = (searches: PopularSearch[], limit = 8): string[] => {
    const terms: string[] = [];
    const seen = new Set<string>();

    for (const search of searches) {
        const term = search.term.trim().replace(/\s+/g, ' ');
        const key = term.toLowerCase();
        if (!term || seen.has(key)) {
            continue;
        }

        terms.push(term);
        seen.add(key);
        if (terms.length >= limit) {
            break;
        }
    }

    return terms;
};
