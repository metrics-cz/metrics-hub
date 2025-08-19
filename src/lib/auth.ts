import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export interface AuthUser {
  id: string;
  email?: string;
  aud: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

/**
 * Unified authentication utility that handles both cookie and Bearer token authentication
 */
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Try Bearer token first (for API calls)
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.replace('Bearer ', '');

    if (bearerToken) {
      // Validate Bearer token
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get: () => undefined,
            set: () => {},
            remove: () => {},
          },
        }
      );

      const { data: { user }, error } = await supabase.auth.getUser(bearerToken);

      if (error || !user) {
        return {
          success: false,
          error: 'Invalid or expired Bearer token'
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
    }

    // Fallback to cookie-based authentication
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: async (name: string) => {
            return cookieStore.get(name)?.value;
          },
          set: async () => {},
          remove: async () => {},
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        success: false,
        error: 'No valid session found'
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
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

/**
 * Create authenticated Supabase client for server-side operations
 */
export async function createAuthenticatedClient(request: NextRequest) {
  const authResult = await authenticateRequest(request);
  
  if (!authResult.success || !authResult.user) {
    throw new Error(authResult.error || 'Authentication failed');
  }

  // Create service role client for authenticated operations
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get: () => undefined,
        set: () => {},
        remove: () => {},
      },
    }
  );

  return { supabase, user: authResult.user };
}

/**
 * Extract client IP and user agent from request
 */
export function extractClientInfo(request: NextRequest) {
  const ipAddress = 
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return { ipAddress, userAgent };
}

/**
 * Check if user has permission for company operations
 */
export async function checkCompanyPermission(
  userId: string,
  companyId: string,
  requiredRoles: string[] = ['member', 'admin', 'owner', 'superadmin']
): Promise<{ hasPermission: boolean; role?: string; error?: string }> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get: () => undefined,
          set: () => {},
          remove: () => {},
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
      console.error('Company permission check failed:', { error, userId, companyId });
      return {
        hasPermission: false,
        error: error ? `Database error: ${error instanceof Error ? error.message : String(error)}` : 'User not found in company'
      };
    }

    if (!requiredRoles.includes(data.role)) {
      return {
        hasPermission: false,
        error: 'Insufficient permissions'
      };
    }

    return {
      hasPermission: true,
      role: data.role
    };

  } catch (error) {
    console.error('Company permission check error:', error);
    return {
      hasPermission: false,
      error: 'Permission check failed'
    };
  }
}