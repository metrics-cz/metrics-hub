import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '../../../../lib/firebase/firebaseAdmin';

export async function GET(request: NextRequest, { params }: { params: { companyId: string } }) {
  const { companyId } = params;
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.replace('Bearer ', '');

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const uid = decoded.uid;

    const roleRef = adminDb.collection('companies').doc(companyId).collection('roles').doc(uid);
    const roleSnap = await roleRef.get();

    if (!roleSnap.exists) {
      return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
    }

    const companyRef = adminDb.collection('companies').doc(companyId);
    const companySnap = await companyRef.get();

    if (!companySnap.exists) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json({ id: companySnap.id, ...companySnap.data() });
  } catch (error) {
    console.error('Error verifying token or fetching company:', error);
    return NextResponse.json({ error: 'Unauthorized or internal error' }, { status: 401 });
  }
}
