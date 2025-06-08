// src/app/api/company/[companyId]/users/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Route } from 'next';

/**
 * DELETE /api/company/[companyId]/users/[userId]
 * Removes `userId` from the company in `company_users`.
 * Only owners/admins of that company are allowed.
 */
type RouteCtx = { params: Promise<{ companyId: string; userId: string }> };
export async function DELETE(
  req: NextRequest,
  { params }:  RouteCtx 
) {
  const { companyId, userId } = await params;

  /* 1. Grab and verify the bearer token */
  const bearer = req.headers.get('authorization') ?? '';
  const token  = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,                // server-only
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authErr
  } = await supabase.auth.getUser(token);

  if (authErr || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  /* 2. Ensure caller is owner/admin of the company */
  const { data: roleRow, error: roleErr } = await supabase
    .from('company_users')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (roleErr || !roleRow || !['owner', 'admin'].includes(roleRow.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  /* 3. Remove the target user from the company */
  const { error: delErr } = await supabase
    .from('company_users')
    .delete()
    .eq('company_id', companyId)
    .eq('user_id', userId);

  if (delErr) {
    console.error('Delete failed:', delErr.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
