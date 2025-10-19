import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { createServerClient } from '@supabase/ssr';
import { generateNonce, generateCSPHeader } from './lib/csp-utils';

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

    // For protected API routes, check Bearer token first
    if (isProtectedApiRoute) {
      const authHeader = request.headers.get('authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (token) {
        const { data: { user }, error: tokenError } = await supabase.auth.getUser(token);
        if (!tokenError && user) return null;
      }

      // If no valid Bearer token, try to get user from cookies
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!userError && user) return null;

      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // For protected routes, securely verify user authentication
    if (isProtectedRoute) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        const redirectUrl = new URL('/auth', request.url);
        redirectUrl.searchParams.set('redirectTo', pathname);
        return NextResponse.redirect(redirectUrl);
      }
    }

    // Check if authenticated user is trying to access auth pages
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (!userError && user && (pathWithoutLocale.startsWith('/auth') || pathWithoutLocale === '/')) {
      const dashboardUrl = new URL('/dashboard', request.url);
      return NextResponse.redirect(dashboardUrl);
    }

  } catch (error) {
    console.error('Auth middleware error:', error);

    if (isProtectedApiRoute) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
    }

    if (isProtectedRoute) {
      const redirectUrl = new URL('/auth', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return null;
}

export default async function middleware(request: NextRequest) {
  const authResponse = await authMiddleware(request);
  if (authResponse) return authResponse;

  // Generate nonce for CSP
  const nonce = generateNonce();

  // Skip internationalization middleware for API routes
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/');
  const response = isApiRoute ? NextResponse.next() : (intlMiddleware(request) || NextResponse.next());

  // Add nonce to response headers for use in components
  response.headers.set('X-CSP-Nonce', nonce);

  // Security headers - allow iframe embedding for plugin playground routes only
  const isPluginPlaygroundRoute = request.nextUrl.pathname.startsWith('/api/plugin-playground/');
  response.headers.set('X-Frame-Options', isPluginPlaygroundRoute ? 'SAMEORIGIN' : 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Environment-specific CSP configuration
  const isDevelopment = process.env.NODE_ENV === 'development';
  const cspHeader = generateCSPHeader(isDevelopment, nonce);
  
  response.headers.set('Content-Security-Policy', cspHeader);

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
