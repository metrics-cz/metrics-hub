import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// Create Supabase client for admin functions (for email sending)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, 
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Email validation function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Rate limiting helper
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, []);
  }

  const requests = rateLimitMap.get(userId);
  const recentRequests = requests.filter((timestamp: number) => timestamp > windowStart);

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(userId, recentRequests);
  return true;
}

// POST endpoint for sending company invitations
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (still using Supabase for auth)
    const supabase = createServerComponentClient({ cookies });
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check rate limit for this user
    if (!checkRateLimit(currentUser.id)) {
      return NextResponse.json(
        {
          error: 'Too many invitations sent. Please wait a moment.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const { email, companyId, role = 'member', message } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', code: 'EMAIL_REQUIRED' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required', code: 'COMPANY_ID_REQUIRED' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'superadmin', 'admin', 'member'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified', code: 'INVALID_ROLE' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
      // Check if current user has permission to invite to this company using Prisma
      const userCompany = await prisma.company_users.findFirst({
        where: {
          user_id: currentUser.id,
          company_id: companyId,
        },
        include: {
          companies: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!userCompany) {
        return NextResponse.json(
          {
            error: 'You do not have permission to invite users to this company',
            code: 'INSUFFICIENT_PERMISSIONS',
          },
          { status: 403 }
        );
      }

      // Check if user has admin/owner role to send invitations
      if (!['admin', 'owner', 'superadmin'].includes(userCompany.role)) {
        return NextResponse.json(
          { error: 'Only admins, superadmins and owners can send company invitations', code: 'INSUFFICIENT_ROLE' },
          { status: 403 }
        );
      }

      // Get user by email from auth.users table using Prisma
      const inviteeUser = await prisma.users.findFirst({
        where: {
          email: normalizedEmail,
        },
        select: {
          id: true,
          email: true,
        },
      });

      if (!inviteeUser) {
        return NextResponse.json(
          {
            error: 'User with this email does not exist in the app',
            code: 'USER_NOT_FOUND',
            suggestion: 'The user needs to register first before they can be invited to a company',
          },
          { status: 404 }
        );
      }

      // Check if user is already a member of this company using Prisma
      const existingMember = await prisma.company_users.findFirst({
        where: {
          user_id: inviteeUser.id,
          company_id: companyId,
        },
        select: {
          id: true,
          role: true,
        },
      });

      if (existingMember) {
        return NextResponse.json(
          {
            error: 'User is already a member of this company',
            code: 'ALREADY_MEMBER',
            current_role: existingMember.role,
          },
          { status: 409 }
        );
      }

      // Check for existing pending invitations using Prisma
      const existingInvitation = await prisma.company_invitations.findFirst({
        where: {
          userId: inviteeUser.id,
          companyId: companyId,
          status: 'pending',
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'User already has a pending invitation to this company', code: 'INVITATION_PENDING' },
          { status: 409 }
        );
      }

      // Create company invitation record using Prisma
      const invitation = await prisma.company_invitations.create({
        data: {
          email: normalizedEmail,
          userId: inviteeUser.id,
          companyId: companyId,
          invitedBy: currentUser.id,
          role: role as any, // Type assertion for enum
          message: message,
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        include: {
          company: {
            select: {
              name: true,
            },
          },
          inviter: {
            select: {
              email: true,
            },
          },
        },
      });

      // Send notification email via Supabase Edge Function or your email service
      try {
        // Get company name safely
        const companyName = invitation.company?.name || 'the company';
        const inviterEmail = invitation.inviter?.email || 'Someone';

        const emailData = {
          to: normalizedEmail,
          subject: `Invitation to join ${companyName}`,
          html: `
            <h2>You're invited to join ${companyName}!</h2>
            <p>Hi there!</p>
            <p>${inviterEmail} has invited you to join <strong>${companyName}</strong> as a ${role}.</p>
            ${message ? `<p><strong>Personal message:</strong><br>${message}</p>` : ''}
            <p>
              <a href="${process.env.NEXT_PUBLIC_SITE_URL}/invitations/${invitation.id}"
                 style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Accept Invitation
              </a>
            </p>
            <p><small>This invitation expires in 7 days.</small></p>
          `,
          invitation_id: invitation.id,
        };

        const { error: emailError } = await supabaseAdmin.functions.invoke('send-company-invitation', {
          body: emailData,
        });

        if (emailError) {
          console.error('Email sending failed:', emailError);
          // Don't fail the whole request if email fails
        }
      } catch (emailError) {
        console.error('Email service error:', emailError);
        // Continue without failing the request
      }

      // Success response
      console.log(`Company invitation sent to: ${normalizedEmail} for company: ${companyId}`);

      return NextResponse.json({
        success: true,
        message: 'Company invitation sent successfully',
        data: {
          invitation_id: invitation.id,
          email: invitation.email,
          company_name: invitation.company?.name || 'Unknown Company',
          role: invitation.role,
          expires_at: invitation.expiresAt,
          invited_by: invitation.inviter?.email || 'Unknown User',
        },
      }, { status: 200 });

    } catch (prismaError) {
      console.error('Prisma database error:', prismaError);
      return NextResponse.json(
        { error: 'Database error occurred', code: 'DATABASE_ERROR' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Unexpected server error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}