import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { queryDb } from '@/lib/db';

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

    // Use raw SQL in development to avoid prepared statement issues
    let notifications, unreadCount;
    
    if (process.env.NODE_ENV === 'development') {
      // Use native PostgreSQL client for development
      const notificationsQuery = `
        SELECT 
          n.*,
          ci.id as invitation_id,
          ci.status as invitation_status,
          ci.role as invitation_role,
          c.name as company_name,
          c.logo_url as company_logo,
          u.email as inviter_email
        FROM notifications n
        LEFT JOIN company_invitations ci ON n.id = ci."notificationId"
        LEFT JOIN companies c ON ci."companyId" = c.id
        LEFT JOIN auth.users u ON ci."invitedBy" = u.id
        WHERE n."userId" = $1 ${unreadOnly ? 'AND n.read = false' : ''}
        ORDER BY n."createdAt" DESC
        LIMIT $2 OFFSET $3
      `;
      
      const countQuery = `
        SELECT COUNT(*) as count
        FROM notifications
        WHERE "userId" = $1 AND read = false
      `;
      
      const [notificationResults, countResults] = await Promise.all([
        queryDb(notificationsQuery, [user.id, limit, offset]),
        queryDb(countQuery, [user.id])
      ]);
      
      notifications = notificationResults;
      unreadCount = Number(countResults[0]?.count || 0);
    } else {
      // Use Prisma ORM in production
      [notifications, unreadCount] = await Promise.all([
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
    }

    // Format notifications for frontend
    const formattedNotifications = notifications.map((notification: any) => {
      if (process.env.NODE_ENV === 'development') {
        // Format raw SQL results
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
          // Add related invitation data from raw SQL
          invitation: notification.invitation_id ? {
            id: notification.invitation_id,
            status: notification.invitation_status,
            role: notification.invitation_role,
            company: {
              name: notification.company_name,
              logo_url: notification.company_logo,
            },
            inviter: {
              email: notification.inviter_email,
            },
          } : null,
        };
      } else {
        // Format ORM results
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
      }
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
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
    let result;
    if (process.env.NODE_ENV === 'development') {
      // Use native PostgreSQL client for development
      const updateQuery = `
        UPDATE notifications 
        SET read = true 
        WHERE "userId" = $1 AND read = false
      `;
      await queryDb(updateQuery, [user.id]);
      result = { count: 1 }; // Approximate for response
    } else {
      // Use ORM in production
      result = await prisma.notifications.updateMany({
        where: {
          userId: user.id,
          read: false,
        },
        data: {
          read: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        updated_count: process.env.NODE_ENV === 'development' ? result : result.count,
      },
    });

  } catch (error) {
    console.error('Error marking notifications as read:', error);
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