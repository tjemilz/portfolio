/**
 * Next.js Middleware for route protection
 * Handles authentication checks and redirects
 * 
 * NOTE: La protection des routes admin et privées est gérée côté client
 * car les tokens sont stockés dans localStorage (pas accessible côté serveur)
 */

import { NextResponse } from 'next/server';

// Routes that should redirect authenticated users (like login page)
const AUTH_ROUTES = [
  '/login',
  '/register',
];

export function middleware(request) {
  const { pathname } = request.nextUrl;
  
  // Get the token from cookies (if available)
  const token = request.cookies.get('access_token')?.value;
  
  // Check if route is an auth route
  const isAuthRoute = AUTH_ROUTES.some(route => pathname.startsWith(route));
  
  // Redirect authenticated users away from auth pages
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  
  // Let all other routes through - protection is handled client-side
  return NextResponse.next();
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|bestof|bw|streets|explore|portrait.jpg).*)',
  ],
};
