/* ───────────────────── api/company/[companyId]/route.ts ────────────────── */
import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/firebaseAdmin';

/*──────────────────────── GET /api/company/[companyId] ────────────────────*/
type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(
  request: NextRequest,
  { params }: RouteContext,
) {
  /* 1) ─ unwrap the async params object (Next 15 requirement) ──────────── */
  const { companyId } = await params;

  /* 2) ─ Bearer-token auth identical to the POST route ─────────────────── */
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const idToken = authHeader.replace('Bearer ', '');
  let uid: string;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  /* 3) ─ Check that the caller has a role doc inside this company ─────── */
  const roleSnap = await adminDb
    .collection('companies').doc(companyId)
    .collection('roles').doc(uid)
    .get();

  if (!roleSnap.exists) {
    return NextResponse.json({ error: 'No access to this company' }, { status: 403 });
  }

  /* 4) ─ Fetch the company itself ──────────────────────────────────────── */
  const companySnap = await adminDb.doc(`companies/${companyId}`).get();
  if (!companySnap.exists) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 });
  }

  /* 5) ─ Return the document data plus its id ──────────────────────────── */
  return NextResponse.json({ id: companySnap.id, ...companySnap.data() });
}

