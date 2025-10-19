import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createClient } from '@supabase/supabase-js';
import {
  companyUserMiniSchema,
  type CompanyUserMini,
} from '@/lib/validation/companyUserMiniSchema';

type ParamsCtx = { params: Promise<{ companyId: string }> };

export async function GET(req: NextRequest, { params }: ParamsCtx) {
  /* ── Bearer token check (Supabase Auth) ─────────────────── */
  const auth = req.headers.get('authorization') ?? '';
  const jwt  = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: { user } } = await sb.auth.getUser(jwt);
  if (!user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  /* ── Data fetch (Active users + Pending invitations) ───────── */
  const { companyId } = await params;

  // Fetch active users and pending invitations
  const [rawRows, pendingInvitations] = await Promise.all([
    prisma.$queryRaw`
      SELECT
        cu.company_id,
        cu.role,
        cu.user_id                                    AS id,
        au.email,
        (au.raw_user_meta_data ->> 'full_name')       AS full_name,
        (au.raw_user_meta_data ->> 'avatar_url')      AS avatar_url,
        au.last_sign_in_at,
        'active'                                      AS status
      FROM public.company_users cu
      JOIN auth.users           au ON au.id = cu.user_id
      WHERE cu.company_id = ${companyId}::uuid
    `,
    prisma.$queryRaw`
      SELECT
        ci."companyId"                                AS company_id,
        ci.role,
        ci.id,
        ci.email,
        ''                                            AS full_name,
        NULL                                          AS avatar_url,
        NULL                                          AS last_sign_in_at,
        'pending'                                     AS status
      FROM public.company_invitations ci
      WHERE ci."companyId" = ${companyId}::uuid 
      AND ci.status = 'pending'
      AND ci."expiresAt" > NOW()
    `
  ]);

  // Combine both result sets - ensure they are arrays
  const allRows = [
    ...(Array.isArray(rawRows) ? rawRows : []),
    ...(Array.isArray(pendingInvitations) ? pendingInvitations : [])
  ];

  /* ── Validate + map once with Zod ───────────────────────── */
  const parsed = companyUserMiniSchema.array().safeParse(allRows);
  if (!parsed.success) {
    console.warn('company_user_mini route: invalid rows skipped', parsed.error instanceof Error ? parsed.error.issues : parsed.error);
  }

  const result: CompanyUserMini[] = (parsed.success ? parsed.data : []).map(
    ({ id, email, full_name, avatar_url, last_sign_in_at, role, status }) => ({
      id,
      email,
      fullName  : full_name ?? '',
      avatarUrl : avatar_url,
      lastSignIn: last_sign_in_at,
      role,
      status: status || 'active',
    })
  );

  return NextResponse.json(result);
}