// src/app/api/company/[companyId]/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

/* ──────────────────────── Zod validation ───────────────────────── */

const rowSchema = z.object({
  id              : z.string().uuid(),
  email           : z.string().email(),
  last_sign_in_at : z.coerce.date().nullable(),
  full_name       : z.string().nullable(),
  role            : z.string(),
});

/* shape returned to the frontend */
type UserMini = z.infer<typeof rowSchema>;

/* ───────────────────────── Route handler ───────────────────────── */

type RouteCtx = { params: Promise<{ companyId: string }> };

export async function GET(
  req: NextRequest,
  { params }: RouteCtx
) {
  const { companyId } = await params;                 // Next 15 async params
  const auth = req.headers.get('authorization');

  /* 1) Bearer token present? */
  const token = auth?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  /* 2) Supabase client _as that user_ (no Service-Role key!) */
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,        // safe, RLS protects data
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  /* 3) Query the secure view – RLS guarantees the caller     */
  /*    only sees rows for companies he/she belongs to.        */
  const { data, error } = await supabase
    .from('company_user_mini')                         // ← view created earlier
    .select('*')
    .eq('company_id', companyId);

  if (error) {
    console.error('GET company users:', error.message);
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    );
  }

  /* 4) Validate & map */
  const users: UserMini[] = [];
  for (const row of data) {
    const parsed = rowSchema.safeParse(row);
    if (!parsed.success) {
      console.warn('Invalid row skipped:', parsed.error.flatten());
      continue;
    }
    users.push(parsed.data);
  }

  return NextResponse.json(users);
}
