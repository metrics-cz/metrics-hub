import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
   const { companyId } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // 2) Check if user has access via company_users table
  const { data: access, error: accessError } = await supabase
    .from('company_users')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (accessError || !access) {
    return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
  }

  // 3) Fetch the company data
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .single();

  if (companyError || !company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  return NextResponse.json(company);
}
