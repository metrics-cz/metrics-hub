import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { adminDb as db } from '@/lib/firebase/firebaseAdmin';
import { userSchema } from '@/lib/validation/firebaseSchemas';

type RouteContext = { params: Promise<{ companyId: string }> };

export async function GET(
  req: NextRequest,
  { params } : RouteContext 
) {
   const {companyId} = await params;
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 401 });
    }

    const decodedToken = await getAuth().verifyIdToken(token);

    const snapshot = await db
      .collection('users')
      .where('companies', 'array-contains', companyId)
      .get();

    const users = snapshot.docs
      .map((doc) => {
        const raw = { id: doc.id, ...doc.data() };
        const parsed = userSchema.safeParse(raw);
        if (!parsed.success) {
          console.warn(`Invalid user data (id: ${doc.id}):`, parsed.error);
          return null;
        }
        return parsed.data;
      })
      .filter(Boolean);

    return NextResponse.json(users);
  } catch (error) {
    console.error('API error in /company/[id]/users:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
