export const ADMIN_FEATURE_LABELS = {
    users: 'Users',
    listings: 'Listings',
} as const;

const ADMIN_SEARCH_ALIASES: Record<string, readonly string[]> = {
    '/admin/users': ['User Management', 'User Registry'],
    '/admin/properties': ['Properties', 'Property Hub', 'Registry Control'],
};

export function matchesAdminPageQuery(page: { label: string; path: string }, query: string): boolean {
    const normalizedQuery = query.trim().replace(/\s+/g, ' ').toLowerCase();
    return [page.label, ...(ADMIN_SEARCH_ALIASES[page.path] ?? [])]
        .some((label) => label.toLowerCase().includes(normalizedQuery));
}
