import * as fn from 'firebase-functions/v1';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore }  from 'firebase-admin/firestore';
import { getDatabase }   from 'firebase-admin/database';
import { getAuth }       from 'firebase-admin/auth';

/*──────────────────────────── 1) Admin init ──────────────────────────────*/
initializeApp();
const db   = getFirestore();
const rtdb = getDatabase();
const auth = getAuth();

/*──────────────────────────── region helper (EU) ─────────────────────────*/
const eu = fn.region('europe-west1');            // používáme všude stejný region

/*──────────────────────────── 2) Auth trigger ────────────────────────────*/
export const onUserCreate = fn.auth.user().onCreate(async (user) => {
  await auth.setCustomUserClaims(user.uid, { systemRole: 'guest' });

  await db.doc(`users/${user.uid}`).set({
    email:         user.email        ?? '',
    displayName:   user.displayName  ?? '',
    photoURL:      user.photoURL     ?? '',
    createdAt:     user.metadata.creationTime,
    companies:     [],
    pendingInvites: [],
    preferences:   {},
  });
});

/*──────────────────────────── 3) demo HTTP /api ──────────────────────────*/
export const api = fn.region('europe-west1')
  .https.onRequest((_req, res) => { res.json({ ok: true }); });

/*──────────────────────────── 4) demo cron tick ──────────────────────────*/
export const runAutomation = eu.pubsub
  .schedule('every 5 minutes')
  .timeZone('Europe/Prague')
  .onRun(async () => {
    await rtdb.ref('/automationLogs/demo').push({
      ts: Date.now(), status: 'tick',
    });
  });

/*──────────────────────────── 5) business callable(s) ────────────────────*/
export { createCompany } from './company.js';        // <- koncovka JS!


