export const USER_DISCOVER_PATH = '/user/dashboard/discover';

export interface UserAppSearchDestination {
    label: string;
    description: string;
    path: string;
    keywords: string[];
}

export const userAppSearchDestinations: UserAppSearchDestination[] = [
    {
        label: 'Find a home',
        description: 'Search verified homes for sale or rent',
        path: USER_DISCOVER_PATH,
        keywords: ['property', 'properties', 'buy', 'rent', 'home', 'house', 'flat'],
    },
    {
        label: 'Saved homes',
        description: 'Return to properties you saved',
        path: '/user/dashboard/saved',
        keywords: ['saved', 'favourite', 'favorite', 'liked', 'bookmark'],
    },
    {
        label: 'Applications',
        description: 'Check the requests you submitted',
        path: '/user/dashboard/applications',
        keywords: ['application', 'request', 'submitted', 'status'],
    },
    {
        label: 'Fast Track',
        description: 'Continue an active 24-hour journey',
        path: '/user/dashboard/fast-track',
        keywords: ['fast track', 'case', 'documents', 'viewing', 'handover'],
    },
    {
        label: 'Viewings',
        description: 'Review appointments and replies',
        path: '/user/dashboard/viewings',
        keywords: ['viewing', 'appointment', 'visit', 'schedule'],
    },
    {
        label: 'My homes and contracts',
        description: 'Open completed rentals, purchases, and contracts',
        path: '/user/dashboard/contracts',
        keywords: ['contract', 'agreement', 'rented', 'bought', 'my home'],
    },
    {
        label: 'Virtual Storage',
        description: 'Find your stored documents',
        path: '/user/dashboard/virtual-storage',
        keywords: ['document', 'file', 'storage', 'vault', 'identity', 'address'],
    },
    {
        label: 'Messages',
        description: 'Open conversations with managers and support',
        path: '/user/dashboard/messages',
        keywords: ['message', 'chat', 'conversation', 'manager', 'support'],
    },
    {
        label: 'Notifications',
        description: 'Review recent updates and alerts',
        path: '/user/dashboard/notifications',
        keywords: ['notification', 'alert', 'update'],
    },
    {
        label: 'Profile and verification',
        description: 'Manage your details and verification status',
        path: '/user/dashboard/profile',
        keywords: ['profile', 'verification', 'account', 'personal details'],
    },
    {
        label: 'Help and support',
        description: 'Get help or follow a support request',
        path: '/user/dashboard/help',
        keywords: ['help', 'support', 'ticket', 'problem'],
    },
];

export const normalizeUserAppSearchQuery = (query: string) => query.trim().toLowerCase();

export const filterUserAppSearchDestinations = (
    query: string,
    destinations = userAppSearchDestinations,
) => {
    const normalizedQuery = normalizeUserAppSearchQuery(query);

    if (!normalizedQuery) {
        return destinations.slice(0, 6);
    }

    return destinations.filter((destination) => (
        [destination.label, destination.description, ...destination.keywords]
            .some((value) => value.toLowerCase().includes(normalizedQuery))
    ));
};

export const buildDiscoverSearchPath = (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return USER_DISCOVER_PATH;

    const params = new URLSearchParams({ q: normalizedQuery });
    return `${USER_DISCOVER_PATH}?${params.toString()}`;
};

export const shouldOfferDiscoverSearch = (
    query: string,
    destinations: UserAppSearchDestination[],
) => {
    if (query.trim().length < 2) return false;

    return destinations.length === 0
        || destinations.some((destination) => destination.path === USER_DISCOVER_PATH);
};

export const shouldShowScopedListSearch = (itemCount: number, activeQuery: string, threshold = 8) => (
    itemCount >= threshold || activeQuery.trim().length > 0
);
