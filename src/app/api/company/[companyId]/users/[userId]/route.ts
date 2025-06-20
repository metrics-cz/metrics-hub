// src/app/api/company/[companyId]/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';  // Import the Prisma client
import { supabase } from '@/lib/supabaseClient';

/**
 * DELETE /api/company/[companyId]/users/[userId]
 * Removes `userId` from the company in `company_users`.
 * Only owners/admins of that company are allowed.
 */
type RouteCtx = { params: Promise<{ companyId: string; userId: string }> };

export async function DELETE(
  req: NextRequest,
  { params }: RouteCtx
) {
  const { companyId, userId } = await params;

  /* 1. Grab and verify the bearer token */
  const bearer = req.headers.get('authorization') ?? '';
  const token = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  /* 2. Ensure caller is owner/admin of the company */
  const roleRow = await prisma.company_users.findUnique({
    where: {
      company_id_user_id: {
        company_id: companyId,
        user_id: user.id,
      },
    },
    select: {
      role: true,
    },
  });

  if (!roleRow || !['owner', 'admin'].includes(roleRow.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  /* 3. Remove the target user from the company */
  try {
    const deleteResult = await prisma.company_users.deleteMany({
      where: {
        company_id: companyId,
        user_id: userId,
      },
    });

    if (deleteResult.count === 0) {
      return NextResponse.json({ error: 'User not found or already removed' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (delErr) {
    console.error('Delete failed:', delErr.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
