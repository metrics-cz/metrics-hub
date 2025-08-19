import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { sendInvitationEmail } from '@/lib/email/sendInvitationEmail';

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
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client and verify token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !currentUser) {
      console.error('Auth error:', authError);
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // Check rate limit
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
    if (!email || !companyId) {
      return NextResponse.json(
        { error: 'Email and company ID are required', code: 'MISSING_FIELDS' },
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

    // Check if current user has permission to invite to this company
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
        { error: 'Only admins and owners can send company invitations', code: 'INSUFFICIENT_ROLE' },
        { status: 403 }
      );
    }

    // Check if invitee exists in the system
    const inviteeUser = await prisma.users.findFirst({
      where: {
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
      },
    });

    // Check if user is already a member of this company
    if (inviteeUser) {
      const existingMember = await prisma.company_users.findFirst({
        where: {
          user_id: inviteeUser.id,
          company_id: companyId,
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

      // Check for existing pending invitations
      const existingInvitation = await prisma.company_invitations.findFirst({
        where: {
          userId: inviteeUser.id,
          companyId: companyId,
          status: 'pending',
        },
      });

      if (existingInvitation) {
        return NextResponse.json(
          { error: 'User already has a pending invitation to this company', code: 'INVITATION_PENDING' },
          { status: 409 }
        );
      }
    }

    const companyName = userCompany.companies?.name || 'the company';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let invitation;
    let notification = null;

    if (inviteeUser) {
      // User exists - create in-app notification and invitation
      await prisma.$transaction(async (tx) => {
        // Create invitation first
        invitation = await tx.company_invitations.create({
          data: {
            email: normalizedEmail,
            userId: inviteeUser.id,
            companyId: companyId,
            invitedBy: currentUser.id,
            role: role as any,
            message: message,
            status: 'pending',
            expiresAt,
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

        // Create notification linked to invitation
        notification = await tx.notifications.create({
          data: {
            userId: inviteeUser.id,
            type: 'company_invitation',
            title: `Invitation to join ${companyName}`,
            message: `You've been invited to join ${companyName} as a ${role}.`,
            data: {
              companyId,
              companyName,
              role,
              inviterEmail: currentUser.email,
              message: message || null,
              invitationId: invitation.id,
            },
            actionUrl: `/en/invitations/${invitation.id}`,
            expiresAt,
          },
        });

        // Update invitation with notification ID
        invitation = await tx.company_invitations.update({
          where: { id: invitation.id },
          data: { notificationId: notification.id },
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
      });


      return NextResponse.json({
        success: true,
        message: 'Invitation sent successfully via in-app notification',
        data: {
          invitation_id: (invitation as any)?.id,
          notification_id: (notification as any)?.id,
          email: (invitation as any)?.email,
          company_name: companyName,
          role: (invitation as any)?.role,
          expires_at: (invitation as any)?.expiresAt,
          type: 'in_app_notification',
        },
      }, { status: 200 });

    } else {
      // User doesn't exist - create invitation and send email
      // We'll create a placeholder user ID that will be updated when user registers
      const tempUserId = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID
      
      invitation = await prisma.company_invitations.create({
        data: {
          email: normalizedEmail,
          userId: tempUserId, // Placeholder that will be updated when user registers
          companyId: companyId,
          invitedBy: currentUser.id,
          role: role as any,
          message: message,
          status: 'pending',
          expiresAt,
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

      // Send email invitation
      try {
        await sendInvitationEmail({
          to: normalizedEmail,
          companyName,
          inviterEmail: currentUser.email || 'Someone',
          role,
          message,
          invitationId: invitation.id,
        });


        return NextResponse.json({
          success: true,
          message: 'Invitation sent successfully via email',
          data: {
            invitation_id: invitation.id,
            email: invitation.email,
            company_name: companyName,
            role: invitation.role,
            expires_at: invitation.expiresAt,
            type: 'email_invitation',
          },
        }, { status: 200 });

      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        
        // Delete the invitation if email fails
        await prisma.company_invitations.delete({
          where: { id: invitation.id },
        });

        return NextResponse.json(
          { error: 'Failed to send invitation email', code: 'EMAIL_FAILED' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('Unexpected server error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}