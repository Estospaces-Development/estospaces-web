import type { PopularSearch } from '@/services/searchService';

const LEGACY_UK_LOCATION_TERM =
    /\b(london|edinburgh|preston|manchester|birmingham|leeds|liverpool|oxford|cambridge|bristol|belfast|glasgow|cardiff)\b/i;

export const buildPopularSearchTerms = (searches: PopularSearch[], limit = 8): string[] => {
    const terms: string[] = [];
    const seen = new Set<string>();

    for (const search of searches) {
        const term = search.term.trim().replace(/\s+/g, ' ');
        const key = term.toLowerCase();
        if (!term || seen.has(key) || LEGACY_UK_LOCATION_TERM.test(term)) {
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
