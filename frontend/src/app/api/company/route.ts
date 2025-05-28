import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb, adminAuth } from '@/lib/firebase/firebaseAdmin';

type Role = 'owner' | 'admin' | 'reader';

interface CompanyInput {
  name: string;
  billingEmail?: string;
}

export async function POST(request: NextRequest) {
  // 1) Extract and verify Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const idToken = authHeader.replace('Bearer ', '');
  let uid: string;
  let userEmail: string;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    console.log('Decoded ID token:', decoded);
    console.log('User ID:', uid);
    userEmail = decoded.email ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  // 2) Parse and validate JSON body
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

  // 3) Prepare batched Firestore writes
  const companyId = uuid();

  const companyRef = adminDb.collection('companies').doc(companyId);
  const roleRef = companyRef.collection('roles').doc(uid);
  const userRef = adminDb.collection('users').doc(uid);

  const batch = adminDb.batch();
  batch.set(companyRef, {
    name,
    billingEmail,
    plan: 'free',
    ownerUid: uid,
    createdAt: FieldValue.serverTimestamp(),
    active: true,
  });
  batch.set(roleRef, {
    role: 'owner' as Role,
  });
  batch.set(userRef, {
    companies: FieldValue.arrayUnion(companyId),
  }, { merge: true });

  // 4) Commit batch and handle errors
  try {
    await batch.commit();
    return NextResponse.json({ companyId }, { status: 201 });
  } catch (error) {
    console.error('Error creating company:', error);
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
