import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/firebaseAdmin';
import { v4 as uuidv4 } from 'uuid';
import { sendInvitationEmail } from '@/lib/email/sendInvitationEmail'; // implement using nodemailer or Resend

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { companyId, email, role } = body;

  const inviteId = uuidv4();
  const inviteDoc = db.collection('companyInvites').doc(inviteId);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h expiry

  await inviteDoc.set({
    companyId,
    email,
    role,
    createdAt: new Date(),
    expiresAt,
  });

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${inviteId}`;
  await sendInvitationEmail(email, inviteLink); // send the email

  return NextResponse.json({ success: true });
}