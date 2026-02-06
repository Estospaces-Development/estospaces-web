import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Helper to decode JWT and get user role
function getUserRole(token: string | undefined): string | null {
  if (!token) return null;

  try {
    // Decode JWT token (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || null;
  } catch (error) {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const userRole = getUserRole(token);
  const { pathname } = request.nextUrl;

  // Admin routes - only accessible by admin role
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url));
    }
  }

  // Manager routes - accessible by manager and admin roles
  if (pathname.startsWith('/manager')) {
    if (userRole !== 'manager' && userRole !== 'admin') {
      return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url));
    }
  }

  // User dashboard routes - requires authentication
  if (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/bookings') ||
    pathname.startsWith('/applications') ||
    pathname.startsWith('/contracts') ||
    pathname.startsWith('/payments') ||
    pathname.startsWith('/favorites') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/messages') ||
    pathname.startsWith('/notifications') ||
    pathname.startsWith('/reviews') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/viewings') ||
    pathname.startsWith('/help')
  ) {
    if (!token) {
      return NextResponse.redirect(new URL('/login?redirect=' + pathname, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/manager/:path*',
    '/dashboard/:path*',
    '/bookings/:path*',
    '/applications/:path*',
    '/contracts/:path*',
    '/payments/:path*',
    '/favorites/:path*',
    '/profile/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/reviews/:path*',
    '/settings/:path*',
    '/viewings/:path*',
    '/help/:path*',
  ],
};
