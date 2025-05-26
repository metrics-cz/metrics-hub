import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb as db } from '@/lib/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const tokenHeader = req.headers.get('authorization')?.split('Bearer ')[1];
  if (!tokenHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { token } = await req.json();
  const decoded = await getAuth().verifyIdToken(tokenHeader);
  const userId = decoded.uid;

  const inviteRef = db.collection('companyInvites').doc(token);
  const inviteSnap = await inviteRef.get();

  if (!inviteSnap.exists) return NextResponse.json({ error: 'Invalid token' }, { status: 400 });

  const invite = inviteSnap.data()!;
  const now = new Date();
  if (invite.expiresAt.toDate() < now) return NextResponse.json({ error: 'Invite expired' }, { status: 400 });

  // Add user to company
  const userRef = db.collection('users').doc(userId);
  await userRef.set(
    {
      companies: FieldValue.arrayUnion(invite.companyId),
    },
    { merge: true }
  );

  await inviteRef.delete();

  return NextResponse.json({ success: true });
}
import * as React from 'react';

export default async function Page() {
    return <div />;
}