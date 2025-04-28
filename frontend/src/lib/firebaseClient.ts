import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator} from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyDMXIp4PWrFAMjhjN9dTsOMpMBIXs9pOQE',
  authDomain: 'metrics-hub-c0jvl.firebaseapp.com',
  projectId: 'metrics-hub-c0jvl',
  databaseURL:
    process.env.NEXT_PUBLIC_EMULATORS === 'true'
      ? 'http://localhost:9000?ns=metrics-hub-c0jvl'
      : 'https://metrics-hub-c0jvl-default-rtdb.europe-west1.firebasedatabase.app',
  storageBucket: 'metrics-hub-c0jvl.appspot.com',
  messagingSenderId: '351772423524',
  appId: '1:351772423524:web:3b09c652f0c95573b43671',
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
