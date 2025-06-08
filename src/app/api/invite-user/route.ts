import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { sendInvitationEmail } from '@/lib/email/sendInvitationEmail';   // uses Resend/Nodemailer

type Body = {
  companyId: string;
  email    : string;
  role     : 'member' | 'admin';
};

export async function POST(req: NextRequest) {
  /* ------------------------------------------------------------- 1. Parse body */
  let body: Body;
  try {
    body = await req.json() as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { companyId, email, role } = body;
  if (!companyId || !email || !role) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  /* --------------------------------------------------- 2. Verify access token */
  const bearer = req.headers.get('authorization') ?? '';
  const token  = bearer.startsWith('Bearer ') ? bearer.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,             // server-only
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const {
    data: { user },
    error: authErr
  } = await supabase.auth.getUser(token);

  if (authErr || !user)
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });

  /* ------------------------ 3. Ensure caller is owner/admin of that company */
  const { data: roleRow, error: roleErr } = await supabase
    .from('company_users')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .single();

  if (roleErr || !roleRow || !['owner', 'admin'].includes(roleRow.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  /* ----------------------------------------------------------- 4. Create invite */
  const inviteId  = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);   // 24 h

  const { error: insertErr } = await supabase
    .from('company_invites')
    .insert({
      id         : inviteId,
      company_id : companyId,
      email,
      role,
      created_at : new Date().toISOString(),
      expires_at : expiresAt.toISOString(),
      accepted_at: null
    });

  if (insertErr) {
    console.error('Insert invite failed:', insertErr.message);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  /* ------------------------------------------------------------- 5. Send e-mail */
  const inviteLink =
    `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${inviteId}`;

  try {
    await sendInvitationEmail(email, inviteLink);
  } catch (e) {
    console.error('E-mail failed:', e);
    // if you want to invalidate the invite on failure, delete it here
    return NextResponse.json({ error: 'Email send failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
