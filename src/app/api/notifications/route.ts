import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

// GET endpoint for fetching user notifications
export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    // Build where clause
    const where: any = {
      userId: user.id,
    };

    if (unreadOnly) {
      where.read = false;
    }

    // Fetch notifications and unread count
    const [notifications, unreadCount] = await Promise.all([
      prisma.notifications.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip: offset,
        include: {
          company_invitations: {
            include: {
              company: {
                select: {
                  name: true,
                  logo_url: true,
                },
              },
              inviter: {
                select: {
                  email: true,
                },
              },
            },
          },
        },
      }),
      // Get unread count
      prisma.notifications.count({
        where: {
          userId: user.id,
          read: false,
        },
      }),
    ]);

    // Format notifications for frontend
    const formattedNotifications = notifications.map((notification: any) => {
      return {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        read: notification.read,
        actionUrl: notification.actionUrl,
        createdAt: notification.createdAt,
        expiresAt: notification.expiresAt,
        // Add related invitation data if available
        invitation: notification.company_invitations[0] ? {
          id: notification.company_invitations[0].id,
          status: notification.company_invitations[0].status,
          role: notification.company_invitations[0].role,
          company: notification.company_invitations[0].company,
          inviter: notification.company_invitations[0].inviter,
        } : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications: formattedNotifications,
        unread_count: unreadCount,
        pagination: {
          limit,
          offset,
          has_more: notifications.length === limit,
        },
      },
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
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

// PATCH endpoint for marking all notifications as read
export async function PATCH(request: NextRequest) {
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

    // Mark all notifications as read
    const result = await prisma.notifications.updateMany({
      where: {
        userId: user.id,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updated_count: result.count,
      },
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
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