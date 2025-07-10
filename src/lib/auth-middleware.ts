import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthenticatedUser {
  id: string;
  email?: string;
  aud: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

/**
 * Middleware to authenticate API requests using Supabase
 * Validates Bearer token or session cookie
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');

    // If no bearer token, try to get from cookie
    if (!token) {
      const cookieStore = await cookies();
      const sessionCookie = cookieStore.get('sb-access-token');
      token = sessionCookie?.value;
    }

    if (!token) {
      return {
        success: false,
        error: 'No authentication token provided'
      };
    }

    // Create Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: async (name: string) => {
            const cookieStore = await cookies();
            return cookieStore.get(name)?.value;
          },
          set: async () => {
            // No-op for auth middleware
          },
          remove: async () => {
            // No-op for auth middleware
          },
        },
      }
    );

    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return {
        success: false,
        error: 'Invalid or expired token'
      };
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        aud: user.aud,
        role: user.user_metadata?.role
      }
    };

  } catch (error) {
    console.error('Authentication middleware error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Middleware to check if user has access to a specific company
 */
export async function authorizeCompanyAccess(
  userId: string, 
  companyId: string,
  requiredRoles: string[] = ['member', 'admin', 'owner', 'superadmin']
): Promise<{ success: boolean; role?: string; error?: string }> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: async () => undefined,
          set: async () => {},
          remove: async () => {},
        },
      }
    );

    const { data, error } = await supabase
      .from('company_users')
      .select('role')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'User not found in company'
      };
    }

    if (!requiredRoles.includes(data.role)) {
      return {
        success: false,
        error: 'Insufficient permissions'
      };
    }

    return {
      success: true,
      role: data.role
    };

  } catch (error) {
    console.error('Company authorization error:', error);
    return {
      success: false,
      error: 'Authorization failed'
    };
  }
}

/**
 * Rate limiting using in-memory store (should be replaced with Redis in production)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(
  key: string, 
  limit: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    // Initialize or reset the count
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (current.count >= limit) {
    return { success: false, remaining: 0, resetTime: current.resetTime };
  }

  current.count++;
  return { success: true, remaining: limit - current.count, resetTime: current.resetTime };
}

/**
 * Utility function to create authentication error responses
 */
export function createAuthErrorResponse(message: string, status: number = 401): NextResponse {
  return NextResponse.json(
    { error: message },
    { status }
  );
}

/**
 * Higher-order function to wrap API handlers with authentication
 */
export function withAuth(
  handler: (request: NextRequest, context: { user: AuthenticatedUser; params?: any }) => Promise<NextResponse>,
  options: {
    requiredRole?: string[];
    companyAccess?: boolean;
    rateLimit?: { limit: number; windowMs: number };
  } = {}
) {
  return async (request: NextRequest, context?: { params?: any }) => {
    // Rate limiting
    if (options.rateLimit) {
      const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                       request.headers.get('x-real-ip') || 
                       'unknown';
      const rateLimitResult = rateLimit(
        `${clientIP}:${request.nextUrl.pathname}`,
        options.rateLimit.limit,
        options.rateLimit.windowMs
      );
      
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': options.rateLimit.limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
            }
          }
        );
      }
    }

    // Authentication
    const authResult = await authenticateRequest(request);
    if (!authResult.success || !authResult.user) {
      return createAuthErrorResponse(authResult.error || 'Authentication required');
    }

    // Company access check
    if (options.companyAccess && context?.params?.companyId) {
      const companyAuth = await authorizeCompanyAccess(
        authResult.user.id,
        context.params.companyId,
        options.requiredRole
      );
      
      if (!companyAuth.success) {
        return NextResponse.json(
          { error: companyAuth.error },
          { status: 403 }
        );
      }
    }

    return handler(request, { user: authResult.user, params: context?.params });
  };
}