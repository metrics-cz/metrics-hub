// src/app/api/company/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';               // ← Prisma client

interface CompanyInput {
  name: string;
  billingEmail?: string;
}

export async function POST(request: NextRequest) {
  /*──────────────────  Verify the bearer token with Supabase Auth */
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Missing or invalid Authorization header' },
      { status: 401 }
    );
  }
  const token = authHeader.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,     // ✓ anon key is enough
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  const uid = user.id;
  const userEmail = user.email ?? '';

  /*──────────────────  Parse and validate body */
  let body: CompanyInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (name.length < 2) {
    return NextResponse.json(
      { error: 'Company name must be at least 2 characters' },
      { status: 400 }
    );
  }

  const billingEmail = (body.billingEmail ?? userEmail).toLowerCase();
  const companyId = uuid();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.companies.create({
        data: {
          id: companyId,
          name,
          billing_email: billingEmail,
          owner_uid: uid,
          // plan, created_at, active, logo_url use defaults
        },
      });

      await tx.company_users.create({
        data: {
          company_id: companyId,
          user_id: uid,
          role: 'owner',
        },
      });
    });

    return NextResponse.json({ companyId }, { status: 201 });
  } catch (e: any) {
    /* Unique-violation handling */
    if (e.code === 'P2002' && e.meta?.target?.includes('billing_email')) {
      return NextResponse.json(
        { error: 'Billing e-mail already used by another company' },
        { status: 409 }        // HTTP 409 Conflict
      );
    }

    console.error('Error creating company:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* Stub – implement as needed */
export async function DELETE(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
