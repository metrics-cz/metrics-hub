import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';

// Create the internationalization middleware
const intlMiddleware = createMiddleware(routing);

// Protected routes
const protectedRoutes = ['/dashboard', '/companies', '/profile', '/settings'];
const protectedApiRoutes = [
  '/api/company',
  '/api/applications',
  '/api/automations',
  '/api/integrations',
  '/api/invite',
];
const publicRoutes = [
  '/auth',
  '/auth/sign-in',
  '/auth/sign-up',
  '/auth/reset-password',
  '/',
];

async function authMiddleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;
  const pathWithoutLocale = pathname.replace(/^\/(en|cz)/, '') || '/';

  const isProtectedRoute = protectedRoutes.some((route) =>
    pathWithoutLocale.startsWith(route)
  );
  const isProtectedApiRoute = protectedApiRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isPublicRoute = publicRoutes.some(
    (route) => pathWithoutLocale === route || pathWithoutLocale.startsWith(route)
  );

  if (isPublicRoute && !isProtectedRoute && !isProtectedApiRoute) return null;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name: string) => request.cookies.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (isProtectedApiRoute && !session) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (token) {
        const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
        if (!tokenError && user) return null;
      }

      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth/sign-in', request.url);
      redirectUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(redirectUrl);
    }

    if (session && (pathWithoutLocale.startsWith('/auth') || pathWithoutLocale === '/')) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (isProtectedApiRoute) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth/sign-in', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return null;
}

export default async function middleware(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse) return authResponse;

  // Skip internationalization middleware for API routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const response = isApiRoute ? NextResponse.next() : (intlMiddleware(request) || NextResponse.next());

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // CSP mode - now using production-compatible settings

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // Allow Next.js inline scripts for production compatibility
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      // Allow Google Fonts and inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      // Allow Google Fonts domains
      "font-src 'self' https://fonts.gstatic.com https://fonts.googleapis.com",
      // Allow Supabase and other necessary API connections
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.vercel.com",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  if (request.nextUrl.protocol === 'https:') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)', '/api/(.*)'],
};
