import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl;
    const hostname = request.headers.get('host') || '';

    // Allowed subdomains
    const subdomains = ['user', 'manager', 'admin'];

    // Find which subdomain is being accessed
    const subdomain = subdomains.find(sub => hostname.startsWith(`${sub}.`));

    if (subdomain) {
        // Exclude static assets, API, and internal Next.js paths
        if (
            url.pathname.startsWith('/_next') ||
            url.pathname.startsWith('/api') ||
            url.pathname.startsWith('/static') ||
            url.pathname.includes('.') // Files (images, css, etc.)
        ) {
            return NextResponse.next();
        }

        // Exclude public/auth routes to ensure they are accessible on subdomains
        // (e.g. manager.domain.com/login should work)
        const publicRoutes = ['/login', '/register', '/contact', '/privacy', '/terms'];
        if (publicRoutes.some(route => url.pathname.startsWith(route))) {
            return NextResponse.next();
        }

        // 1. Root path rewrite -> Dashboard
        if (url.pathname === '/') {
            return NextResponse.rewrite(new URL(`/${subdomain}/dashboard`, request.url));
        }

        // 2. Path rewrite -> Prepend role if missing
        // e.g. /appointments -> /manager/appointments
        if (!url.pathname.startsWith(`/${subdomain}`)) {
            return NextResponse.rewrite(new URL(`/${subdomain}${url.pathname}`, request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};
