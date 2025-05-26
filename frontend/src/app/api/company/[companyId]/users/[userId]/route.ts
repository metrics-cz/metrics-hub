import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { companyId: string; userId: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const decoded = await getAuth().verifyIdToken(token);
    const requestingUserId = decoded.uid;

    // Optionally validate that `requestingUserId` has admin rights
    // You can fetch the company or user doc and check role/permissions here

    const userRef = adminDb.collection('users').doc(params.userId);

    await userRef.update({
      companies: FieldValue.arrayRemove(params.companyId),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error removing user from company:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
