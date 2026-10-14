import { useEffect } from 'react';

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
    // "/properties/add" is "Add property" and "/properties/<id>" is a single "Property", not the list.
    const parent = meaningful[meaningful.length - 2]?.toLowerCase();
    if (parent === 'properties' && ['add', 'edit'].includes(last.toLowerCase())) {
        return `${label} property | ${BASE_PAGE_TITLE}`;
    }
    if (['properties', 'property'].includes(last.toLowerCase()) && looksLikeId(segments[segments.length - 1])) {
        return `Property | ${BASE_PAGE_TITLE}`;
    }
    return `${label} | ${BASE_PAGE_TITLE}`;
};

/** Names the page after its record (e.g. the property title) once it has loaded; the route title applies until then. */
export const useRecordPageTitle = (name?: string | null) => {
    useEffect(() => {
        const trimmed = name?.trim();
        if (trimmed) document.title = `${trimmed} | ${BASE_PAGE_TITLE}`;
    }, [name]);
};
