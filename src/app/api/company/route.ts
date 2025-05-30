import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { createClient } from '@supabase/supabase-js';

interface CompanyInput {
  name: string;
  billingEmail?: string;
}

export async function POST(request: NextRequest) {
  // 1) Get the Supabase token from the Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  // 2) Initialize Supabase client (client-side usage with service role not needed)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  // 3) Verify user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  const uid = user.id;
  const userEmail = user.email ?? '';

  // 4) Parse and validate body
  let body: CompanyInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = (body.name ?? '').trim();
  if (name.length < 2) {
    return NextResponse.json({ error: 'Company name is required and must be at least 2 characters' }, { status: 400 });
  }

  const billingEmail = (body.billingEmail ?? userEmail).toLowerCase();
  const companyId = uuid();

  // 5) Create the company
  const { error: companyError } = await supabase.from('companies').insert({
    id: companyId,
    name,
    billing_email: billingEmail,
    plan: 'free',
    owner_uid: uid,
    created_at: new Date().toISOString(),
    active: true,
    logo_url: null, // Optional, can be set later
  });

  if (companyError) {
    console.error('Error creating company:', companyError.message);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }

  // 6) Add user to company_users table
  const { error: roleError } = await supabase.from('company_users').insert({
    company_id: companyId,
    user_id: uid,
    role: 'owner',
  });

  if (roleError) {
    console.error('Error assigning role:', roleError.message);
    return NextResponse.json({ error: 'Failed to assign user to company' }, { status: 500 });
  }

  return NextResponse.json({ companyId }, { status: 201 });
}
