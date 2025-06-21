import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// GET endpoint for fetching invitation details
export async function GET(
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
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo_url: true,
          },
        },
        inviter: {
          select: {
            email: true,
            raw_user_meta_data: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found', code: 'INVITATION_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Check if invitation has expired
    const isExpired = invitation.expiresAt < new Date();
    if (isExpired && invitation.status === 'pending') {
      // Mark as expired
      await prisma.company_invitations.update({
        where: { id: invitationId },
        data: { status: 'expired' },
      });
      invitation.status = 'expired' as any;
    }

    // Format response
    const formattedInvitation = {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      message: invitation.message,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      isExpired,
      company: invitation.company,
      inviter: {
        email: invitation.inviter?.email,
        name: (invitation.inviter?.raw_user_meta_data as any)?.full_name || invitation.inviter?.email,
      },
    };

    return NextResponse.json({
      success: true,
      data: formattedInvitation,
    });

  } catch (error) {
    console.error('Error fetching invitation:', error);
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