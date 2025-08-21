import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthContext } from '@/lib/auth-middleware';
import prisma from '@/lib/prisma';
import { auditLogger } from '@/lib/audit-logger';

async function handleBulkNotificationOperations(request: NextRequest, context: AuthContext) {
  try {
    const { operation, notificationIds } = await request.json();
    const userId = context.user.id;

    if (!operation || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Invalid request. Requires operation and notificationIds array' },
        { status: 400 }
      );
    }

    let affectedCount = 0;

    try {
      switch (operation) {
        case 'mark_read':
          if (notificationIds.length === 0) {
            // Mark all unread notifications as read for this user
            const result = await prisma.notifications.updateMany({
              where: {
                userId: userId,
                read: false,
              },
              data: {
                read: true,
              },
            });
            affectedCount = result.count;
          } else {
            // Mark specific notifications as read
            const result = await prisma.notifications.updateMany({
              where: {
                id: { in: notificationIds },
                userId: userId,
              },
              data: {
                read: true,
              },
            });
            affectedCount = result.count;
          }
          break;

        case 'delete':
          // Bulk delete notifications (only user's own notifications for security)
          const deleteResult = await prisma.notifications.deleteMany({
            where: {
              id: { in: notificationIds },
              userId: userId,
            },
          });
          affectedCount = deleteResult.count;
          break;

        default:
          return NextResponse.json(
            { error: 'Unsupported operation. Use mark_read or delete' },
            { status: 400 }
          );
      }
    } catch (error) {
      console.error('Prisma operation error:', error);
      return NextResponse.json(
        { error: `Failed to ${operation} notifications` },
        { status: 500 }
      );
    }

    // Log the bulk operation
    await auditLogger.logAuditEvent({
      table_name: 'notifications',
      operation: operation === 'mark_read' ? 'UPDATE' : 'DELETE',
      user_id: userId,
      metadata: {
        action: `bulk_${operation}`,
        notification_count: affectedCount,
        specific_ids: notificationIds.length > 0 ? notificationIds : 'all'
      }
    });

    return NextResponse.json({
      success: true,
      operation,
      affectedCount,
      message: `Successfully ${operation === 'mark_read' ? 'marked as read' : 'deleted'} ${affectedCount} notifications`
    });

  } catch (error) {
    console.error('Bulk notification operation error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk notification operation' },
      { status: 500 }
    );
  }
}

// Export with authentication middleware
export const POST = withAuth(handleBulkNotificationOperations);