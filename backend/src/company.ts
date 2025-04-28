import * as fn from 'firebase-functions/v1';
import { v4 as uuid } from 'uuid';

import {
  getFirestore,
  FieldValue,
} from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

/*────────────────────────── typy & helpery ──────────────────────────────*/
type Role = 'owner' | 'admin' | 'reader';

interface CompanyInput {
  name: string;
  billingEmail?: string;
  plan?: 'free' | 'pro';
}

/*────────────────────────── callable:createCompany ───────────────────────*/
export const createCompany = fn
  .region('europe-west1')
  .https.onCall(async (data: CompanyInput, ctx) => {
    /*–– auth ––*/
    if (!ctx.auth)
      throw new fn.https.HttpsError('unauthenticated', 'Sign-in required');

    /*–– validate ––*/
    const name = (data?.name ?? '').trim();
    if (name.length < 2)
      throw new fn.https.HttpsError('invalid-argument', 'name required');

    const billingEmail = (data.billingEmail ?? ctx.auth.token.email ?? '')
      .toLowerCase();
    const plan: 'free' | 'pro' = data.plan ?? 'free';

    /*–– lazy Admin SDK ––*/
    const db   = getFirestore();
    const auth = getAuth();

    /*–– write ––*/
    const uid = ctx.auth.uid;
    const id  = uuid();

    const batch = db.batch();

    batch.set(db.doc(`companies/${id}`), {
      name, billingEmail, plan,
      ownerUid: uid,
      createdAt: FieldValue.serverTimestamp(),
      active: true,
    });

    batch.set(db.doc(`companies/${id}/roles/${uid}`), { role: 'owner' as Role });

    batch.update(db.doc(`users/${uid}`), {
      companies: FieldValue.arrayUnion(id),
    });

    await batch.commit();
    return { companyId: id };
  });
