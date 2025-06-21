import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// POST endpoint for accepting a company invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const { id: invitationId } = await params;

    // Find the invitation
    const invitation = await prisma.company_invitations.findFirst({
      where: {
        id: invitationId,
        userId: user.id,
        status: 'pending',
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        inviter: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found or already processed', code: 'INVITATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      // Mark as expired
      await prisma.company_invitations.update({
        where: { id: invitationId },
        data: { status: 'expired' },
      });

      return NextResponse.json(
        { error: 'Invitation has expired', code: 'INVITATION_EXPIRED' },
        { status: 410 }
      );
    }

    // Check if user is already a member
    const existingMember = await prisma.company_users.findFirst({
      where: {
        user_id: user.id,
        company_id: invitation.companyId,
      },
    });

    if (existingMember) {
      // Update invitation as accepted anyway
      await prisma.company_invitations.update({
        where: { id: invitationId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      return NextResponse.json(
        {
          error: 'You are already a member of this company',
          code: 'ALREADY_MEMBER',
          data: {
            company_id: invitation.companyId,
            current_role: existingMember.role,
          },
        },
        { status: 409 }
      );
    }

    // Accept the invitation - use transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.company_invitations.update({
        where: { id: invitationId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      // Add user to company
      await tx.company_users.create({
        data: {
          user_id: user.id,
          company_id: invitation.companyId,
          role: invitation.role,
        },
      });

      // Update notification if it exists
      if (invitation.notificationId) {
        await tx.notifications.update({
          where: { id: invitation.notificationId },
          data: {
            read: true,
            title: `Joined company`,
            message: `You successfully joined the company as a ${invitation.role}.`,
            type: 'user_joined_company',
          },
        });
      }

      // Create notification for inviter
      await tx.notifications.create({
        data: {
          userId: invitation.invitedBy,
          type: 'invitation_accepted',
          title: 'Invitation Accepted',
          message: `${user.email} accepted your invitation to join the company.`,
          data: {
            companyId: invitation.companyId,
            companyName: 'Company',
            acceptedBy: user.email,
            role: invitation.role,
          },
          actionUrl: `/companies/${invitation.companyId}/users`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        company_id: invitation.companyId,
        company_name: 'Company',
        role: invitation.role,
        redirect_url: `/en/companies/${invitation.companyId}`,
      },
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
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