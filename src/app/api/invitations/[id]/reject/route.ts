import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// POST endpoint for rejecting a company invitation
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

    // Reject the invitation - use transaction for consistency
    await prisma.$transaction(async (tx) => {
      // Update invitation status
      await tx.company_invitations.update({
        where: { id: invitationId },
        data: {
          status: 'rejected',
        },
      });

      // Update notification if it exists
      if (invitation.notificationId) {
        await tx.notifications.update({
          where: { id: invitation.notificationId },
          data: {
            read: true,
            title: `Declined invitation`,
            message: `You declined the invitation to join the company.`,
            type: 'invitation_rejected',
          },
        });
      }

      // Create notification for inviter
      await tx.notifications.create({
        data: {
          userId: invitation.invitedBy,
          type: 'invitation_rejected',
          title: 'Invitation Declined',
          message: `${user.email} declined your invitation to join the company.`,
          data: {
            companyId: invitation.companyId,
            companyName: 'Company',
            rejectedBy: user.email,
            role: invitation.role,
          },
          actionUrl: `/companies/${invitation.companyId}/users`,
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation rejected successfully',
      data: {
        company_id: invitation.companyId,
        company_name: 'Company',
      },
    });

  } catch (error) {
    console.error('Error rejecting invitation:', error);
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