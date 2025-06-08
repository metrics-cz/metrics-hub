// src/app/api/accept-invite/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const tokenHeader = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!tokenHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser(tokenHeader)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const { token } = await req.json() as { token: string }

  // TODO: move invites into a new table `company_invites`
  const { data: invite, error: inviteErr } = await supabase
    .from('company_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (inviteErr || !invite) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 400 })
  }

  // 1. Add the user to the company
  await supabase.from('company_users').insert({
    company_id: invite.company_id,
    user_id: user.id,
    role: invite.role ?? 'member'
  })

  // 2. Delete the invite
  await supabase.from('company_invites').delete().eq('token', token)

  return NextResponse.json({ success: true })
}
