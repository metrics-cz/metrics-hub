import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator} from 'firebase/functions';


export const firebaseConfig = {
    apiKey:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    databaseURL:        process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL!,
  };

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const rtdb = getDatabase(app);
export const fnc = getFunctions(app, 'europe-west1');

if (process.env.NEXT_PUBLIC_EMULATORS === 'true') {
  connectAuthEmulator(auth,       'http://localhost:9099');
  connectFirestoreEmulator(db,    'localhost', 8080);
  connectDatabaseEmulator(rtdb,   'localhost', 9000);
  connectFunctionsEmulator(fnc,  'localhost', 5001);
}
