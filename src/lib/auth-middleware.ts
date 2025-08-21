/**
 * Standardized authentication middleware
 * Provides consistent auth patterns across the application
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServer';
import prisma from '@/lib/prisma';
// Simple error logging utility
function logError(error: any, context: string) {
  console.error(`[${context}]`, error instanceof Error ? error.message : String(error), error);
}

export interface AuthContext {
  user: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
  session: any;
}

export interface CompanyAuthContext extends AuthContext {
  company: {
    id: string;
    name: string;
    status: string;
  };
  userRole: string;
  hasAdminAccess: boolean;
}

// Authentication errors
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTH_ERROR',
    public statusCode: number = 401
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// Base authentication check
export async function authenticateUser(request: NextRequest): Promise<AuthContext> {
  try {
    console.log('Starting authentication check...');
    const supabase = await createSupabaseServerClient();
    console.log('Created Supabase client');
    
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log('Got user data:', { hasUser: !!user, error: error?.message });

    if (error || !user) {
      throw new AuthError('Authentication required', 'UNAUTHENTICATED', 401);
    }

    const sessionResult = await supabase.auth.getSession();
    console.log('Got session data:', { hasSession: !!sessionResult.data.session });

    return {
      user: {
        id: user.id,
        email: user.email!,
        full_name: user.user_metadata?.full_name,
        avatar_url: user.user_metadata?.avatar_url,
      },
      session: sessionResult,
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    logError(error, 'Authentication check failed');
    throw new AuthError('Authentication check failed', 'AUTH_CHECK_ERROR', 500);
  }
}

// Company-based authentication check
export async function authenticateCompanyUser(
  request: NextRequest,
  companyId: string,
  requiredRoles: string[] = ['member', 'admin', 'owner']
): Promise<CompanyAuthContext> {
  const authContext = await authenticateUser(request);

  try {
    // Check company exists and user has access
    const company = await prisma.companies.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        active: true,
      },
    });
    
    if (!company) {
      throw new AuthError('Company not found', 'COMPANY_NOT_FOUND', 404);
    }

    // Check user permission in company
    const permission = await prisma.company_users.findFirst({
      where: {
        company_id: companyId,
        user_id: authContext.user.id,
      },
      select: {
        role: true,
      },
    });

    if (!permission) {
      throw new AuthError(
        'Insufficient permissions for this company',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    // Check if user role is in required roles
    if (!requiredRoles.includes(permission.role)) {
      throw new AuthError(
        'Insufficient permissions for this operation',
        'INSUFFICIENT_PERMISSIONS',
        403
      );
    }

    return {
      ...authContext,
      company: {
        id: company.id,
        name: company.name,
        status: company.active ? 'active' : 'inactive',
      },
      userRole: permission.role,
      hasAdminAccess: ['admin', 'owner'].includes(permission.role),
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    
    logError(error, 'Company authentication check failed');
    throw new AuthError('Company access check failed', 'COMPANY_AUTH_ERROR', 500);
  }
}

// Admin-only authentication check
export async function authenticateAdmin(
  request: NextRequest,
  companyId: string
): Promise<CompanyAuthContext> {
  return authenticateCompanyUser(request, companyId, ['admin', 'owner']);
}

// Middleware wrapper for API routes
export function withAuth<T = any>(
  handler: (request: NextRequest, context: AuthContext, ...args: any[]) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    allowAnonymous?: boolean;
  } = {}
) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    const { requireAuth = true, allowAnonymous = false } = options;

    try {
      if (requireAuth && !allowAnonymous) {
        const authContext = await authenticateUser(request);
        return handler(request, authContext, ...args);
      } else {
        // Try to get auth context but don't fail if not authenticated
        let authContext: AuthContext | null = null;
        try {
          authContext = await authenticateUser(request);
        } catch (error) {
          if (!allowAnonymous) {
            throw error;
          }
        }
        return handler(request, authContext!, ...args);
      }
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
          },
          { status: error.statusCode }
        );
      }

      logError(error, 'Auth middleware error');
      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

// Middleware wrapper for company-based API routes
export function withCompanyAuth<T = any>(
  handler: (request: NextRequest, context: CompanyAuthContext, ...args: any[]) => Promise<NextResponse>,
  options: {
    requiredRoles?: string[];
    adminOnly?: boolean;
  } = {}
) {
  return async (request: NextRequest, context: { params: { companyId: string } }, ...args: any[]): Promise<NextResponse> => {
    const { requiredRoles = ['member', 'admin', 'owner'], adminOnly = false } = options;
    const { companyId } = context.params;

    try {
      const authContext = adminOnly 
        ? await authenticateAdmin(request, companyId)
        : await authenticateCompanyUser(request, companyId, requiredRoles);

      return handler(request, authContext, ...args);
    } catch (error) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
          },
          { status: error.statusCode }
        );
      }

      logError(error, 'Company auth middleware error');
      return NextResponse.json(
        {
          error: 'Internal server error',
          code: 'INTERNAL_ERROR',
        },
        { status: 500 }
      );
    }
  };
}

// Helper function to extract user ID from request
export async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const authContext = await authenticateUser(request);
    return authContext.user.id;
  } catch {
    return null;
  }
}

// Helper function to check if user is authenticated
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    await authenticateUser(request);
    return true;
  } catch {
    return false;
  }
}

// Helper function to get current user info
export async function getCurrentUser(request: NextRequest): Promise<AuthContext['user'] | null> {
  try {
    const authContext = await authenticateUser(request);
    return authContext.user;
  } catch {
    return null;
  }
}