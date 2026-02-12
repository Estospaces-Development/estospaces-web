import type { Metadata } from 'next';

const SITE_NAME = 'Estospaces';
const SITE_URL = 'https://estospaces.co.uk';
const DEFAULT_DESCRIPTION = 'Premium property platform connecting buyers, sellers, and brokers across the UK. Find your dream property with Estospaces.';

interface SeoConfig {
    title: string;
    description?: string;
    path?: string;
    image?: string;
    noIndex?: boolean;
}

/**
 * Generate Next.js Metadata object for SEO.
 * Usage:  export const metadata = generateMetadata({ title: 'Dashboard', path: '/dashboard' });
 */
export function generateMetadata({
    title,
    description = DEFAULT_DESCRIPTION,
    path = '',
    image = '/og-image.png',
    noIndex = false,
}: SeoConfig): Metadata {
    const fullTitle = `${title} | ${SITE_NAME}`;
    const url = `${SITE_URL}${path}`;

    return {
        title: fullTitle,
        description,
        robots: noIndex ? { index: false, follow: false } : { index: true, follow: true },
        openGraph: {
            title: fullTitle,
            description,
            url,
            siteName: SITE_NAME,
            locale: 'en_GB',
            type: 'website',
            images: [{ url: image, width: 1200, height: 630, alt: title }],
        },
        twitter: {
            card: 'summary_large_image',
            title: fullTitle,
            description,
            images: [image],
        },
        alternates: {
            canonical: url,
        },
    };
}

/**
 * Pre-defined metadata for common pages.
 */
export const pageMetadata = {
    home: generateMetadata({ title: 'Home', description: 'Find your dream property with EstoSpaces — the UK\'s premium property platform.' }),
    login: generateMetadata({ title: 'Login', path: '/login', noIndex: true }),
    register: generateMetadata({ title: 'Register', path: '/register', noIndex: true }),
    contact: generateMetadata({ title: 'Contact Us', path: '/contact', description: 'Get in touch with the EstoSpaces team.' }),
    faq: generateMetadata({ title: 'FAQ', path: '/faq', description: 'Frequently asked questions about EstoSpaces.' }),
    privacy: generateMetadata({ title: 'Privacy Policy', path: '/privacy' }),
    userDashboard: generateMetadata({ title: 'Dashboard', path: '/user/dashboard', noIndex: true }),
    userSearch: generateMetadata({ title: 'Property Search', path: '/user/search', description: 'Search thousands of verified property listings across the UK.' }),
    userBookings: generateMetadata({ title: 'My Bookings', path: '/user/bookings', noIndex: true }),
    userFavorites: generateMetadata({ title: 'Saved Properties', path: '/user/favorites', noIndex: true }),
    managerDashboard: generateMetadata({ title: 'Manager Dashboard', path: '/manager/dashboard', noIndex: true }),
    managerProperties: generateMetadata({ title: 'Manage Properties', path: '/manager/properties', noIndex: true }),
    managerLeads: generateMetadata({ title: 'Leads & CRM', path: '/manager/leads', noIndex: true }),
    managerClients: generateMetadata({ title: 'Client Management', path: '/manager/clients', noIndex: true }),
    managerAnalytics: generateMetadata({ title: 'Analytics', path: '/manager/analytics', noIndex: true }),
    adminDashboard: generateMetadata({ title: 'Admin Dashboard', path: '/admin/dashboard', noIndex: true }),
    adminVerifications: generateMetadata({ title: 'Verifications', path: '/admin/verifications', noIndex: true }),
    adminUsers: generateMetadata({ title: 'User Management', path: '/admin/users', noIndex: true }),
    adminChat: generateMetadata({ title: 'Support Chat', path: '/admin/chat', noIndex: true }),
};
