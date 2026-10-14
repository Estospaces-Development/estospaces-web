export const BASE_PAGE_TITLE = 'Estospaces';

const ROLE_SEGMENTS = new Set(['user', 'manager', 'admin', 'dashboard']);
// UUIDs, numeric ids and other opaque tokens must never become a page name.
const safeDecode = (segment: string) => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
};
const looksLikeId = (segment: string) => /^[0-9a-f-]{16,}$/i.test(segment) || /^\d+$/.test(segment);

/** "/manager/leads" -> "Leads | Estospaces". Unknown shapes fall back to the plain app name. */
export const getRouteTitle = (pathname: string): string => {
    const segments = pathname.split('/').filter(Boolean).map(safeDecode);
    const named = segments.filter((segment) => !looksLikeId(segment));
    const meaningful = named.filter((segment) => !ROLE_SEGMENTS.has(segment.toLowerCase()));
    const last = meaningful[meaningful.length - 1] ?? (named.includes('dashboard') ? 'dashboard' : '');
    if (!last) return BASE_PAGE_TITLE;
    const label = last.replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
    return `${label} | ${BASE_PAGE_TITLE}`;
};
